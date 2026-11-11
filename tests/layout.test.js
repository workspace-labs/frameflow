// The page layout, judged by its own independent geometry: every screen gets one page in order, no box
// overlaps another, nothing leaves the page, and the strip always shows the current screen.
// Run from the repository root: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("../skills/frameflow/assets/template/frameflow/model.js");
const layout = require("../skills/frameflow/assets/template/frameflow/layout.js");

const TEMPLATE = path.join(__dirname, "../skills/frameflow/assets/template");
const SOURCES = [
  ...fs.readdirSync(path.join(__dirname, "../skills/frameflow/examples")).filter((f) => f.endsWith(".md"))
    .map((f) => path.join(__dirname, "../skills/frameflow/examples", f)),
  ...fs.readdirSync(path.join(__dirname, "fixtures")).filter((f) => f.endsWith(".md"))
    .map((f) => path.join(__dirname, "fixtures", f)),
  path.join(__dirname, "fixtures/after-build/app-flow.md"),
];

function read(file) {
  const result = parse(fs.readFileSync(file, "utf8"));
  assert.deepEqual(result.problems, [], file);
  return result.storyboard;
}

function story(kind, screens, extra = []) {
  const lines = ["# App", "", "- kind: " + kind, ...extra, "", "## Story"];
  for (let i = 1; i <= screens; i++) lines.push(`${i}. Screen ${i} [list]: Sees it. Taps on.`);
  const result = parse(lines.join("\n"));
  assert.deepEqual(result.problems, []);
  return result.storyboard;
}

// Every box a screen's page draws, by name.
function boxesOf(plan, page) {
  const boxes = [{ name: "top", ...plan.top }, { name: "foot", ...plan.foot }, { name: "column", ...page.col }, { name: "screen", ...page.hero }];
  (page.strip || []).forEach((t) => {
    boxes.push({ name: `strip ${t.index + 1}`, ...t.box }, { name: `strip name ${t.index + 1}`, ...t.label });
    if (t.arrow) boxes.push({ name: `strip arrow ${t.index + 1}`, ...t.arrow });
  });
  if (page.sides) {
    if (page.sides.prev) boxes.push({ name: "screen before", ...page.sides.prev.box });
    if (page.sides.next) boxes.push({ name: "screen after", ...page.sides.next.box });
    boxes.push({ name: "names", x: layout.COL.x + layout.COL.w + 1, y: page.names.y, w: 10, h: page.names.h });
    boxes.push({ name: "dots", ...page.dots });
  }
  if (page.back) boxes.push({ name: "way back", ...page.back });
  return boxes;
}

function overlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

test("every screen gets one page, in order, with each thing that can go wrong on the page after it", () => {
  for (const file of SOURCES) {
    const board = read(file);
    const plan = layout.plan(board);
    const expected = [];
    board.stories.forEach((s, si) => s.screens.forEach((screen) => {
      expected.push(`${si}:${screen.number}`);
      screen.errors.forEach((e) => expected.push(`${si}:${screen.number}!${e.name}`));
    }));
    assert.equal(plan.pages[0].type, "cover", file);
    const got = plan.pages.slice(1).map((p) => `${p.storyIndex}:${p.screen.number}` + (p.error ? `!${p.error.name}` : ""));
    assert.deepEqual(got, expected, file);
    plan.pages.forEach((p, i) => assert.equal(p.number, i + 1));
  }
});

test("on every page, no box overlaps another and nothing leaves the page", () => {
  for (const file of SOURCES) {
    const plan = layout.plan(read(file));
    for (const page of plan.pages.slice(1)) {
      const boxes = boxesOf(plan, page);
      for (const b of boxes) {
        const where = `${path.basename(file)} page ${page.number}: ${b.name}`;
        assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= plan.page.width && b.y + b.h <= plan.page.height, `${where} leaves the page`);
        assert.ok(b.w > 0 && b.h > 0, `${where} has no size`);
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        assert.ok(!overlap(boxes[i], boxes[j]), `${path.basename(file)} page ${page.number}: ${boxes[i].name} overlaps ${boxes[j].name}`);
      }
    }
  }
});

test("the page is A4 on its side, and frameflow.css agrees", () => {
  assert.deepEqual(layout.PAGE, { width: 1122, height: 792 });
  const css = fs.readFileSync(path.join(TEMPLATE, "frameflow/frameflow.css"), "utf8");
  assert.match(css, /@page \{ size: A4 landscape; margin: 0; \}/);
  assert.match(css, /\.page \{[^}]*width: 1122px; height: 792px;/);
});

test("the page loads the colour rules before the reader, and every script it names exists", () => {
  const html = fs.readFileSync(path.join(TEMPLATE, "storyboard.html"), "utf8");
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(scripts, ["frameflow/strings.js", "frameflow/theme.js", "frameflow/model.js", "frameflow/layout.js", "frameflow/render.js"]);
  scripts.forEach((s) => assert.ok(fs.existsSync(path.join(TEMPLATE, s)), s));
});

test("the cover's words stay on the page; a wide screen runs off its right edge on purpose", () => {
  const wide = layout.plan(story("tablet", 2)).pages[0];
  const phone = layout.plan(story("phone", 2)).pages[0];
  for (const cover of [wide, phone]) {
    for (const b of [cover.text, cover.meta]) assert.ok(b.x >= 0 && b.x + b.w <= layout.PAGE.width && b.y + b.h <= layout.PAGE.height);
    assert.ok(!overlap(cover.text, cover.meta));
    assert.ok(!overlap(cover.text, cover.device), "the words never sit under the device");
  }
  assert.ok(wide.device.x + wide.device.w > layout.PAGE.width);
  assert.ok(phone.device.x + phone.device.w <= layout.PAGE.width);
});

test("the strip shows up to five screens and always the current one, lit once", () => {
  const board = story("desktop", 13);
  const pages = layout.plan(board).pages.slice(1);
  assert.equal(pages.length, 13);
  pages.forEach((page, i) => {
    const shown = page.strip.map((t) => t.index);
    assert.equal(shown.length, 5);
    assert.ok(shown.includes(i), `screen ${i + 1} is in its own strip`);
    assert.deepEqual(shown, shown.map((_, k) => shown[0] + k), "the strip's screens are in a row, no gaps");
    assert.deepEqual(page.strip.filter((t) => t.on).map((t) => t.index), [i]);
    assert.equal(page.strip[page.strip.length - 1].arrow, null, "no arrow after the last one");
  });
  assert.deepEqual(layout.plan(story("tablet", 2)).pages[1].strip.map((t) => t.index), [0, 1]);
});

test("windowOf keeps the current screen near the middle and never runs past either end", () => {
  assert.deepEqual(layout.windowOf(3, 0, 5), [0, 1, 2]);
  assert.deepEqual(layout.windowOf(1, 0, 5), [0]);
  assert.deepEqual(layout.windowOf(24, 0, 5), [0, 1, 2, 3, 4]);
  assert.deepEqual(layout.windowOf(24, 1, 5), [0, 1, 2, 3, 4]);
  assert.deepEqual(layout.windowOf(24, 10, 5), [8, 9, 10, 11, 12]);
  assert.deepEqual(layout.windowOf(24, 23, 5), [19, 20, 21, 22, 23]);
});

test("a phone page shows the screen before and the screen after; the ends show one", () => {
  const pages = layout.plan(story("phone", 3)).pages.slice(1);
  assert.deepEqual(pages.map((p) => [p.sides.prev && p.sides.prev.screen.number, p.sides.next && p.sides.next.screen.number]),
    [[null, 2], [1, 3], [2, null]]);
  assert.equal(pages[0].strip, undefined, "a phone has no strip");
  const one = layout.plan(story("phone", 1)).pages[1];
  assert.deepEqual([one.sides.prev, one.sides.next], [null, null]);
});

test("a phone's \"if it goes wrong\" page shows its own screen before it and the way back after it", () => {
  const result = parse(["# App", "- kind: phone", "## S", "1. One [form]: Sees it. → 2", "   ! Bad: Sees red. → 1", "2. Two [done]: Sees it."].join("\n"));
  assert.deepEqual(result.problems, []);
  const bad = layout.plan(result.storyboard).pages[2];
  assert.equal(bad.error.name, "Bad");
  assert.equal(bad.sides.prev.screen.number, 1);
  assert.equal(bad.sides.next, null);
  assert.ok(bad.back);
  assert.equal(layout.plan(result.storyboard).pages[1].back, null);
});

test("a website's phone version sits on the big screen's corner, on screen pages only", () => {
  const result = parse(["# Site", "- kind: website", "- phone-version: yes", "## S", "1. One [form]: Sees it. → 2", "   ! Bad: Sees red. → 1", "2. Two [done]: Sees it."].join("\n"));
  assert.deepEqual(result.problems, []);
  const [, one, bad] = layout.plan(result.storyboard).pages;
  assert.ok(overlap(one.mini, one.hero));
  assert.ok(one.mini.x + one.mini.w <= layout.PAGE.width && one.mini.y + one.mini.h <= layout.STRIP.y);
  assert.ok(!overlap(one.mini, one.col));
  assert.equal(bad.mini, null);
  assert.equal(layout.plan(story("website", 1)).pages[1].mini, null);
});

test("fitFrame: the largest frame of the picture's shape that fits the room, centred", () => {
  const room = { x: 322, y: 96, w: 744, h: 465 };
  const near = (a, b) => Math.abs(a - b) < 0.001;
  for (const aspect of [0.4, 0.46, 0.75, 1, 4 / 3, 1.6, 16 / 9, 2.4]) {
    for (const bar of [0, 26 / 744]) {
      const f = layout.fitFrame(room, aspect, bar);
      assert.ok(f.x >= room.x - 0.001 && f.y >= room.y - 0.001 && f.x + f.w <= room.x + room.w + 0.001 && f.y + f.h <= room.y + room.h + 0.001, `inside the room (${aspect})`);
      assert.ok(near(f.w / (f.h - f.bar), aspect), `the screen keeps the picture's shape (${aspect})`);
      assert.ok(near(f.w, room.w) || near(f.h, room.h), "it touches the room on one side at least");
      assert.ok(near(f.x - room.x, room.x + room.w - f.x - f.w) && near(f.y - room.y, room.y + room.h - f.y - f.h), "centred");
      assert.ok(near(f.bar, f.w * bar));
    }
  }
});

test("each kind's own shape fits its room when there is no picture", () => {
  for (const kind of ["tablet", "desktop", "website"]) {
    const f = layout.fitFrame(layout.HERO, layout.SHAPE[kind].aspect, layout.SHAPE[kind].bar);
    assert.ok(Math.abs(f.w - layout.HERO.w) < 0.01 && Math.abs(f.h - layout.HERO.h) < 0.01, kind + " fills the wide room");
  }
  const phone = layout.fitFrame(layout.PHONE, layout.SHAPE.phone.aspect, 0);
  assert.ok(Math.abs(phone.w - layout.PHONE.w) < 0.01 && Math.abs(phone.h - layout.PHONE.h) < 0.01);
});

test("a marker's label goes under the point, or over it near the bottom, and runs toward the middle", () => {
  assert.deepEqual(layout.markSide(0.9, 0.2), { v: "down", h: "left" });
  assert.deepEqual(layout.markSide(0.1, 0.2), { v: "down", h: "right" });
  assert.deepEqual(layout.markSide(0.9, 0.93), { v: "up", h: "left" });
  assert.deepEqual(layout.markSide(0.5, 0.75), { v: "down", h: "right" });
});

test("right to left mirrors a box across the page", () => {
  assert.equal(layout.mirrorX(56, 238), 1122 - 56 - 238);
  assert.equal(layout.mirrorX(layout.mirrorX(322, 744), 744), 322);
});

test("an unknown kind is refused by the layout too", () => {
  assert.throws(() => layout.plan({ project: { kind: "watch" }, stories: [] }), /unknown kind/);
});
