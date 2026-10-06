// The page layout, judged by its own independent geometry: no box overlaps another, nothing leaves the
// page's content area, no line runs through a box, and every screen is drawn once, in order.
// Run from the repository root: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("../skills/frameflow/assets/template/frameflow/model.js");
const layout = require("../skills/frameflow/assets/template/frameflow/layout.js");

const SOURCES = [
  ...fs.readdirSync(path.join(__dirname, "../skills/frameflow/examples")).filter((f) => f.endsWith(".md"))
    .map((f) => path.join(__dirname, "../skills/frameflow/examples", f)),
  ...fs.readdirSync(path.join(__dirname, "fixtures")).filter((f) => f.endsWith(".md"))
    .map((f) => path.join(__dirname, "fixtures", f)),
  path.join(__dirname, "fixtures/after-build/app-flow.md"),
];

const BADGE = layout.BADGE.out;

function read(file) {
  const result = parse(fs.readFileSync(file, "utf8"));
  assert.deepEqual(result.problems, [], file);
  return result.storyboard;
}

function boxesOf(page, board) {
  const boxes = [];
  page.rows.forEach((row) => row.cells.forEach((cell) => {
    // The frame and its number badge are one drawing; the small phone (websites) sits over the frame's corner.
    boxes.push({ name: `frame ${cell.screen.number}`, ...cell.frame });
    boxes.push({ name: `badge ${cell.screen.number}`, ...cell.badge, owner: cell.screen.number });
    if (cell.mini) boxes.push({ name: `phone version ${cell.screen.number}`, ...cell.mini, owner: cell.screen.number });
    boxes.push({ name: `caption ${cell.screen.number}`, ...cell.caption });
    cell.errors.forEach((e, i) => {
      boxes.push({ name: `error ${cell.screen.number}.${i + 1}`, ...e.frame });
      boxes.push({ name: `error text ${cell.screen.number}.${i + 1}`, ...e.text });
    });
  }));
  return boxes;
}

function linesOf(page) {
  return page.rows.flatMap((row) => row.links);
}

// Written from the format's own words, not from layout.js: a screen with no → goes to the next one (the last
// one ends), → N goes to N, → end ends.
function expectedArrows(story) {
  return story.screens.filter((s, i) => i + 1 < story.screens.length && (s.to === null || s.to === s.number + 1))
    .map((s) => [s.number, s.number + 1]);
}

// The blue lines on a page, as [from, to] screen numbers: a line starts beside a frame (the nearest frame to
// its left, at a height inside it) and ends at another (the nearest frame to its right at that height, or
// just above a frame's top edge, inside its width).
function drawnArrows(page) {
  const frames = page.rows.flatMap((row) => row.cells.map((c) => ({ n: c.screen.number, ...c.frame })));
  const level = (f, y) => y > f.y && y < f.y + f.h;
  const nearest = (list, key) => list.sort((a, b) => key(a) - key(b))[0];
  return linesOf(page).filter((l) => l.type === "next" || l.type === "turn").map((l) => {
    const [sx, sy] = l.points[0];
    const [ex, ey] = l.points[l.points.length - 1];
    const from = nearest(frames.filter((f) => level(f, sy) && f.x + f.w <= sx), (f) => sx - f.x - f.w);
    const to = l.type === "next"
      ? nearest(frames.filter((f) => level(f, ey) && f.x >= ex), (f) => f.x - ex)
      : frames.find((f) => ey >= f.y - 8 && ey <= f.y && ex > f.x && ex < f.x + f.w);
    assert.ok(from && to, `a ${l.type} line on page ${page.number} does not join two frames`);
    return [from.n, to.n];
  });
}

function overlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
// Does the straight piece p→q pass through the inside of box r? (Lines are only ever level or upright.)
function crosses(p, q, r) {
  const inner = { x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 };
  if (p[1] === q[1]) {
    const [x1, x2] = [Math.min(p[0], q[0]), Math.max(p[0], q[0])];
    return p[1] > inner.y && p[1] < inner.y + inner.h && x2 > inner.x && x1 < inner.x + inner.w;
  }
  if (p[0] === q[0]) {
    const [y1, y2] = [Math.min(p[1], q[1]), Math.max(p[1], q[1])];
    return p[0] > inner.x && p[0] < inner.x + inner.w && y2 > inner.y && y1 < inner.y + inner.h;
  }
  throw new Error("a line that is neither level nor upright");
}

for (const file of SOURCES) {
  const name = path.basename(file);

  test(`${name}: every screen is drawn once, in order, story by story`, () => {
    const board = read(file);
    const plan = layout.plan(board);
    assert.equal(plan.pages[0].type, "cover");
    board.stories.forEach((story, s) => {
      const drawn = plan.pages.filter((p) => p.type === "story" && p.storyIndex === s)
        .flatMap((p) => p.rows.flatMap((row) => row.cells.map((c) => c.screen.number)));
      assert.deepEqual(drawn, story.screens.map((x) => x.number));
    });
  });

  test(`${name}: nothing overlaps and nothing leaves the page`, () => {
    const board = read(file);
    const plan = layout.plan(board);
    const c = layout.CONTENT;
    plan.pages.filter((p) => p.type === "story").forEach((page) => {
      const boxes = boxesOf(page, board);
      for (const b of boxes) {
        assert.ok(b.x >= c.left - BADGE && b.x + b.w <= c.right + 1, `${b.name} on page ${page.number} leaves the content width`);
        assert.ok(b.y >= c.top - BADGE && b.y + b.h <= c.bottom, `${b.name} on page ${page.number} runs past the bottom`);
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, b] = [boxes[i], boxes[j]];
          const sameFrame = (a.owner && b.name === `frame ${a.owner}`) || (b.owner && a.name === `frame ${b.owner}`);
          if (sameFrame) continue; // a badge or a small phone sits on its own frame's corner by design
          assert.ok(!overlap(a, b), `${a.name} overlaps ${b.name} on page ${page.number}`);
        }
      }
    });
  });

  test(`${name}: no line runs through a box`, () => {
    const board = read(file);
    const plan = layout.plan(board);
    plan.pages.filter((p) => p.type === "story").forEach((page) => {
      const boxes = boxesOf(page, board);
      for (const line of linesOf(page)) {
        for (let k = 0; k + 1 < line.points.length; k++) {
          for (const b of boxes) {
            assert.ok(!crosses(line.points[k], line.points[k + 1], b), `a ${line.type} line runs through ${b.name} on page ${page.number}`);
          }
        }
      }
    });
  });

  test(`${name}: every step to the next screen has its arrow, and no other arrow is drawn`, () => {
    const board = read(file);
    const plan = layout.plan(board);
    board.stories.forEach((story, si) => {
      const pages = plan.pages.filter((p) => p.type === "story" && p.storyIndex === si);
      const pageOf = (n) => pages.find((p) => p.rows.some((r) => r.cells.some((c) => c.screen.number === n)));
      // A step across a page break is shown by the "Continues on the next page" note instead.
      const expected = expectedArrows(story).filter(([a, b]) => pageOf(a) === pageOf(b));
      const drawn = pages.flatMap(drawnArrows).sort((x, y) => x[0] - y[0]);
      assert.deepEqual(drawn, expected, `story ${si + 1}`);
    });
  });
}

// The page draws what layout.js computes with the numbers in frameflow.css. Read them from the CSS itself.
test("the number badge and the frame border in frameflow.css match layout.js", () => {
  const css = fs.readFileSync(path.join(__dirname, "../skills/frameflow/assets/template/frameflow/frameflow.css"), "utf8");
  const rule = (selector) => {
    const m = new RegExp(selector.replace(/[.*]/g, "\\$&") + "\\s*\\{([^}]*)\\}").exec(css);
    assert.ok(m, `no ${selector} rule in frameflow.css`);
    return m[1];
  };
  const px = (body, prop) => {
    const m = new RegExp("(?:^|[;\\s])" + prop + ":\\s*(-?[\\d.]+)px").exec(body);
    assert.ok(m, `no ${prop} in px`);
    return Number(m[1]);
  };
  const border = Number(/border:\s*([\d.]+)px/.exec(rule(".frame"))[1]);
  const num = rule(".frame .num");
  assert.equal(px(num, "width"), layout.BADGE.size);
  assert.equal(px(num, "height"), layout.BADGE.size);
  assert.equal(border - px(num, "top"), layout.BADGE.out, "badge top offset");
  assert.equal(border - px(num, "left"), layout.BADGE.out, "badge left offset");
});

test("a page holds six phone screens, and the seventh starts part 2", () => {
  const screens = Array.from({ length: 7 }, (_, i) => `${i + 1}. S${i + 1} [blank]: Sees it.`);
  const board = parse(["# A", "- kind: phone", "## Story", ...screens].join("\n")).storyboard;
  const pages = layout.plan(board).pages.filter((p) => p.type === "story");
  assert.equal(pages.length, 2);
  assert.deepEqual(pages.map((p) => [p.part, p.parts]), [[1, 2], [2, 2]]);
  assert.equal(pages[0].rows.flatMap((r) => r.cells).length, 6);
});

test("a page holds six desktop screens in three rows of two", () => {
  const screens = Array.from({ length: 6 }, (_, i) => `${i + 1}. S${i + 1} [blank]: Sees it.`);
  const board = parse(["# A", "- kind: desktop", "## Story", ...screens].join("\n")).storyboard;
  const pages = layout.plan(board).pages.filter((p) => p.type === "story");
  assert.equal(pages.length, 1);
  assert.deepEqual(pages[0].rows.map((r) => r.cells.length), [2, 2, 2]);
});

test("each story starts on its own page", () => {
  const board = parse(["# A", "- kind: phone", "## One", "1. A [blank]: Sees.", "## Two", "1. B [blank]: Sees."].join("\n")).storyboard;
  const pages = layout.plan(board).pages;
  assert.deepEqual(pages.map((p) => p.type === "cover" ? "cover" : p.storyIndex), ["cover", 0, 1]);
});

test("arrows: only between a screen and the one after it", () => {
  const story = { screens: [{ number: 1 }, { number: 2 }, { number: 3 }] };
  assert.equal(layout.goesToNext({ number: 1, to: null }, story), true);
  assert.equal(layout.goesToNext({ number: 1, to: 2 }, story), true);
  assert.equal(layout.goesToNext({ number: 1, to: 3 }, story), false);
  assert.equal(layout.goesToNext({ number: 2, to: "end" }, story), false);
  assert.equal(layout.goesToNext({ number: 3, to: null }, story), false);
});

test("right to left mirrors a box across the page", () => {
  assert.equal(layout.mirrorX(56, 128), layout.PAGE.width - 56 - 128);
});
