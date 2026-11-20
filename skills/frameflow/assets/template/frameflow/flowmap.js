/* The flow graph, path checks and map geometry. The browser only draws the plan. */
(function (root) {
  "use strict";

  const F = root.Frameflow || (root.Frameflow = {});
  const L = F.layout || require("./layout.js");
  const GAP = 30;
  const ROW_WIDTH = 1010;
  const ROW_INSET = 11;
  const MIN_GAP = 13;
  const LINE_GAP = 10.1;
  const MAP_WIDTH = 676;
  const MAP_HEIGHT = 460;
  const SCALE = 0.70;
  const MAP_X = 56;
  const ROW_LIMIT = 4;

  function graph(board) {
    const settings = board.project.settings;
    const first = board.stories[0];
    const last = board.stories[board.stories.length - 1];
    const cards = {
      goal: settings.goal || board.project.about || first.title,
      starts: settings.starts || first.screens[0].name,
      ends: settings.ends || last.screens[last.screens.length - 1].name
    };
    const counts = { steps: 0, decisions: 0, wrongWays: 0 };
    const results = { fastest: [], blocked: [], unreachable: [], same: [], stops: [] };
    const stories = board.stories.map((story, index) => {
      const here = storyGraph(story, index);
      here.nodes.forEach((node) => {
        if (node.type === "step" || node.type === "done") counts.steps++;
        if (node.type === "decision") counts.decisions++;
        if (node.type === "wrong") counts.wrongWays++;
      });
      checkStory(here, results);
      return here;
    });
    return { stories, counts, cards, checks: [
      check(results.blocked, results.fastest),
      check(results.unreachable, [{ key: "allReached" }]),
      counts.decisions ? check(results.same, [{ key: "allDecisions" }]) : { status: "skip", details: [{ key: "noDecisions" }] },
      counts.wrongWays ? check(results.stops, [{ key: "allRecover" }]) : { status: "fail", details: [{ key: "noWrongWays" }] }
    ] };
  }

  function check(failures, successes) {
    return failures.length ? { status: "fail", details: failures } : { status: "pass", details: successes };
  }

  function storyGraph(story, index) {
    const prefix = index + 1 + ".";
    const start = prefix + "start";
    const end = prefix + "end";
    const screens = story.screens;
    const nodes = [{ id: start, type: "start", line: story.line }];
    const links = [{ from: start, to: prefix + "1", kind: "main" }];
    const screenTarget = (to) => to === "end" ? end : prefix + to;
    screens.forEach((screen, i) => {
      const id = prefix + screen.number;
      const last = i === screens.length - 1;
      nodes.push({ id, type: last ? "done" : "step", text: screen.name, number: screen.number, line: screen.line });
      if (screen.decision) {
        const decision = id + "?";
        nodes.push({ id: decision, type: "decision", text: screen.decision.question, owner: id, line: screen.decision.line });
        links.push({ from: id, to: decision, kind: "main" });
        screen.decision.answers.forEach((answer, j) => {
          links.push({ from: decision, to: screenTarget(answer.to), kind: j ? "second" : "first", label: answer.label, line: screen.decision.line });
        });
      } else {
        links.push({ from: id, to: screenTarget(screen.to || (last ? "end" : screen.number + 1)), kind: "main" });
        if (last && typeof screen.to === "number") links.push({ from: id, to: end, kind: "main" });
      }
      screen.errors.forEach((error, j) => {
        const wrong = id + "!" + (j + 1);
        const to = error.to === "end" ? wrong + ".end" : screenTarget(error.to);
        nodes.push({ id: wrong, type: "wrong", text: error.name, owner: id, line: error.line });
        if (error.to === "end") nodes.push({ id: to, type: "end", owner: wrong, small: true, line: error.line });
        links.push({ from: id, to: wrong, kind: "wrong" }, { from: wrong, to, kind: "wrong" });
      });
    });
    nodes.push({ id: end, type: "end", line: story.line });
    return { title: story.title, index, line: story.line, nodes, links };
  }

  function checkStory(story, results) {
    const screens = story.nodes.filter((node) => node.type === "step" || node.type === "done");
    const start = story.nodes[0].id;
    const end = story.nodes[story.nodes.length - 1].id;
    const nodes = new Map(story.nodes.map((node) => [node.id, node]));
    const outgoing = new Map(story.nodes.map((node) => [node.id, []]));
    story.links.forEach((edge) => outgoing.get(edge.from).push(edge));
    // Count screen visits. The graph can pass through a decision or an error before the next screen.
    // A terminal error is not the successful end of a story.
    const first = outgoing.get(start)[0].to;
    const seen = new Map([[first, 1]]);
    const pending = [first];
    for (let i = 0; i < pending.length; i++) {
      const id = pending[i];
      const next = outgoing.get(id).flatMap(({ to }) => {
        const type = nodes.get(to).type;
        return type === "decision" || type === "wrong" ? outgoing.get(to).map((edge) => edge.to) : [to];
      });
      next.forEach((to) => {
        if (seen.has(to) || nodes.get(to).small) return;
        seen.set(to, seen.get(id) + (to === end ? 0 : 1));
        if (to !== end) pending.push(to);
      });
    }
    if (seen.has(end)) results.fastest.push({ key: "fastest", story: story.title, n: seen.get(end) });
    else results.blocked.push({ key: "blocked", story: story.title, screens: screens.filter((s) => seen.has(s.id)).map((s) => s.number).join(", ") });
    screens.forEach((screen) => {
      if (!seen.has(screen.id)) results.unreachable.push({ key: "unreachable", story: story.title, n: screen.number, name: screen.text });
    });
    story.nodes.forEach((node) => {
      const links = outgoing.get(node.id);
      if (node.type === "decision" && links[0].to === links[1].to) {
        const target = nodes.get(links[0].to);
        results.same.push({ key: target.id === end ? "sameEnd" : "sameScreen", question: node.text, n: target.number });
      } else if (node.type === "wrong" && nodes.get(links[0].to).small) {
        results.stops.push({ key: "stops", name: node.text });
      }
    });
  }

  // Leave room for both bundled typefaces. The renderer checks the actual font bounds before printing.
  function textWidth(text, size) {
    return Array.from(text).reduce((width, c) => width + size * (
      /\s/.test(c) ? 0.30 : /[ilIjt.,'!|]/.test(c) ? 0.33 : /[MW@%]/.test(c) ? 0.97 : /[\u0600-\u06ff]/.test(c) ? 0.57 : /[A-Z]/.test(c) ? 0.73 : 0.62
    ), 0);
  }

  function dimensions(node) {
    if (node.type === "decision") return { w: 104, h: 68 };
    if (node.type === "start" || node.type === "end") return node.small ? { w: 48, h: 28 } : { w: 70, h: 38 };
    return { w: Math.max(82, Math.ceil(textWidth(node.text, 13)) + 24), h: 38 };
  }

  function rowsFor(story) {
    const { nodes, links } = story;
    const lookup = new Map(nodes.map((node) => [node.id, node]));
    const below = new Map();
    links.filter((link) => link.kind === "second").forEach((link) => {
      const target = lookup.get(link.to);
      if ((target.type === "step" || target.type === "done") && target.number !== 1 &&
          links.filter((edge) => edge.to === link.to && (edge.kind !== "wrong" || lookup.get(edge.from).owner !== target.id)).length === 1) {
        below.set(target.id, link.from);
      }
    });
    // A detached cycle stays numbered on the main line, where it can be inspected.
    for (const [id, decision] of below) {
      const visited = new Set([id]);
      let owner = lookup.get(decision).owner;
      while (below.has(owner) && !visited.has(owner)) {
        visited.add(owner);
        owner = lookup.get(below.get(owner)).owner;
      }
      if (visited.has(owner)) below.delete(id);
    }
    const line = nodes.filter((node) => !node.small && node.type !== "wrong" && !below.has(node.id) &&
      !(node.type === "decision" && below.has(node.owner)));
    const groups = line.filter((node) => node.type !== "decision").map((node) => {
      const diamond = lookup.get(node.id + "?");
      return diamond ? [node, diamond] : [node];
    });
    // Keep End with the final line even when the gaps there need to be tightened.
    const end = groups.pop()[0];
    groups[groups.length - 1].push(end);
    const rows = [];
    let row = null;
    let boxes = 0;
    groups.forEach((group) => {
      const count = group.filter((node) => node.type !== "start" && node.type !== "end").length;
      if (!row || boxes + count > 8 || lineWidth(row.nodes.concat(group), links, MIN_GAP) > ROW_WIDTH) {
        row = { nodes: [], story, part: rows.length, below };
        rows.push(row);
        boxes = 0;
      }
      row.nodes.push(...group);
      boxes += count;
    });
    const rowFor = new Map(rows.flatMap((r) => r.nodes.map((node) => [node.id, r])));
    const extraGutter = links.some((link) => {
      const from = rowFor.get(link.from);
      const to = rowFor.get(link.to);
      return from && to && from !== to && !wrapsBetween(from, to, link);
    });
    if (extraGutter) rows.forEach((line) => { line.extraGutter = true; });
    return rows;
  }

  function placeRow(row, width, scale, wraps) {
    const { story, below } = row;
    const line = { ...row, nodes: [...row.nodes] };
    const { links, nodes } = story;
    const clearance = LINE_GAP / scale;
    const requestedInset = row.extraGutter ? ROW_INSET + clearance + 4 : ROW_INSET;
    const inset = lineWidth(line.nodes, links, MIN_GAP / scale, requestedInset) <= width ? requestedInset : ROW_INSET;
    const minimum = lineWidth(line.nodes, links, MIN_GAP / scale, inset);
    if (minimum > width) return null;
    line.inset = inset;
    const ideal = lineWidth(line.nodes, links, GAP, inset);
    const loosen = ideal > width ? (width - minimum) / (ideal - minimum) : 1;
    let x = inset;
    const top = links.some((edge) => {
      const a = line.nodes.findIndex((node) => node.id === edge.from);
      const b = line.nodes.findIndex((node) => node.id === edge.to);
      return a >= 0 && b >= 0 && (edge.kind === "first" && b < a || b > a + 1 && edge.kind !== "second");
    });
    const cy = top ? 90 : 57;
    line.nodes = line.nodes.map((node) => {
      const size = dimensions(node);
      const placed = { ...node, box: { x, y: cy - size.h / 2, ...size } };
      const min = gapAfter(node, links, MIN_GAP / scale);
      x += size.w + min + (gapAfter(node, links, GAP) - min) * loosen;
      return placed;
    });
    const pending = nodes.filter((node) => node.small || node.type === "wrong" || below.has(node.id) ||
      (node.type === "decision" && below.has(node.owner)));
    links.filter((link) => link.kind === "second" && link.to === story.nodes[story.nodes.length - 1].id).forEach((edge) => {
      pending.push({ id: edge.from + ".end", type: "end", small: true, owner: edge.from, line: edge.line });
    });
    const drops = [];
    let added = true;
    while (added) {
      added = false;
      pending.forEach((node) => {
        if (line.nodes.some((placed) => placed.id === node.id)) return;
        const parent = line.nodes.find((placed) => placed.id === (below.get(node.id) || node.owner));
        if (!parent) return;
        const size = dimensions(node);
        const center = parent.box.x + parent.box.w / 2;
        const y = Math.max(cy + 59, parent.box.y + parent.box.h + 32);
        const fit = (box) => !line.nodes.some((placed) => overlaps(box, placed.box, clearance)) &&
          !drops.some(([a, b]) => segmentHits(a, b, box));
        if (node.type === "wrong") {
          const siblings = pending.filter((item) => item.type === "wrong" && item.owner === node.owner);
          const offset = siblings.length > 1 ? (siblings.indexOf(node) ? 1 : -1) : 0;
          const placed = placeWrong(parent.box, size, y, width, inset, clearance, offset, line.nodes, drops, fit);
          if (!placed) { line.unplaced = node; return; }
          line.nodes.push({ ...node, ...placed, auxiliary: true });
        } else {
          const x = Math.max(inset, Math.min(width - size.w - inset, center - size.w / 2));
          let box = { x, y, ...size };
          while (!fit(box)) {
            const nextX = box.x + 18;
            if (nextX + size.w <= width - inset && nextX - x < size.w + 28) box.x = nextX;
            else { box.x = x; box.y += 55; }
          }
          line.nodes.push({ ...node, box, auxiliary: true });
        }
        added = true;
      });
    }
    const bottom = Math.max(...line.nodes.map((node) => node.box.y + node.box.h));
    const right = Math.max(...line.nodes.map((node) => node.box.x + node.box.w));
    line.width = right + inset;
    line.bottom = bottom;
    line.height = bottom + (wraps ? clearance * 4 + 12 : clearance * 2 + 17);
    return line;
  }

  function placeWrong(parent, size, y, width, inset, clearance, offset, nodes, drops, fit) {
    const center = parent.x + parent.w / 2;
    const inner = 10;
    for (let level = 0; level < 8; level++) {
      for (const d of [0, -clearance / 2, clearance / 2, -clearance, clearance]) {
        const dropX = center + offset * (clearance + 2) + d;
        if (dropX < parent.x + inner || dropX > parent.x + parent.w - inner) continue;
        const ideal = offset < 0 ? dropX - size.w + inner : offset > 0 ? dropX - inner : dropX - size.w / 2;
        const left = Math.max(inset, dropX - size.w + inner);
        const right = Math.min(width - size.w - inset, dropX - inner);
        if (right < left) continue;
        const x = Math.max(left, Math.min(ideal, right));
        const box = { x, y: y + level * (size.h + clearance + 9), ...size };
        const a = { x: dropX, y: parent.y + parent.h };
        const b = { x: dropX, y: box.y };
        if (!fit(box) || nodes.some((node) => segmentHits(a, b, node.box)) ||
            drops.some(([u, v]) => linesConflict(a, b, u, v, clearance))) continue;
        drops.push([a, b]);
        return { box, dropX };
      }
    }
    return null;
  }

  function lineWidth(nodes, links, normal, inset = ROW_INSET) {
    return inset * 2 + nodes.reduce((width, node, i) =>
      width + dimensions(node).w + (i < nodes.length - 1 ? gapAfter(node, links, normal) : 0), 0);
  }

  function gapAfter(node, links, normal) {
    const answer = links.find((link) => link.from === node.id && link.kind === "first");
    return answer ? Math.max(normal, Math.ceil(textWidth(answer.label, 11)) + 14) : normal;
  }

  function overlaps(a, b, pad = 0) {
    return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x &&
      a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
  }

  function plan(board) {
    const flow = graph(board);
    const rows = flow.stories.flatMap(rowsFor);
    const placed = (width, scale) => rows.map((row, i) => placeRow(row, width, scale, rows[i + 1]?.story === row.story));
    const compact = rows.length <= ROW_LIMIT && placed(MAP_WIDTH / SCALE, SCALE);
    let result;
    if (compact && compact.every(Boolean) && sumHeight(compact) * SCALE <= MAP_HEIGHT) result = planPages(compact, true, flow);
    if (!result || result.problems.length) result = planPages(placed(ROW_WIDTH, 1), false, flow);
    if (board.project.language === "ar") result.pages.forEach(mirror);
    return result;
  }

  function planPages(rows, compact, flow) {
    const pages = [];
    const problems = [];
    const parts = [];
    if (compact) parts.push(rows);
    else rows.forEach((row) => {
      let part = parts[parts.length - 1];
      if (!part || part.length >= ROW_LIMIT || sumHeight(part) + row.height > 568) parts.push(part = []);
      part.push(row);
    });
    parts.forEach((part, pageIndex) => {
      const blocked = part.find((row) => row.unplaced || row.height > 568 || row.width > ROW_WIDTH + 1e-6);
      if (blocked) {
        problems.push({ key: "mapTooLarge", line: blocked.unplaced?.line || blocked.story.line, story: blocked.story.title });
        return;
      }
      const page = mapPage(part, compact, parts, pageIndex, problems);
      pages.push(page);
    });
    if (compact && pages.length) Object.assign(pages[0], { cards: flow.cards, checks: flow.checks, counts: flow.counts });
    if (!compact) pages.push({ type: "flow-check", cards: flow.cards, checks: flow.checks, counts: flow.counts, nodes: [], links: [], rows: [] });
    return { mode: compact ? "C" : "A", pages, problems };
  }

  function sumHeight(rows) { return rows.reduce((height, row) => height + row.height, 0); }
  function translate(box, x, y, scale) {
    return { x: x + box.x * scale, y: y + box.y * scale, w: box.w * scale, h: box.h * scale };
  }

  function mapPage(rows, compact, parts, pageIndex, problems) {
    const scale = compact ? SCALE : 1;
    const dy = compact ? 194 : 135;
    const page = { type: "flow-map", scale, nodes: [], links: [], rows: [], index: pageIndex, mapCount: parts.length };
    let y = 0;
    rows.forEach((row) => {
      page.rows.push({ title: row.story.title, part: row.part, n: row.story.index + 1, x: 11, y: y + 14, line: row.story.line, w: (compact ? MAP_WIDTH / scale : 1010) - 22 });
      row.nodes.forEach((node) => page.nodes.push({ ...node, band: row, bandY: y, box: translate(node.box, 0, y, 1) }));
      y += row.height;
    });
    const local = new Map(page.nodes.map((node) => [node.id, node]));
    const width = compact ? MAP_WIDTH / scale : ROW_WIDTH;
    const bounds = { x: 0, y: 20, w: width, h: y - 20, clearance: LINE_GAP / scale };
    const obstacles = page.nodes.map((node) => node.box);
    page.rows.forEach((row) => obstacles.push({ x: row.x, y: row.y - 12, w: textWidth(row.title, 15) + 84, h: 16 }));
    const links = Array.from(new Set(rows.map((row) => row.story))).flatMap((story) =>
      story.links.map((link, i) => ({ ...link, continuation: (story.index + 1) + "." + (i + 1) })));
    // Reserve the straight drops and short recovery loops before routing the longer branches around them.
    links.sort((a, b) => order(a, local) - order(b, local));
    links.forEach((link) => {
      const from = local.get(link.from);
      let to = local.get(link.to);
      const small = link.kind === "second" && local.get(link.from + ".end");
      if (small) to = small;
      if (!from && !to) return;
      if (!from || !to) {
        const original = from ? link.to : link.from;
        // The counterpart of an inline End is on the same line, even when the story's End is on another page.
        if (!from && link.kind === "second" && original.includes("?") && link.to.endsWith(".end")) return;
        const otherPage = parts.findIndex((part) => part.some((row) => row.nodes.some((node) => node.id === original)));
        if (otherPage < 0) return;
        const node = from || to;
        const portal = continuation(page, node, link.continuation, from, width, bounds, obstacles);
        if (portal) {
          local.set(portal.id, portal);
          const routed = route(from || portal, to || portal, from ? link : { ...link, label: null }, bounds, obstacles, page.links);
          if (routed) { page.links.push(routed); return; }
          page.nodes.pop();
          obstacles.pop();
        }
      } else {
        const routed = route(from, to, link, bounds, obstacles, page.links);
        if (routed) { page.links.push(routed); return; }
      }
      const node = from || to;
      problems.push({ key: "mapRoute", line: link.line || node.line, story: node.band.story.title });
    });
    page.nodes = page.nodes.map(({ band, bandY, dropX, ...node }) => ({ ...node, box: translate(node.box, MAP_X, dy, scale) }));
    page.links.forEach((link) => {
      link.points = link.points.map((p) => ({ x: MAP_X + p.x * scale, y: dy + p.y * scale }));
      if (link.labelBox) link.labelBox = translate(link.labelBox, MAP_X, dy, scale);
    });
    page.rows = page.rows.map((r) => ({ ...r, x: MAP_X + r.x * scale, y: dy + r.y * scale, w: r.w * scale }));
    return page;
  }

  function order(link, local) {
    const from = local.get(link.from);
    const to = local.get(link.to);
    if (from && to && isWrap(from, to, link)) return 6;
    if (!from || (!to && link.kind !== "second") || (to && from.band !== to.band && link.kind !== "second")) return 7;
    if (to?.type === "wrong" && to.dropX !== undefined) return 0;
    if (link.kind === "wrong") return 3;
    if (link.kind === "second") return 5;
    return from.auxiliary ? 4 : 1;
  }

  function isWrap(from, to, link) {
    return wrapsBetween(from.band, to.band, link);
  }

  function wrapsBetween(from, to, link) {
    return from.story === to.story && to.part === from.part + 1 &&
      link.to === to.nodes[0].id && link.from === from.nodes.findLast((node) => !node.auxiliary).id &&
      (link.kind === "main" || link.kind === "first");
  }

  function continuation(page, node, tag, outgoing, width, bounds, obstacles) {
    const w = 58;
    const h = 18;
    let y = node.box.y + (node.box.h - h) / 2;
    const x = outgoing ? width - w - 1 : 1;
    let box = { x, y, w, h };
    while (obstacles.some((obstacle) => overlaps(box, obstacle, 4))) {
      y += 22;
      if (y + h > bounds.y + bounds.h) return null;
      box = { x, y, w, h };
    }
    const portal = { id: node.id + ".continuation." + page.nodes.length, type: "continuation", text: tag, box, band: node.band, bandY: node.bandY, line: node.line };
    page.nodes.push(portal);
    obstacles.push(box);
    return portal;
  }

  function port(box, side, offset = 0) {
    if (side === "left" || side === "right") return { x: side === "left" ? box.x : box.x + box.w, y: box.y + box.h / 2 + offset };
    return { x: box.x + box.w / 2 + offset, y: side === "top" ? box.y : box.y + box.h };
  }

  function extend(point, side) {
    const steps = { left: [-7, 0], right: [7, 0], top: [0, -7], bottom: [0, 7] };
    return { x: point.x + steps[side][0], y: point.y + steps[side][1] };
  }

  function segmentHits(a, b, r) {
    const loX = Math.min(a.x, b.x), hiX = Math.max(a.x, b.x);
    const loY = Math.min(a.y, b.y), hiY = Math.max(a.y, b.y);
    return loX < r.x + r.w && hiX > r.x && loY < r.y + r.h && hiY > r.y;
  }

  function segments(points, test) {
    for (let i = 1; i < points.length; i++) if (test(points[i - 1], points[i])) return true;
    return false;
  }

  function labelOn(points, label, obstacles, existing, bounds) {
    const w = Math.ceil(textWidth(label, 11)) + 8;
    const h = 14;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const horizontal = a.y === b.y;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (horizontal ? Math.abs(a.x - b.x) < w - 3 : Math.abs(a.y - b.y) < h - 3) continue;
      const options = horizontal ? [{ x: mid.x - w / 2, y: a.y - h - 2 }, { x: mid.x - w / 2, y: a.y + 2 }]
        : [{ x: a.x + 3, y: mid.y - h / 2 }, { x: a.x - w - 3, y: mid.y - h / 2 }];
      for (const at of options) {
        const box = { ...at, w, h };
        if (box.x < 0 || box.x + w > bounds.w || box.y < 0 || box.y + h > bounds.y + bounds.h) continue;
        if (obstacles.some((r) => overlaps(box, r, 1))) continue;
        if (segments(points, (p, q) => segmentHits(p, q, box))) continue;
        if (existing.some((line) => segments(line.points, (p, q) => segmentHits(p, q, box)))) continue;
        return box;
      }
    }
    return null;
  }

  function route(from, to, link, bounds, obstacles, existing) {
    const a = from.box, b = to.box;
    const clearance = bounds.clearance;
    const sameRow = from.band === to.band;
    const right = b.x > a.x;
    const adjacent = sameRow && a.y + a.h / 2 === b.y + b.h / 2 && right &&
      a.x + a.w < b.x && !obstacles.some((r) => segmentHits(port(a, "right"), port(b, "left"), r));
    const clear = (points) => clearRoute(points, bounds, obstacles, existing);
    const finish = (points) => {
      const labelBox = link.label && labelOn(points, link.label, obstacles, existing, bounds);
      if (link.label && !labelBox) return null;
      if (labelBox) obstacles.push(labelBox);
      return { ...link, points, labelBox: labelBox || null };
    };

    if (to.type === "wrong" && to.dropX !== undefined && from.id === to.owner) {
      const points = [{ x: to.dropX, y: a.y + a.h }, { x: to.dropX, y: b.y }];
      return clear(points) ? finish(points) : null;
    }

    if (isWrap(from, to, link)) {
      const start = port(a, "right"), end = port(b, "left");
      const rightGutter = bounds.w - 4 - (from.band.inset - ROW_INSET);
      const leftGutter = 4;
      const y = from.bandY + from.band.height - 5;
      const points = [start, { x: rightGutter, y: start.y }, { x: rightGutter, y }, { x: leftGutter, y },
        { x: leftGutter, y: end.y }, end];
      return clear(points) ? finish(points) : null;
    }

    if (adjacent) {
      const points = [port(a, "right"), port(b, "left")];
      const direct = clear(points) && finish(points);
      if (direct) return direct;
    }

    const recovery = link.kind === "wrong" && from.type === "wrong" && !to.small && to.type !== "continuation";
    const ownReturn = recovery && from.owner === to.id;
    const rightSide = a.x + a.w / 2 >= b.x + b.w / 2;
    const comesUp = from.auxiliary && !to.auxiliary && sameRow;
    let choices = [["right", "left"], ["left", "right"], ["bottom", "top"], ["top", "bottom"], ["top", "top"], ["bottom", "bottom"]];
    if (recovery) {
      const exitsRight = ownReturn ? rightSide : right;
      choices = [[exitsRight ? "right" : "left", "bottom"], [exitsRight ? "left" : "right", "bottom"]];
    }
    else if (link.kind === "second" && from.type === "decision" && to.type !== "continuation") {
      choices = [["bottom", to.auxiliary ? "top" : "bottom"]];
    } else if (from.type === "wrong" && to.small) choices = [["bottom", "top"], ["right", "top"], ["left", "top"]];
    else if (comesUp) choices = [[right ? "right" : "left", "bottom"], ["top", "bottom"], [right ? "left" : "right", "bottom"]];
    else if (sameRow && !adjacent && from.type !== "continuation" && to.type !== "continuation") {
      choices = [right || link.kind === "first" ? ["top", "top"] : ["bottom", "bottom"], ...choices];
    }
    // The diamond's bottom tip is the sole departure for the second answer.
    if (link.kind === "first") choices = choices.filter(([leave]) => leave !== "bottom");

    const detours = [];
    for (const [leave, enter] of choices) {
      let targetOffset = 0;
      if (enter === "bottom") {
        // Routes arriving from farther away use the outside of shorter returns into the same target.
        if (link.kind === "second") targetOffset = right ? clearance * 2 : -clearance * 2;
        else if (comesUp && !recovery) targetOffset = right ? -clearance * 2 : clearance * 2;
        else if (ownReturn) targetOffset = (leave === "right" ? 1 : -1) * (clearance * 2 + 4);
      }
      const sameBandBottom = from.bandY + from.band.bottom + clearance * 2;
      const rowMin = sameRow ? Math.max(bounds.y, from.bandY + 22) : bounds.y;
      const rowMax = sameRow ? Math.min(bounds.y + bounds.h, sameBandBottom) : bounds.y + bounds.h;
      const within = { ...bounds, y: rowMin, h: rowMax - rowMin };
      const offsets = (node, side, preferred) => {
        if (node.type === "decision" || node.type === "start" || node.type === "end" || node.type === "continuation") return [0];
        const limit = (side === "top" || side === "bottom" ? node.box.w : node.box.h) / 2 - 7;
        return [...new Set([preferred, 0, -clearance, clearance, -2 * clearance, 2 * clearance])].filter((value) => Math.abs(value) <= limit);
      };
      for (const ao of offsets(from, leave, 0)) {
        const start = port(a, leave, ao), s = extend(start, leave);
        if (!clear([start, s])) continue;
        for (const bo of offsets(to, enter, targetOffset)) {
          const end = port(b, enter, bo), t = extend(end, enter);
          if (!clear([t, end])) continue;
          const candidates = routeCandidates(start, s, t, end, within, obstacles, existing);
          for (const points of candidates) {
            const result = finish(points);
            if (result) return result;
          }
          detours.push({ start, s, t, end, within });
        }
      }
    }
    for (const { start, s, t, end, within } of detours) {
      const points = routeAround(start, s, t, end, within, obstacles, existing);
      if (points) {
        const result = finish(points);
        if (result) return result;
      }
    }
    return null;
  }

  function routeRails(s, t, bounds, obstacles, existing) {
    const within = (v, lo, hi) => v >= lo && v <= hi;
    const { clearance, w, y, h } = bounds;
    const xs = [4, w - 4, (s.x + t.x) / 2, s.x, t.x];
    const ys = [y + 3, y + h - 3, (s.y + t.y) / 2, s.y, t.y];
    obstacles.forEach((r) => {
      if (r.y > y + h || r.y + r.h < y) return;
      xs.push(r.x - 5, r.x + r.w + 5);
      ys.push(r.y - 5, r.y + r.h + 5);
    });
    existing.forEach(({ points }) => points.forEach((p) => {
      if (!within(p.y, y - clearance, y + h + clearance)) return;
      xs.push(p.x - clearance, p.x + clearance);
      ys.push(p.y - clearance, p.y + clearance);
    }));
    return {
      xs: [...new Set(xs)].filter((x) => within(x, 1, w - 1)),
      ys: [...new Set(ys)].filter((at) => within(at, y, y + h))
    };
  }

  function routeCandidates(start, s, t, end, bounds, obstacles, existing) {
    const { xs, ys } = routeRails(s, t, bounds, obstacles, existing);
    const options = [];
    function tryPath(middle) {
      const points = simplify([start, s, ...middle, t, end]);
      if (!clearRoute(points, bounds, obstacles, existing)) return;
      let length = 0;
      segments(points, (p, q) => { length += Math.abs(p.x - q.x) + Math.abs(p.y - q.y); return false; });
      options.push({ points, score: length + points.length * 9 });
    }
    if (s.x === t.x || s.y === t.y) tryPath([]);
    xs.forEach((x) => tryPath([{ x, y: s.y }, { x, y: t.y }]));
    ys.forEach((y) => tryPath([{ x: s.x, y }, { x: t.x, y }]));
    if (!options.length) xs.forEach((x) => ys.forEach((y) => {
      tryPath([{ x, y: s.y }, { x, y }, { x: t.x, y }]);
      tryPath([{ x: s.x, y }, { x, y }, { x, y: t.y }]);
    }));
    return options.sort((a, b) => a.score - b.score).map((option) => option.points);
  }

  // If a short route is blocked, walk the free spans between the same rails and allow more turns.
  function routeAround(start, s, t, end, bounds, obstacles, existing) {
    const { xs, ys } = routeRails(s, t, bounds, obstacles, existing);
    xs.sort((a, b) => a - b);
    ys.sort((a, b) => a - b);
    const stride = xs.length;
    const index = (p) => ys.indexOf(p.y) * stride + xs.indexOf(p.x);
    const point = (i) => ({ x: xs[i % stride], y: ys[Math.floor(i / stride)] });
    if (![s, t].every((p) => xs.includes(p.x) && ys.includes(p.y))) return null;
    const first = index(s);
    const last = index(t);
    const cameFrom = new Int32Array(xs.length * ys.length).fill(-1);
    const pending = [first];
    cameFrom[first] = first;
    for (let i = 0; i < pending.length && cameFrom[last] === -1; i++) {
      const here = pending[i];
      const x = here % stride;
      const row = Math.floor(here / stride);
      const moves = [[x - 1, row], [x + 1, row], [x, row - 1], [x, row + 1]];
      for (const [col, nextRow] of moves) {
        if (col < 0 || col >= stride || nextRow < 0 || nextRow >= ys.length) continue;
        const next = nextRow * stride + col;
        if (cameFrom[next] !== -1 || !clearRoute([point(here), point(next)], bounds, obstacles, existing)) continue;
        cameFrom[next] = here;
        pending.push(next);
      }
    }
    if (cameFrom[last] === -1) return null;
    const reversed = [end];
    for (let at = last; at !== first; at = cameFrom[at]) reversed.push(point(at));
    const points = simplify(reversed.concat(s, start).reverse());
    return clearRoute(points, bounds, obstacles, existing) ? points : null;
  }

  function simplify(points) {
    return points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y)
      .filter((p, i, all) => !i || i === all.length - 1 || !(
        (all[i - 1].x === p.x && p.x === all[i + 1].x && (p.y - all[i - 1].y) * (all[i + 1].y - p.y) >= 0) ||
        (all[i - 1].y === p.y && p.y === all[i + 1].y && (p.x - all[i - 1].x) * (all[i + 1].x - p.x) >= 0)));
  }

  function clearRoute(points, bounds, obstacles, existing) {
    if (points.some((p) => p.x < bounds.x || p.x > bounds.x + bounds.w || p.y < bounds.y || p.y > bounds.y + bounds.h)) return false;
    if (segments(points, (a, b) => obstacles.some((r) => segmentHits(a, b, r)))) return false;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (existing.some((line) => segments(line.points, (u, v) => linesConflict(a, b, u, v, bounds.clearance)))) return false;
      for (let j = 1; j < i; j++) {
        const u = points[j - 1], v = points[j];
        const adjacentBend = j === i - 1 && (a.y === b.y) !== (u.y === v.y);
        if (!adjacentBend && linesConflict(a, b, u, v, bounds.clearance)) return false;
      }
    }
    return true;
  }

  function linesConflict(a, b, c, d, clearance) {
    const horizontal = a.y === b.y;
    if (horizontal === (c.y === d.y)) {
      const along = horizontal ? "x" : "y";
      const across = horizontal ? "y" : "x";
      const overlap = Math.min(Math.max(a[along], b[along]), Math.max(c[along], d[along])) -
        Math.max(Math.min(a[along], b[along]), Math.min(c[along], d[along]));
      return overlap > 1e-6 && Math.abs(a[across] - c[across]) < clearance - 1e-6;
    }
    if (!horizontal) return linesConflict(c, d, a, b, clearance);
    return c.x >= Math.min(a.x, b.x) && c.x <= Math.max(a.x, b.x) &&
      a.y >= Math.min(c.y, d.y) && a.y <= Math.max(c.y, d.y);
  }

  function mirror(page) {
    const mirrorBox = (box) => ({ ...box, x: L.mirrorX(box.x, box.w) });
    page.nodes.forEach((node) => { node.box = mirrorBox(node.box); });
    page.rows.forEach((row) => { row.x = L.mirrorX(row.x); });
    page.links.forEach((link) => {
      link.points.forEach((point) => { point.x = L.mirrorX(point.x); });
      if (link.labelBox) link.labelBox = mirrorBox(link.labelBox);
    });
  }

  const api = { graph, plan };
  F.flowmap = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
