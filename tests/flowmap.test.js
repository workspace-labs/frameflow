const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("../skills/frameflow/assets/template/frameflow/model.js");
const { PAGE, mirrorX } = require("../skills/frameflow/assets/template/frameflow/layout.js");
const { graph, plan } = require("../skills/frameflow/assets/template/frameflow/flowmap.js");

const EXAMPLES = path.join(__dirname, "../skills/frameflow/examples");
const FIXTURES = path.join(__dirname, "fixtures");
const SOURCES = [
  ...[EXAMPLES, FIXTURES].flatMap((dir) => fs.readdirSync(dir)
    .filter((name) => name.endsWith(".md")).map((name) => path.join(dir, name))),
  path.join(FIXTURES, "after-build/app-flow.md"),
];

function boardFrom(text) {
  const result = parse(text);
  assert.deepEqual(result.problems, []);
  return result.storyboard;
}

function read(dir, name) {
  return boardFrom(fs.readFileSync(path.join(dir, name), "utf8"));
}

function exampleFlow(...lines) {
  return boardFrom(["# Example", "- kind: phone", "## Check out", ...lines].join("\n"));
}

function verifyPlan(board) {
  const result = plan(board);
  assert.deepEqual(result.problems, []);
  return result;
}

function overlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// Clip the segment to each open interval; touching a side or corner is allowed.
function crossesBox(start, end, box) {
  let enter = 0;
  let leave = 1;
  for (const [axis, size] of [["x", "w"], ["y", "h"]]) {
    const delta = end[axis] - start[axis];
    const low = box[axis] + 1e-6;
    const high = box[axis] + box[size] - 1e-6;
    if (delta === 0) {
      if (start[axis] <= low || start[axis] >= high) return false;
      continue;
    }
    const first = (low - start[axis]) / delta;
    const second = (high - start[axis]) / delta;
    enter = Math.max(enter, Math.min(first, second));
    leave = Math.min(leave, Math.max(first, second));
  }
  return enter < leave;
}

const EPSILON = 1e-6;

function close(a, b) {
  return Math.abs(a - b) < EPSILON;
}

function spans(link) {
  return link.points.slice(1).map((end, index) => {
    const start = link.points[index];
    const horizontal = close(start.y, end.y);
    assert.ok(horizontal || close(start.x, end.x), "connector segments must be orthogonal");
    const axis = horizontal ? "x" : "y";
    return { horizontal, across: start[horizontal ? "y" : "x"], low: Math.min(start[axis], end[axis]),
      high: Math.max(start[axis], end[axis]) };
  }).filter(({ low, high }) => high - low > EPSILON);
}

function endpointAt(link, point) {
  const matches = ({ x, y }) => close(x, point.x) && close(y, point.y);
  if (matches(link.points[0])) return link.from;
  if (matches(link.points.at(-1))) return link.to;
  return null;
}

function segmentConflict(a, b) {
  if (a.horizontal === b.horizontal) {
    const separation = Math.abs(a.across - b.across);
    if (Math.min(a.high, b.high) - Math.max(a.low, b.low) > EPSILON && separation < 10 - EPSILON) {
      return { reason: `run parallel ${separation.toFixed(2)} px apart` };
    }
    return null;
  }
  const [h, v] = a.horizontal ? [a, b] : [b, a];
  const within = (x, { low, high }) => x >= low - EPSILON && x <= high + EPSILON;
  return within(v.across, h) && within(h.across, v)
    ? { reason: "cross or touch between nodes", point: { x: v.across, y: h.across } } : null;
}

function connectorConflicts(first, second) {
  for (const a of spans(first)) {
    for (const b of spans(second)) {
      const conflict = segmentConflict(a, b);
      if (conflict) {
        const node = conflict.point && endpointAt(first, conflict.point);
        if (!node || node !== endpointAt(second, conflict.point)) return conflict.reason;
      }
    }
  }
  return null;
}

for (const source of SOURCES) {
  test(`map boxes, lines and labels stay clear in ${path.basename(source)}`, () => {
    const result = verifyPlan(read(path.dirname(source), path.basename(source)));
    const pages = result.pages.filter((page) => page.type === "flow-map");
    assert.ok(pages.length > 0);
    for (const [pageIndex, page] of pages.entries()) {
      assert.ok(page.nodes.length > 0);
      const boxes = page.nodes.map((node) => node.box);
      for (const [nodeIndex, box] of boxes.entries()) {
        const where = `map page ${pageIndex + 1}, node ${nodeIndex + 1}`;
        assert.ok(box.w > 0 && box.h > 0, `${where} has no area`);
        assert.ok(box.x >= 0 && box.y >= 0, `${where} leaves the top or left edge`);
        assert.ok(box.x + box.w <= PAGE.width && box.y + box.h <= PAGE.height, `${where} leaves the right or bottom edge`);
        for (const other of boxes.slice(nodeIndex + 1)) {
          assert.ok(!overlap(box, other), `${where} overlaps another node`);
        }
      }
      for (const [rowIndex, row] of page.rows.entries()) {
        const bottom = page.rows[rowIndex + 1]?.y ?? PAGE.height;
        const rowNodes = page.nodes.filter(({ auxiliary, box, type }) =>
          !auxiliary && type !== "continuation" && box.y >= row.y && box.y < bottom);
        if (rowNodes.some(({ type }) => type === "end")) {
          assert.ok(rowNodes.length > 1, `map page ${pageIndex + 1}: ${row.title} has an End on its own row`);
        }
      }
      const labelBoxes = page.links.flatMap((link) => link.labelBox ? [link.labelBox] : []);
      for (const [labelIndex, label] of labelBoxes.entries()) {
        assert.ok(label.x >= 0 && label.y >= 0 && label.x + label.w <= PAGE.width && label.y + label.h <= PAGE.height,
          "a connector label leaves the page");
        for (const box of [...boxes, ...labelBoxes.slice(labelIndex + 1)]) {
          assert.ok(!overlap(label, box), "a connector label overlaps a node or another label");
        }
      }
      for (const [index, link] of page.links.entries()) {
        for (const { x, y } of link.points) {
          assert.ok(x >= 0 && y >= 0 && x <= PAGE.width && y <= PAGE.height, "a connector leaves the page");
        }
        for (let i = 1; i < link.points.length; i += 1) {
          for (const box of [...boxes, ...labelBoxes]) {
            assert.ok(!crossesBox(link.points[i - 1], link.points[i], box),
              `map page ${pageIndex + 1}: the ${link.kind} connector from ${link.from} to ${link.to} crosses a box or label`);
          }
        }
        const segments = spans(link);
        for (const [segmentIndex, segment] of segments.entries()) {
          for (const other of segments.slice(segmentIndex + 1)) {
            const conflict = segmentConflict(segment, other);
            // A link's adjacent legs meet at their own bend.
            if (other === segments[segmentIndex + 1] && conflict?.point) continue;
            assert.equal(conflict, null, `map page ${pageIndex + 1}: legs of ${link.from} → ${link.to} ${conflict?.reason}`);
          }
        }
        for (const other of page.links.slice(index + 1)) {
          const conflict = connectorConflicts(link, other);
          assert.equal(conflict, null, `map page ${pageIndex + 1}: ${link.from} → ${link.to} and ${other.from} → ${other.to} ${conflict}`);
        }
      }
    }
  });
}

test("the food delivery example uses one combined map and check page", () => {
  const { mode, pages } = verifyPlan(read(EXAMPLES, "food-delivery.md"));
  assert.equal(mode, "C");
  assert.deepEqual(pages.map((page) => page.type), ["flow-map"]);
});

test("a recovery box hangs below its screen and returns through a side port", () => {
  const { pages } = verifyPlan(read(EXAMPLES, "food-delivery.md"));
  const { nodes, links } = pages[0];
  const error = nodes.find((node) => node.type === "wrong" && node.text === "Wrong password");
  const screen = nodes.find((node) => node.id === error.owner);
  const down = links.find((link) => link.from === screen.id && link.to === error.id);
  const back = links.find((link) => link.from === error.id && link.to === screen.id);
  assert.equal(spans(down).length, 1);
  assert.ok(!spans(down)[0].horizontal);
  assert.ok(close(down.points[0].y, screen.box.y + screen.box.h));
  assert.ok(close(down.points.at(-1).y, error.box.y));
  const departure = back.points[0];
  assert.ok(close(departure.x, error.box.x) || close(departure.x, error.box.x + error.box.w));
  const returnPort = back.points.at(-1);
  assert.ok(close(returnPort.y, screen.box.y + screen.box.h));
  assert.ok(Math.abs(returnPort.x - down.points[0].x) >= 10 - EPSILON);
});

for (const [dir, file, title] of [
  [EXAMPLES, "food-delivery.md", "Ordering food"],
  [FIXTURES, "flow-map-demo.md", "Find a doctor"],
]) {
  test(`the second story in ${file} fits on one row with Start and End`, () => {
    const { pages } = verifyPlan(read(dir, file));
    const mapPages = pages.filter((page) => page.type === "flow-map");
    const rows = mapPages.flatMap((page) => page.rows).filter((row) => row.title === title);
    assert.equal(rows.length, 1);
    const nodes = mapPages.flatMap((page) => page.nodes).filter((node) => node.id.startsWith("2."));
    assert.equal(nodes.filter((node) => node.type === "start").length, 1);
    assert.equal(nodes.filter((node) => node.type === "end" && !node.small).length, 1);
  });
}

test("the long bank story uses a full-size map followed by a check page", () => {
  const { mode, pages } = verifyPlan(read(FIXTURES, "long-story.md"));
  assert.equal(mode, "A");
  assert.ok(pages.length >= 2);
  assert.ok(pages.slice(0, -1).every((page) => page.type === "flow-map"));
  assert.equal(pages.at(-1).type, "flow-check");
});

test("a same-page wrap runs below the previous row's recovery boxes and connectors", () => {
  const { pages } = verifyPlan(read(FIXTURES, "long-story.md"));
  let wraps = 0;
  for (const page of pages.filter(({ type }) => type === "flow-map")) {
    const nodes = new Map(page.nodes.map((node) => [node.id, node]));
    for (const link of page.links.filter(({ kind }) => kind === "main")) {
      const from = nodes.get(link.from);
      const to = nodes.get(link.to);
      if (!from?.number || !to?.number || to.box.y <= from.box.y + from.box.h) continue;
      wraps += 1;
      const recoveries = page.nodes.filter(({ box, type }) =>
        type === "wrong" && box.y > from.box.y && box.y < to.box.y);
      const bottoms = recoveries.map(({ box }) => box.y + box.h);
      for (const edge of page.links) {
        if (recoveries.some(({ id }) => edge.from === id || edge.to === id)) {
          bottoms.push(...edge.points.map(({ y }) => y));
        }
      }
      assert.ok(bottoms.length > 0);
      const rail = spans(link).find(({ horizontal, low, high }) =>
        horizontal && low < to.box.x + to.box.w && high > from.box.x);
      assert.ok(rail && rail.across > Math.max(...bottoms), `wrap from ${from.id} to ${to.id} must run below the recovery routes`);
    }
  }
  assert.ok(wraps > 0, "the long story must exercise a same-page wrap");
});

test("five stories use two full-size map pages followed by a check page", () => {
  const board = read(FIXTURES, "five-stories.md");
  const { mode, pages } = verifyPlan(board);
  assert.equal(mode, "A");
  assert.deepEqual(pages.map((page) => page.type), ["flow-map", "flow-map", "flow-check"]);
  const { stories } = graph(board);
  for (const story of stories) {
    assert.equal(story.nodes.filter((node) => node.type === "start").length, 1);
    assert.equal(story.nodes.filter((node) => node.type === "end").length, 1);
    const ids = new Set(story.nodes.map((node) => node.id));
    assert.ok(story.links.every(({ from, to }) => ids.has(from) && ids.has(to)));
  }
});

test("cross-page links have a matching pair and a small End has no unmatched continuation", () => {
  const lines = [];
  for (let i = 1; i <= 24; i += 1) {
    lines.push(`${i}. ${"W".repeat(20)} ${i} [blank]: Sees the next screen.`);
    if (i === 1) lines.push("   ? Continue reading?: Yes → 2, Finish → end");
  }
  const { pages } = verifyPlan(exampleFlow(...lines));
  const mapPages = pages.filter((page) => page.type === "flow-map");
  assert.ok(mapPages.length > 1);
  const partners = new Map();
  for (const [index, page] of mapPages.entries()) {
    for (const node of page.nodes.filter((item) => item.type === "continuation")) {
      partners.set(node.text, [...(partners.get(node.text) || []), index]);
    }
  }
  assert.ok(partners.size > 0);
  for (const matchingPages of partners.values()) {
    assert.equal(matchingPages.length, 2);
    assert.notEqual(matchingPages[0], matchingPages[1]);
  }
  const secondAnswers = mapPages.flatMap((page) => page.links).filter((link) => link.kind === "second");
  assert.equal(secondAnswers.length, 1);
  assert.ok(mapPages[0].nodes.some((node) => node.small && node.type === "end"));
});

test("an Arabic map mirrors boxes and connector points across the page", () => {
  const board = read(EXAMPLES, "food-delivery-ar.md");
  const arabic = verifyPlan(board);
  const english = verifyPlan({ ...board, project: { ...board.project, language: "en" } });
  assert.equal(arabic.mode, english.mode);
  assert.equal(arabic.pages.length, english.pages.length);
  for (const [pageIndex, page] of arabic.pages.entries()) {
    if (page.type !== "flow-map") continue;
    const expected = english.pages[pageIndex];
    const rtlBoxes = page.nodes.map((node) => node.box);
    const mirrored = expected.nodes.map(({ box }) => ({ ...box, x: mirrorX(box.x, box.w) }));
    assert.deepEqual(rtlBoxes, mirrored);
    assert.deepEqual(page.links.map((link) => link.points), expected.links.map(({ points }) =>
      points.map(({ x, y }) => ({ x: mirrorX(x), y }))));
  }
});

test("the clinic demo reaches its ends, includes every screen and has distinct answers", () => {
  const result = graph(read(FIXTURES, "flow-map-demo.md"));
  assert.deepEqual(result.checks.slice(0, 3).map((check) => check.status), ["pass", "pass", "pass"]);
  assert.deepEqual(result.checks[0].details.map(({ story, n }) => [story, n]), [
    ["Sign in", 4],
    ["Find a doctor", 5],
    ["Book and pay", 5],
    ["Visit day", 4],
  ]);
  assert.deepEqual(result.counts, { steps: 19, decisions: 4, wrongWays: 3 });
  assert.deepEqual(result.cards, {
    goal: "Book a visit with a doctor",
    starts: "The person opens the app",
    ends: "Visit booked, then visit done",
  });
});

test("decision answers replace the automatic next-screen link", () => {
  const { stories: [story] } = graph(exampleFlow(
    "1. Home [grid]: Sees the options. Chooses one.",
    "   ? Ready to pay?: Pay → 3, See coupons → 2",
    "2. Coupons [list]: Sees coupons.",
    "3. Receipt [done]: Sees the receipt.",
  ));
  const start = story.nodes.find((node) => node.type === "start");
  const decision = story.nodes.find((node) => node.type === "decision");
  const firstScreen = story.links.find((link) => link.from === start.id).to;
  const fromFirstScreen = story.links.filter((link) => link.from === firstScreen);
  assert.deepEqual(fromFirstScreen.map((link) => link.to), [decision.id]);
  const answers = story.links.filter((link) => link.from === decision.id);
  assert.deepEqual(answers.map((link) => [link.kind, link.label]), [
    ["first", "Pay"],
    ["second", "See coupons"],
  ]);
});

test("goal cards use the first story and screens when their settings are absent", () => {
  const result = graph(exampleFlow(
    "1. Basket [list]: Sees the order. Taps Checkout.",
    "2. Receipt [done]: Sees the receipt.",
  ));
  assert.deepEqual(result.cards, { goal: "Check out", starts: "Basket", ends: "Receipt" });
});

test("the path check finds a screen with no path from the start", () => {
  const result = graph(exampleFlow(
    "1. Basket [list]: Sees the order. Taps Checkout. → 3",
    "2. Coupons [list]: Sees coupons.",
    "3. Receipt [done]: Sees the receipt.",
  ));
  assert.equal(result.checks[0].status, "pass");
  assert.equal(result.checks[1].status, "fail");
  assert.ok(result.checks[1].details.some(({ n, name }) => n === 2 && name === "Coupons"));
});

test("the path check catches two decision answers leading to the same screen", () => {
  const result = graph(exampleFlow(
    "1. Basket [list]: Sees the order. Taps Checkout.",
    "   ? Add a coupon?: Add → 2, Skip → 2",
    "2. Receipt [done]: Sees the receipt.",
  ));
  assert.equal(result.checks[1].status, "pass");
  assert.equal(result.checks[2].status, "fail");
  assert.ok(result.checks[2].details.some(({ n, question }) => n === 2 && question === "Add a coupon?"));
});

test("two backward answers stay separate and retain the duplicate-destination finding", () => {
  const board = exampleFlow(
    "1. Home [grid]: Sees the options.",
    "2. Receipt [done]: Sees the receipt.",
    "   ? Go again?: Yes → 1, No → 1"
  );
  const { pages: [page] } = verifyPlan(board);
  const answers = page.links.filter((link) => link.from === "1.2?");
  assert.equal(answers.length, 2);
  assert.equal(connectorConflicts(...answers), null);
  assert.equal(graph(board).checks[2].status, "fail");
});

test("a jump to the next row keeps its own route alongside the required wrap", () => {
  const lines = Array.from({ length: 11 }, (_, index) =>
    `${index + 1}. Screen ${index + 1} [blank]: Opens the screen.${index === 0 ? " → 9" : ""}`);
  const { pages: [page] } = verifyPlan(exampleFlow(...lines));
  const incoming = page.links.filter((link) => link.to === "1.9");
  assert.deepEqual(incoming.map((link) => link.from).sort(), ["1.1", "1.8"]);
  assert.equal(connectorConflicts(...incoming), null);
});

test("interleaved below-row exits report a map problem when they cannot be separated", () => {
  const result = plan(exampleFlow(
    "1. Home [grid]: Sees the options.",
    "2. Check [form]: Looks up the details.",
    "   ? Found?: Yes → 3, No → 1",
    "   ! Offline: Sees the offline message. → 5",
    "3. Update [form]: Updates the details.",
    "4. Verify [form]: Verifies the details.",
    "5. Done [done]: Sees the receipt."
  ));
  assert.ok(result.problems.some((problem) => problem.key === "mapRoute" && problem.line > 0));
});

test("the decisions check is skipped for a flow without decisions", () => {
  const result = graph(exampleFlow("1. Receipt [done]: Sees the receipt."));
  assert.equal(result.checks[2].status, "skip");
});

test("the recovery check catches a wrong way that ends the story", () => {
  const result = graph(exampleFlow(
    "1. Pay [form]: Sees the total. Taps Pay.",
    "   ! Card refused: Sees that the payment failed. → end",
    "2. Receipt [done]: Sees the receipt.",
  ));
  assert.equal(result.checks[3].status, "fail");
  assert.ok(result.checks[3].details.some(({ name }) => name === "Card refused"));
});

test("the goal check accepts the reading tablet's final return to the shelf", () => {
  const result = graph(read(EXAMPLES, "reading-tablet.md"));
  assert.deepEqual(result.checks[0], { status: "pass", details: [{ key: "fastest", story: "Reading a book", n: 4 }] });
});

test("a final screen links to both its return target and the story end", () => {
  const result = graph(exampleFlow(
    "1. Basket [list]: Sees the order. Taps Checkout.",
    "2. Receipt [done]: Sees the receipt. Returns to the basket. → 1",
  ));
  assert.equal(result.checks[0].status, "pass");
  const story = result.stories[0];
  const final = story.nodes.find((node) => node.type === "done");
  const end = story.nodes.find((node) => node.type === "end");
  const basket = story.nodes.find((node) => node.number === 1);
  assert.deepEqual(new Set(story.links.filter((link) => link.from === final.id).map((link) => link.to)),
    new Set([basket.id, end.id]));
});

test("the goal check catches a story that loops before reaching the final screen", () => {
  const result = graph(exampleFlow(
    "1. Basket [list]: Sees the order. Taps Checkout. → 2",
    "2. Pay [form]: Sees the total. Goes back. → 1",
    "3. Receipt [done]: Sees the receipt.",
  ));
  assert.equal(result.checks[0].status, "fail");
  assert.equal(result.checks[1].status, "fail");
});

test("the recovery check catches a flow with no wrong ways", () => {
  const result = graph(exampleFlow("1. Receipt [done]: Sees the receipt."));
  assert.equal(result.counts.wrongWays, 0);
  assert.equal(result.checks[3].status, "fail");
});
