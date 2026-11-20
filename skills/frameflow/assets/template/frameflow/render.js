/* frameflow: draws the pages. The only file that touches the page.
   Reads the text copy from <script type="text/markdown" id="app-flow">, asks model.js to read it, theme.js for
   the colours and layout.js to place it, then builds the pages. When something is wrong, or a word does not
   fit, it shows the numbered problems instead of a messy page.
   When finished it sets <html data-frameflow="ready"> or "refused", so an agent can check before printing. */
(function () {
  "use strict";

  var F = window.Frameflow;
  var L = F.layout;
  var words = F.strings.words("en");
  // Every device frame drawn, with the room it may use: sized once its picture's shape is known (settleFrames).
  var frames = [];
  var flowFits = [];

  function start() {
    var source = document.getElementById("app-flow");
    // The text starts on the line after the opening tag; drop that first line break so line numbers match app-flow.md.
    var result = F.model.parse(source ? source.textContent.replace(/^\r?\n/, "") : "");
    words = F.strings.words(String(result.storyboard.project.settings.language || "en").toLowerCase());
    if (!result.ok) return refuse(result.problems);
    try {
      var problems = draw(result.storyboard);
      if (problems) return refuse(problems);
    } catch (err) {
      return refuse([{ line: 0, text: words.notDrawn + err.message }]);
    }
    finish();
  }

  // ---------- the document ----------

  function draw(board) {
    var p = board.project;
    var plan = L.plan(board);
    if (plan.flowProblems.length) return plan.flowProblems.map(function (problem) {
      return { line: problem.line, text: F.strings.fill(words.flow[problem.key], problem) };
    });
    var html = document.documentElement;
    var ctx = { board: board, plan: plan, W: words, rtl: p.language === "ar", total: plan.pages.length, sheet: null };

    html.lang = p.language;
    html.dir = ctx.rtl ? "rtl" : "ltr";
    document.title = p.name + " · " + words.appFlow;
    paint(html, F.theme.theme(p.stage, p.accent));

    var book = el("main", "book");
    plan.pages.forEach(function (page) {
      ctx.sheet = el("section", "page");
      if (page.type === "cover") cover(ctx, page);
      else if (page.type === "screen") screenPage(ctx, page);
      else flowPage(ctx, page);
      book.appendChild(ctx.sheet);
    });
    document.body.appendChild(text("div", "print-hint", words.printHint));
    document.body.appendChild(book);
  }

  // The app's colours, handed to frameflow.css.
  function paint(html, t) {
    // --acc turns red on an "if it goes wrong" page; --app stays the app's colour (a sketch's button).
    var vars = { bg: t.bg, ink: t.ink, mute: t.mute, line: t.line, acc: t.acc, app: t.acc, "acc-rgb": t.accRgb, "on-acc": t.onAcc,
      red: t.red, "red-rgb": t.redRgb, "on-red": t.onRed, bezel: t.bezel, "bezel-line": t.bezelLine, glow: t.glow, "glow-red": t.glowRed };
    Object.keys(vars).forEach(function (k) { html.style.setProperty("--" + k, vars[k]); });
    Object.keys(t.map).forEach(function (k) { html.style.setProperty("--map-" + k, t.map[k]); });
    html.classList.toggle("dark", t.dark);
  }

  function cover(ctx, page) {
    var p = ctx.board.project;
    var W = ctx.W;
    ctx.sheet.classList.add("cover");

    var shown = ctx.board.stories[p.cover.story].screens[p.cover.screen];
    device(ctx, p.kind, shown, page.device, "front");

    var count = ctx.board.stories.length;
    var col = el("div", "covtext" + (count > 9 ? " full" : ""));
    col.appendChild(text("div", "label", W.appFlow));
    var size = [...p.name].length <= 10 ? "xl" : [...p.name].length <= 18 ? "l" : [...p.name].length <= 32 ? "m" : "s";
    col.appendChild(text("h1", "title " + size, p.name));
    if (p.about) col.appendChild(text("p", "about", q(ctx, p.about)));
    col.appendChild(p.status === "approved"
      ? text("div", "pill approved", F.strings.fill(W.approvedOn, { date: F.strings.day(p.approved, p.language) }))
      : text("div", "pill draft", W.draft));

    var list = el("ol", "contents" + (count > 9 ? " tighter" : count > 6 ? " tight" : ""));
    var firstPage = {};
    ctx.plan.pages.forEach(function (pg) {
      if (pg.type === "screen" && !firstPage[pg.storyIndex]) firstPage[pg.storyIndex] = pg.number;
    });
    ctx.board.stories.forEach(function (story, i) {
      var li = el("li");
      li.appendChild(text("b", "", String(i + 1)));
      li.appendChild(text("span", "", story.title));
      li.appendChild(text("em", "", F.strings.screens(story.screens.length, p.language) + " · " + F.strings.fill(W.page, { n: firstPage[i] })));
      list.appendChild(li);
    });
    var stories = el("div", "covlist");
    stories.appendChild(text("div", "label", W.stories));
    stories.appendChild(list);
    col.appendChild(stories);
    place(ctx, fit(col, W.fitCover, p.line), page.text);

    var bits = [W.kinds[p.kind], "v" + p.version, F.strings.day(p.date, p.language),
      p.client && F.strings.fill(W.preparedFor, { t: p.client }), p.by && F.strings.fill(W.preparedBy, { t: p.by })];
    var lines = p.lines;
    place(ctx, fit(dotted("div", "meta", bits), W.fitMeta, lines.client || lines.by || p.line), page.meta);
  }

  function screenPage(ctx, page) {
    var p = ctx.board.project;
    var W = ctx.W;
    var story = page.story;
    var s = page.screen;
    var e = page.error;
    var item = e || s;
    if (e) ctx.sheet.classList.add("bad");

    var top = el("div", "top");
    top.appendChild(text("span", "label left", p.name + " · " + W.appFlow));
    top.appendChild(text("span", "label", F.strings.fill(W.storyLabel, { n: page.storyIndex + 1, t: story.title })));
    place(ctx, top, ctx.plan.top);

    // The left column: the number, the name, what the user sees and does, and where it goes.
    var col = el("div", "col");
    var num = text("p", "num", e ? "!" : String(s.number));
    num.appendChild(text("small", "", e ? F.strings.fill(W.after, { n: s.number }) : "/" + page.count));
    col.appendChild(num);
    if (e) col.appendChild(text("p", "warn", W.ifWrong));
    col.appendChild(text("h2", "", q(ctx, item.name)));
    var caption = F.model.splitCaption(item.caption, p.language);
    if (caption.sees) block(col, W.sees, q(ctx, caption.sees), "");
    if (caption.does) block(col, W.does, q(ctx, caption.does), "does");
    var note = noteFor(ctx, story, s, e);
    if (note) col.appendChild(text("p", "v note " + note.kind, note.text));
    if (!e && page.index === 0 && story.summary) block(col, W.theStory, q(ctx, story.summary), "summary");
    var where = { n: s.number, t: story.title, e: e ? e.name : "" };
    place(ctx, fit(col, F.strings.fill(e ? W.fitError : W.fitCol, where), item.line), page.col);

    device(ctx, p.kind, item, page.hero, "hero", { marks: true, error: !!e });

    if (page.strip) strip(ctx, page);
    else carousel(ctx, page);
    if (page.mini) device(ctx, "phone", { sketch: s.sketch, shot: s.phoneShot }, page.mini, "mini");

    footer(ctx, page.number);
  }

  function block(col, label, value, cls) {
    col.appendChild(text("p", "k" + (cls === "summary" ? " gap" : ""), label));
    col.appendChild(text("p", "v " + cls, value));
  }

  // Where this screen leads when no arrow of the strip can show it.
  function noteFor(ctx, story, s, e) {
    var W = ctx.W;
    function named(template, n) { return F.strings.fill(template, { n: n, t: q(ctx, story.screens[n - 1].name) }); }
    if (e) return e.to === "end" ? { kind: "end", text: W.endsHere } : { kind: "jump", text: named(W.backTo, e.to) };
    if (s.decision) return null;
    if (s.to === "end" || (s.to === null && s.number === story.screens.length)) return { kind: "end", text: W.storyEnds };
    if (s.to === null || s.to === s.number + 1) return null;
    return { kind: "jump", text: named(W.goesTo, s.to) };
  }

  // Wide screens: the story's screens as a small strip under the big one, the current one lit.
  function strip(ctx, page) {
    page.strip.forEach(function (t) {
      device(ctx, ctx.board.project.kind, t.screen, t.box, "thumb" + (t.on ? " on" : ""), { fill: true });
      place(ctx, text("p", "tn" + (t.on ? " on" : ""), t.screen.number + " · " + q(ctx, t.screen.name)), t.label);
      if (t.arrow) place(ctx, el("i", "arr sm"), t.arrow);
    });
  }

  // A phone: the screen before and the screen after, dimmed beside the big one; dots for the whole story.
  function carousel(ctx, page) {
    var hero = page.hero;
    var e = page.error;
    var midY = hero.y + hero.h / 2 - 9;
    function name(box, value, on) {
      place(ctx, text("p", "tn c" + (on ? " on" : ""), value), { x: box.x, y: page.names.y, w: box.w, h: page.names.h });
    }
    ["prev", "next"].forEach(function (key) {
      var side = page.sides[key];
      if (!side) return;
      device(ctx, "phone", side.screen, side.box, "side");
      name(side.box, side.screen.number + " · " + q(ctx, side.screen.name), false);
      var x = key === "prev" ? hero.x - L.SIDE.gap / 2 - 9 : hero.x + hero.w + L.SIDE.gap / 2 - 9;
      place(ctx, el("i", "arr"), { x: x, y: midY, w: 18, h: 18 });
    });
    name(hero, e ? q(ctx, e.name) : page.screen.number + " · " + q(ctx, page.screen.name), true);

    var dots = el("div", "dots");
    for (var i = 0; i < page.count; i++) dots.appendChild(el("i", i === page.index ? "on" : ""));
    place(ctx, dots, page.dots);

    if (page.back && typeof e.to === "number") {
      var back = text("p", "back", "↩ " + ctx.W.backToShort + " ");
      back.appendChild(text("b", "", e.to + " · " + q(ctx, page.story.screens[e.to - 1].name)));
      place(ctx, back, page.back);
    }
  }

  function footer(ctx, n, onMap) {
    var p = ctx.board.project;
    var W = ctx.W;
    var f = el("div", "foot");
    if (onMap) f.style.color = mapColour("muted");
    f.appendChild(dotted("span", "", [p.name, W.appFlow, "v" + p.version, p.status === "approved" ? W.approved : W.draft]));
    if (n === ctx.total) f.appendChild(text("span", "credit", W.madeWith));
    f.appendChild(text("span", "", F.strings.fill(W.pageOf, { n: n, m: ctx.total })));
    place(ctx, f, ctx.plan.foot);
  }

  // ---------- map and path check ----------

  function svg(tag, attrs, parent) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    parent.appendChild(node);
    return node;
  }

  function mapColour(name) { return "var(--map-" + name + ")"; }

  function flowPage(ctx, page) {
    var W = ctx.W.flow;
    var top = el("div", "top");
    var part = page.mapCount > 1 ? F.strings.fill(W.mapPage, { n: page.index + 1, m: page.mapCount }) : W.title;
    top.appendChild(text("span", "label left", ctx.board.project.name + " · " + ctx.W.appFlow));
    top.appendChild(text("span", "label", page.type === "flow-check" ? W.check : part));
    Array.from(top.children).forEach(function (label) { label.style.color = mapColour("muted"); });
    place(ctx, top, ctx.plan.top);

    var art = svg("svg", { width: L.PAGE.width, height: L.PAGE.height, viewBox: "0 0 1122 792",
      style: "position:absolute;inset:0;font-family:var(--font)" }, ctx.sheet);
    flowText(ctx, art, W.title, { x: 56, y: 75, w: 680, h: 37 }, { size: 30, weight: 800 });
    if (page.type === "flow-map") drawMap(ctx, art, page);
    if (page.cards) {
      drawFlowCards(ctx, art, page);
      drawPathCheck(ctx, art, page);
    }
    footer(ctx, page.number, true);
  }

  function flowBox(ctx, box) {
    return ctx.rtl ? { ...box, x: L.mirrorX(box.x, box.w) } : box;
  }

  function flowRect(parent, box, fill, stroke, radius) {
    return svg("rect", { x: box.x, y: box.y, width: box.w, height: box.h, rx: radius,
      fill: fill, stroke: stroke, "stroke-width": 1 }, parent);
  }

  function flowText(ctx, parent, value, room, options) {
    var center = options.center;
    var box = options.placed ? room : flowBox(ctx, room);
    var node = svg("text", {
      x: center ? box.x + box.w / 2 : ctx.rtl ? box.x + box.w : box.x,
      direction: ctx.rtl ? "rtl" : "ltr", "text-anchor": center ? "middle" : "start",
      "font-size": options.size || 14, "font-weight": options.weight || 600,
      fill: mapColour(options.color || "ink")
    }, parent);
    node.textContent = value;
    flowFits.push({ node: node, box: box, value: value, options: options,
      message: options.message || F.strings.fill(ctx.W.flow.fitMapText, { t: value }) });
  }

  function fitFlow(entry) {
    var node = entry.node;
    var options = entry.options;
    var box = entry.box;
    var words = entry.value.trim().split(/\s+/);
    var size = options.size || 14;
    var leading = options.leading || size * 1.22;
    var maxLines = Math.max(1, Math.floor(box.h / leading));
    var lines;
    var widths = options.diamond ? [box.w, box.w * 0.83, box.w * 0.67] : [box.w];
    for (var width of widths) {
      lines = [];
      var line = "";
      words.forEach(function (word) {
        var trial = line ? line + " " + word : word;
        node.textContent = trial;
        if (line && node.getComputedTextLength() > width && maxLines > 1) {
          lines.push(line);
          line = word;
        } else line = trial;
      });
      lines.push(line);
      if (lines.length > maxLines) continue;
      if (!options.diamond || lines.length === 1 || width <= box.w * (lines.length === 2 ? 0.84 : 0.68)) break;
    }
    var first = options.center ? box.y + (box.h - lines.length * leading) / 2 : box.y;
    node.textContent = "";
    var tooWide = lines.some(function (value, i) {
      var t = svg("tspan", { x: node.getAttribute("x"), y: first + i * leading + size * 0.88 }, node);
      t.textContent = value;
      return t.getComputedTextLength() > box.w + 0.5;
    });
    return tooWide || lines.length > maxLines ? { line: options.line || 0, text: entry.message } : null;
  }

  function drawMap(ctx, art, page) {
    var W = ctx.W.flow;
    var scale = page.scale;
    var arrow = {};
    var defs = svg("defs", {}, art);
    ["normal", "wrong"].forEach(function (kind) {
      var color = kind === "wrong" ? "var(--red)" : "var(--mute)";
      var id = "map-arrow-" + page.number + "-" + kind;
      var marker = svg("marker", { id: id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6,
        markerHeight: 6, orient: "auto" }, defs);
      svg("path", { d: "M1 1 L9 5 L1 9", fill: "none", stroke: color, "stroke-width": 1.45 }, marker);
      arrow[kind] = { color: color, ref: "url(#" + id + ")" };
    });
    page.links.forEach(function (edge) {
      var style = arrow[edge.kind === "wrong" ? "wrong" : "normal"];
      svg("polyline", { points: edge.points.map((p) => p.x + "," + p.y).join(" "),
        fill: "none", stroke: style.color, "stroke-width": 1.4 * scale, "stroke-linejoin": "round",
        "marker-end": style.ref }, art);
      if (edge.labelBox) flowText(ctx, art, edge.label, edge.labelBox, { placed: true, center: true, size: 10.5 * scale,
        color: edge.kind, line: edge.line, weight: 800 });
    });
    page.rows.forEach(function (row) {
      var badge = 19 * scale;
      var badgeX = ctx.rtl ? row.x - badge : row.x;
      flowRect(art, { x: badgeX, y: row.y - 14 * scale, w: badge, h: badge }, mapColour("oval-fill"), mapColour("oval-line"), badge / 2);
      flowText(ctx, art, String(row.n), { x: badgeX, y: row.y - 14 * scale, w: badge, h: badge },
        { placed: true, center: true, size: 11 * scale, weight: 800, color: "oval-text" });
      var inset = 27 * scale;
      var heading = row.part ? F.strings.fill(W.continued, { t: row.title }) : row.title;
      flowText(ctx, art, heading, { x: ctx.rtl ? row.x - row.w : row.x + inset, y: row.y - 14 * scale,
        w: row.w - inset, h: 20 * scale }, { placed: true, size: 15 * scale, weight: 800, line: row.line });
    });
    page.nodes.forEach(function (node) {
      var box = node.box;
      var isOval = node.type === "start" || node.type === "end";
      var type = { start: "oval", end: "oval" }[node.type] || node.type;
      var caption = isOval ? W[node.type] : q(ctx, node.text);
      if (type === "continuation") {
        flowRect(art, box, mapColour("oval-fill"), mapColour("oval-line"), 5 * scale);
        flowText(ctx, art, caption, box, { placed: true, center: true, size: 10 * scale, color: "oval-text", weight: 800 });
        return;
      }
      flowShape(art, box, type, scale);
      var diamond = type === "decision";
      var pad = (diamond ? 11 : 6) * scale;
      flowText(ctx, art, caption, { x: box.x + pad, y: box.y, w: box.w - pad * 2, h: box.h },
        { placed: true, center: true, diamond: diamond, size: (node.small ? 11 : diamond ? 12 : 13) * scale,
          weight: 700, color: type + "-text", line: node.line });
    });
    drawFlowKey(ctx, art, page.cards ? 691 : 705);
    if (page.nodes.some((node) => node.type === "continuation")) {
      flowText(ctx, art, W.continuationKey, { x: 56, y: 724, w: 640, h: 17 }, { size: 11, color: "muted" });
    }
  }

  function flowShape(parent, box, type, scale) {
    var fill = mapColour(type + "-fill");
    var stroke = mapColour(type + "-line");
    if (type !== "decision") return flowRect(parent, box, fill, stroke, type === "oval" ? box.h / 2 : 8 * scale);
    var x = box.x, y = box.y, w = box.w, h = box.h;
    return svg("polygon", { points: [[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]].join(" "),
      fill: fill, stroke: stroke }, parent);
  }

  function drawFlowKey(ctx, art, y) {
    var W = ctx.W.flow;
    var x = 56;
    ["oval", "step", "decision", "done", "wrong"].forEach(function (type, i) {
      var width = i === 4 ? 191 : 114;
      flowShape(art, flowBox(ctx, { x: x, y: y, w: 15, h: 13 }), type, 0.5);
      flowText(ctx, art, W[type], { x: x + 22, y: y - 1, w: width - 23, h: 23 }, { size: 11, color: "muted" });
      x += width;
    });
  }

  function drawFlowCards(ctx, art, page) {
    var W = ctx.W.flow;
    var compact = page.type === "flow-map";
    var w = compact ? 216 : 328;
    var h = compact ? 63 : 112;
    ["goal", "starts", "ends"].forEach(function (key, i) {
      var x = 56 + (w + 13) * i;
      var y = 119;
      flowRect(art, flowBox(ctx, { x: x, y: y, w: w, h: h }), mapColour("step-fill"), mapColour("step-line"), 9);
      flowText(ctx, art, W[key], { x: x + 13, y: y + 8, w: w - 26, h: 15 }, { size: 10, weight: 800, color: "step-text" });
      flowText(ctx, art, q(ctx, page.cards[key]), { x: x + 13, y: y + 22, w: w - 26, h: h - 25 },
        { size: compact ? 11.5 : 15, leading: compact ? 12.2 : 18, weight: 700, color: "step-text", message: W.fitCards });
    });
  }

  function drawPathCheck(ctx, art, page) {
    var W = ctx.W.flow;
    var compact = page.type === "flow-map";
    var frame = compact ? { x: 752, y: 119, w: 314, h: 602 } : { x: 56, y: 252, w: 1010, h: 469 };
    var x = frame.x + 15, y = frame.y + 16;
    flowRect(art, flowBox(ctx, frame), mapColour("panel"), mapColour("panel-line"), 12);
    flowText(ctx, art, W.check, { x: x, y: y, w: frame.w - 30, h: 28 }, { size: 20, weight: 800, color: "panel-ink" });
    var counts = { steps: flowCount(W.stepCount, page.counts.steps), decisions: flowCount(W.decisionCount, page.counts.decisions),
      wrongWays: flowCount(W.wrongCount, page.counts.wrongWays) };
    flowText(ctx, art, F.strings.fill(W.counts, counts), { x: x, y: y + 32, w: frame.w - 30, h: 25 },
      { size: 12, weight: 600, color: "panel-muted" });
    var width = compact ? frame.w - 30 : (frame.w - 43) / 2;
    page.checks.forEach(function (check, i) {
      var row = compact ? i : Math.floor(i / 2);
      var col = compact ? 0 : i % 2;
      var gap = compact ? 9 : 12;
      var tall = compact ? 131 : 218;
      var short = compact ? 118 : 150;
      var y = frame.y + 76 + (row ? tall + gap + (row - 1) * (short + gap) : 0);
      var x = frame.x + 15 + col * (width + gap);
      var height = row ? short : tall;
      var color = check.status === "pass" ? "panel-first" : check.status === "fail" ? "panel-second" : "panel-muted";
      flowRect(art, flowBox(ctx, { x: x, y: y, w: width, h: height }), mapColour("panel"), mapColour("panel-line"), 8);
      flowStatus(ctx, art, check.status, color, x + 12, y + 14);
      flowText(ctx, art, W.questions[i], { x: x + 36, y: y + 12, w: width - 48, h: 38 },
        { size: compact ? 13 : 15, weight: 800, color: "panel-ink", message: W.fitCheck });

      var detail = check.details.map(function (info) {
        return F.strings.fill(W[info.key], { ...info, count: flowCount(W.stepCount, info.n) });
      });
      if (check.status === "fail" && detail.length > 1) {
        detail = [detail[0], F.strings.fill(W.more, { n: detail.length - 1 })];
      }
      var columns = !compact && detail.length > 6 ? 2 : 1;
      var perColumn = Math.ceil(detail.length / columns);
      var textWidth = (width - 28) / columns - (columns === 2 ? 8 : 0);
      var detailHeight = Math.min(compact ? 50 : 70, (height - 47) / Math.max(perColumn, 1));
      detail.forEach(function (value, j) {
        flowText(ctx, art, value, { x: x + 14 + Math.floor(j / perColumn) * (textWidth + 16), y: y + 45 + (j % perColumn) * detailHeight,
          w: textWidth, h: detailHeight }, { size: compact ? 11.5 : 12.5, leading: 13.5, color: "panel-ink", message: W.fitCheck });
      });
    });
  }

  function flowCount(forms, n) {
    return F.strings.fill(forms[n === 1 ? 0 : 1], { n: n });
  }

  function flowStatus(ctx, art, status, color, x, y) {
    var p = flowBox(ctx, { x: x, y: y, w: 15, h: 15 });
    var g = svg("g", { transform: "translate(" + p.x + "," + p.y + ")", "aria-hidden": "true" }, art);
    var path = { pass: "M2 8 L6 12 L13 3", fail: "M3 3 L12 12 M12 3 L3 12", skip: "M3 8 L12 8" };
    svg("path", { d: path[status], fill: "none", stroke: mapColour(color), "stroke-width": 2, "stroke-linecap": "round",
      "stroke-linejoin": "round" }, g);
  }

  // ---------- device frames, pictures, sketches, markers ----------

  /* One device frame in its room. item is a screen or an "if it goes wrong" line ({ sketch, shot, tap, look }).
     o.fill: take the whole room and crop the picture to it (the strip); o.marks: draw the tap and look points. */
  function device(ctx, kind, item, room, cls, o) {
    o = o || {};
    var f = el("div", "dev " + kind + " " + cls);
    var bar = L.SHAPE[kind].bar && !o.fill ? f.appendChild(el("div", "bar")) : null;
    var screen = f.appendChild(el("div", "screen"));
    screen.appendChild(drawSketch(o.error || item.sketch === undefined ? "error" : item.sketch));
    var entry = { el: f, bar: bar, screen: screen, kind: kind, room: room, fill: !!o.fill, img: null, marks: null, rtl: ctx.rtl };
    if (item.shot) addShot(ctx, entry, item.shot);
    if (o.marks && entry.img) {
      entry.marks = f.appendChild(el("div", "marks"));
      ["tap", "look"].forEach(function (key) { if (item[key]) entry.marks.appendChild(marker(ctx, key, item[key])); });
    }
    frames.push(entry);
    size(entry);
    ctx.sheet.appendChild(f);
    return f;
  }

  function addShot(ctx, entry, src) {
    function missing() {
      entry.img = null;
      if (entry.marks) entry.marks.remove();
      if (!entry.fill) entry.el.appendChild(text("div", "missing", ctx.W.shotMissing));
    }
    // Each folder and file name goes to the browser as a name, never as part of a web address ("&", "+" and "'"
    // stay letters of the name). model.js already refuses anything but a plain path below the page; the check
    // after it keeps the browser to that folder too.
    var url = src.split("/").map(encodeURIComponent).join("/");
    var folder = new URL(".", document.baseURI).href;
    if (new URL(url, document.baseURI).href.indexOf(folder) !== 0) return missing();
    var crop = ctx.board.project.crop;
    var kept = 1 - crop.top - crop.bottom;
    var img = new Image();
    img.className = "shot";
    img.alt = "";
    // The cut-off top and bottom hang outside the screen, which hides them.
    img.style.top = (-crop.top / kept * 100) + "%";
    img.style.height = (100 / kept) + "%";
    img.addEventListener("error", function () {
      img.remove();
      entry.el.classList.remove("has-shot");
      missing();
    });
    img.src = url;
    entry.img = img;
    entry.kept = kept;
    entry.screen.appendChild(img);
    entry.el.classList.add("has-shot");
  }

  /* Gives a frame its place: the whole room (the strip), or the largest frame of the picture's own shape that
     fits the room. Called when drawn, and again once the pictures have loaded and their shapes are known. */
  function size(entry) {
    var shape = L.SHAPE[entry.kind];
    var img = entry.img;
    var aspect = img && img.naturalWidth ? img.naturalWidth / (img.naturalHeight * entry.kept) : shape.aspect;
    var r = entry.fill ? { x: entry.room.x, y: entry.room.y, w: entry.room.w, h: entry.room.h, bar: 0 }
      : L.fitFrame(entry.room, aspect, shape.bar);
    var s = entry.el.style;
    s.left = (entry.rtl ? L.mirrorX(r.x, r.w) : r.x) + "px";
    s.top = r.y + "px";
    s.width = r.w + "px";
    s.height = r.h + "px";
    s.setProperty("--w", r.w + "px");
    if (entry.bar) entry.bar.style.height = r.bar + "px";
    entry.screen.style.top = r.bar + "px";
    if (entry.marks) entry.marks.style.top = r.bar + "px";
  }

  // A tap point (solid) or a "look here" point (dashed ring) on the picture, with its short label.
  function marker(ctx, key, mark) {
    var crop = ctx.board.project.crop;
    var y = Math.max(0, Math.min(1, (mark.y - crop.top) / (1 - crop.top - crop.bottom)));
    var side = L.markSide(mark.x, y);
    var ring = el("i", "ring" + (key === "look" ? " see" : ""));
    ring.style.left = (mark.x * 100) + "%";
    ring.style.top = (y * 100) + "%";
    if (mark.label) ring.appendChild(text("span", "tag " + side.v + " " + side.h, q(ctx, mark.label)));
    return ring;
  }

  // Each sketch is a few grey blocks and one button in the app's colour, drawn by frameflow.css.
  var SKETCH = {
    form: ["field", "field", "button"],
    list: ["row", "row", "row", "row"],
    grid: ["banner", "card", "card", "card", "card"],
    detail: ["picture", "line", "line short", "button"],
    done: ["tick", "line short"],
    message: ["line", "line", "line short", "line", "button"],
    blank: [],
    error: ["alert", "button"]
  };

  function drawSketch(kind) {
    var wrap = el("div", "sketch " + kind);
    (SKETCH[kind] || []).forEach(function (part) { wrap.appendChild(el("div", "b " + part)); });
    return wrap;
  }

  // ---------- finishing: fonts, pictures, the fit check ----------

  function finish() {
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var pictures = Array.prototype.map.call(document.querySelectorAll("img.shot"), function (img) {
      return img.complete ? Promise.resolve() : new Promise(function (done) {
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      });
    });
    Promise.all([fonts].concat(pictures)).then(function () {
      frames.forEach(size);
      var problems = flowFits.map(fitFlow).filter(Boolean);
      Array.prototype.forEach.call(document.querySelectorAll("[data-fit]"), function (node) {
        if (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1) {
          problems.push({ line: Number(node.getAttribute("data-fit-line")) || 0, text: node.getAttribute("data-fit") });
        }
      });
      if (problems.length) return refuse(problems);
      document.documentElement.setAttribute("data-frameflow", "ready");
    });
  }

  function refuse(problems) {
    var book = document.querySelector("main.book");
    if (book) book.remove();
    var hint = document.querySelector(".print-hint");
    if (hint) hint.remove();
    document.documentElement.dir = words.dir;
    document.documentElement.lang = words.lang;
    var box = el("section", "problems");
    box.appendChild(text("h1", "", words.cantDraw));
    box.appendChild(text("p", "", words.fixThese));
    var list = el("ol");
    problems.forEach(function (pr) {
      list.appendChild(text("li", "", (pr.line ? F.strings.fill(words.line, { n: pr.line }) : "") + pr.text));
    });
    box.appendChild(list);
    document.body.appendChild(box);
    window.frameflowProblems = problems;
    document.documentElement.setAttribute("data-frameflow", "refused");
  }

  // ---------- small helpers ----------

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function q(ctx, value) { return F.strings.quotes(value, ctx.board.project.language); }

  function text(tag, cls, value) {
    var n = el(tag, cls);
    n.textContent = value;
    return n;
  }

  // Short pieces in a row with a dot between them. Each piece keeps its own reading direction, so "v1" and a
  // date stay in place inside an Arabic line.
  function dotted(tag, cls, pieces) {
    var n = el(tag, cls);
    var row = el("span");
    pieces.filter(Boolean).forEach(function (piece, i) {
      if (i) row.appendChild(document.createTextNode(" · "));
      row.appendChild(text("bdi", "", piece));
    });
    n.appendChild(row);
    return n;
  }

  function fit(node, message, line) {
    node.setAttribute("data-fit", message);
    if (line) node.setAttribute("data-fit-line", line);
    return node;
  }

  function place(ctx, node, r) {
    node.style.left = (ctx.rtl ? L.mirrorX(r.x, r.w) : r.x) + "px";
    node.style.top = r.y + "px";
    node.style.width = r.w + "px";
    node.style.height = r.h + "px";
    ctx.sheet.appendChild(node);
    return node;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
