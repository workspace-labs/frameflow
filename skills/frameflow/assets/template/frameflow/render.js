/* frameflow: draws the pages. The only file that touches the page.
   Reads the text copy from <script type="text/markdown" id="app-flow">, asks model.js to read it and
   layout.js to place it, then builds the pages. When something is wrong, or a word does not fit, it shows
   the numbered problems instead of a messy page.
   When finished it sets <html data-frameflow="ready"> or "refused", so an agent can check before printing. */
(function () {
  "use strict";

  var F = window.Frameflow;
  var SVG = "http://www.w3.org/2000/svg";
  // The cover's approved boxes. Short covers sit exactly here; a long list or long details push the blocks
  // above them upward, as far as heroTopMin, instead of running off the page. A box that grows keeps
  // `headroom` above its first line for Arabic marks.
  var COVER = { heroTopMin: 100, heroTop: 250, heroH: 316, labelTop: 596, listTop: 622, listBottom: 922,
    metaTop: 944, metaBottom: 1074, headroom: 6 };
  var coverParts = null;
  var words = F.strings.words("en");

  function start() {
    var source = document.getElementById("app-flow");
    // The text starts on the line after the opening tag; drop that first line break so line numbers match app-flow.md.
    var result = F.model.parse(source ? source.textContent.replace(/^\r?\n/, "") : "");
    words = F.strings.words(String(result.storyboard.project.settings.language || "en").toLowerCase());
    if (!result.ok) return refuse(result.problems);
    try {
      draw(result.storyboard);
    } catch (err) {
      return refuse([{ line: 0, text: words.notDrawn + err.message }]);
    }
    finish();
  }

  // ---------- the document ----------

  function draw(board) {
    var p = board.project;
    var rtl = p.language === "ar";
    var W = words;
    var plan = F.layout.plan(board);
    var total = plan.pages.length;
    var html = document.documentElement;

    html.lang = p.language;
    html.dir = rtl ? "rtl" : "ltr";
    document.title = p.name + " · " + W.appFlow;

    var book = el("main", "book");
    plan.pages.forEach(function (page, i) {
      var sheet = el("section", "page");
      sheet.appendChild(el("div", "topline"));
      var ctx = { board: board, plan: plan, W: W, rtl: rtl, sheet: sheet, total: total };
      if (page.type === "cover") cover(ctx);
      else storyPage(ctx, page, plan.pages[i + 1]);
      if (page.type !== "cover") footer(ctx, page.number, page.number === total);
      book.appendChild(sheet);
    });
    document.body.appendChild(text("div", "print-hint", W.printHint));
    document.body.appendChild(book);
  }

  function cover(ctx) {
    var p = ctx.board.project;
    var W = ctx.W;
    var s = ctx.sheet;
    s.classList.add("cover");
    if (p.by) place(ctx, text("div", "brand", p.by), { x: 56, y: 44, w: 681, h: 24 });

    // The name, the line about it and the status flow as one block that sits just above the stories.
    var hero = el("div", "hero");
    hero.appendChild(text("div", "label", W.appFlow));
    hero.appendChild(accented("h1", "title", p.name));
    if (p.about) hero.appendChild(text("p", "about", p.about));
    hero.appendChild(p.status === "approved"
      ? text("div", "pill approved", F.strings.fill(W.approvedOn, { date: F.strings.day(p.approved, p.language) }))
      : text("div", "pill draft", W.draft));
    place(ctx, fit(hero, W.fitHero, p.line), { x: 56, y: COVER.heroTop, w: 681, h: COVER.heroH });

    var label = place(ctx, text("div", "label", W.stories), { x: 56, y: COVER.labelTop, w: 681, h: 16 });
    var list = el("ol", "contents" + (ctx.board.stories.length > 9 ? " tight" : ""));
    var firstPage = {};
    ctx.plan.pages.forEach(function (pg) {
      if (pg.type === "story" && !firstPage[pg.storyIndex]) firstPage[pg.storyIndex] = pg.number;
    });
    ctx.board.stories.forEach(function (story, i) {
      var li = el("li");
      li.appendChild(text("span", "n", String(i + 1)));
      li.appendChild(text("span", "t", story.title));
      li.appendChild(text("span", "c", F.strings.screens(story.screens.length, p.language)));
      li.appendChild(text("span", "pg", F.strings.fill(W.page, { n: firstPage[i] })));
      list.appendChild(li);
    });
    var lastStory = ctx.board.stories[ctx.board.stories.length - 1];
    place(ctx, fit(list, W.fitStories, lastStory.line), { x: 56, y: COVER.listTop, w: 681, h: COVER.listBottom - COVER.listTop });

    var meta = el("dl", "meta");
    function row(label, value) {
      if (!value) return;
      meta.appendChild(text("dt", "", label));
      meta.appendChild(text("dd", "", value));
    }
    row(W.preparedFor, p.client);
    row(W.preparedBy, p.by);
    row(W.kind, W.kinds[p.kind]);
    row(W.version, "v" + p.version);
    row(W.date, F.strings.day(p.date, p.language));
    var lines = p.lines;
    var metaLine = lines.client || lines.by || lines.kind || lines.version || lines.date;
    place(ctx, fit(meta, W.fitMeta, metaLine), { x: 56, y: COVER.metaTop, w: 681, h: COVER.metaBottom - COVER.metaTop });
    coverParts = { hero: hero, label: label, list: list, meta: meta, line: p.line };
  }

  /* After the fonts load: the details and the list keep their approved boxes when they fit, and otherwise
     grow upward from the cover's bottom edge, pushing the name block up. Every box ends up at least as tall as
     what is in it, so nothing is clipped at any edge. Refuses only when the name block runs out of room. */
  function settleCover() {
    var c = coverParts;
    if (!c) return [];
    var metaH = Math.max(COVER.metaBottom - COVER.metaTop, natural(c.meta) + COVER.headroom);
    var metaTop = COVER.metaBottom - metaH;
    var listBottom = Math.min(COVER.listBottom, metaTop - (COVER.metaTop - COVER.listBottom));
    var listTop = Math.min(COVER.listTop, listBottom - natural(c.list));
    var labelTop = listTop - (COVER.listTop - COVER.labelTop);
    var heroBottom = labelTop - (COVER.labelTop - COVER.heroTop - COVER.heroH);
    var room = heroBottom - COVER.heroTopMin;
    var heroH = natural(c.hero) + COVER.headroom;
    setBox(c.meta, metaTop, metaH);
    setBox(c.list, listTop, listBottom - listTop);
    setBox(c.label, labelTop, 16);
    if (heroH > room) {
      setBox(c.hero, COVER.heroTopMin, Math.max(0, room));
      return [{ line: c.line, text: words.fitCover }];
    }
    heroH = Math.max(heroH, Math.min(COVER.heroH, room));
    setBox(c.hero, heroBottom - heroH, heroH);
    return [];
  }

  function natural(node) {
    node.style.height = "auto";
    return node.getBoundingClientRect().height;
  }

  function setBox(node, top, height) {
    node.style.top = top + "px";
    node.style.height = height + "px";
  }

  function storyPage(ctx, page, nextPage) {
    var W = ctx.W;
    var story = page.story;
    var stories = ctx.board.stories.length;
    var label = F.strings.fill(W.story, { n: page.storyIndex + 1, m: stories });
    if (page.parts > 1) label += " · " + F.strings.fill(W.part, { n: page.part, m: page.parts });

    place(ctx, text("div", "label", label), { x: 56, y: 44, w: 681, h: 16 });
    place(ctx, fit(accented("h2", "story-title", story.title), F.strings.fill(W.fitTitle, { t: story.title }), story.line), { x: 56, y: 60, w: 681, h: 48 });
    if (story.summary) place(ctx, fit(text("p", "summary", story.summary), F.strings.fill(W.fitSummary, { t: story.title }), story.summaryLine), { x: 56, y: 110, w: 681, h: 40 });

    var svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("class", "links");
    svg.setAttribute("width", ctx.plan.page.width);
    svg.setAttribute("height", ctx.plan.page.height);
    svg.innerHTML = '<defs>' +
      '<marker id="a-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" class="head-blue"/></marker>' +
      '<marker id="a-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" class="head-red"/></marker>' +
      '</defs>';
    ctx.sheet.appendChild(svg);

    var continues = nextPage && nextPage.type === "story" && nextPage.storyIndex === page.storyIndex;
    var rows = page.rows;
    rows.forEach(function (row, r) {
      row.links.forEach(function (link) { line(ctx, svg, link); });
      row.cells.forEach(function (cell, c) {
        var isLastOnPage = r === rows.length - 1 && c === row.cells.length - 1;
        drawCell(ctx, story, cell, row, c, isLastOnPage && continues);
      });
    });
  }

  function drawCell(ctx, story, cell, row, col, continuesNextPage) {
    var W = ctx.W;
    var p = ctx.board.project;
    var s = cell.screen;
    var where = { n: s.number, t: story.title };

    place(ctx, frame(ctx, p.kind, s.sketch, { number: s.number, shot: s.shot }), cell.frame);
    if (cell.mini) place(ctx, frame(ctx, "phone mini", s.sketch, { shot: s.phoneShot }), cell.mini);

    var cap = el("div", "cap");
    cap.appendChild(text("div", "name", s.name));
    cap.appendChild(text("p", "text", s.caption));
    var note = noteFor(W, story, s, row, col, continuesNextPage);
    if (note) cap.appendChild(text("div", "note " + note.kind, note.text));
    place(ctx, fit(cap, F.strings.fill(W.fitCaption, where), s.line), cell.caption);

    cell.errors.forEach(function (e) {
      place(ctx, frame(ctx, p.kind, "error", { error: true, shot: e.error.shot, small: true }), e.frame);
      var box = el("div", "etext");
      box.appendChild(text("div", "name", e.error.name));
      box.appendChild(text("p", "text", e.error.caption));
      box.appendChild(text("div", "note " + (e.error.to === "end" ? "end" : "jump"),
        e.error.to === "end" ? W.endsHere : F.strings.fill(W.backTo, { n: e.error.to })));
      place(ctx, fit(box, F.strings.fill(W.fitError, { n: where.n, t: where.t, e: e.error.name }), e.error.line), e.text);
    });
  }

  function noteFor(W, story, s, row, col, continuesNextPage) {
    if (s.to === "end") return { kind: "end", text: W.endsHere };
    if (s.to === null && s.number === story.screens.length) return { kind: "end", text: W.end };
    if (F.layout.goesToNext(s, story)) {
      if (continuesNextPage) return { kind: "jump", text: W.continues };
      return null; // an arrow shows it
    }
    return { kind: "jump", text: F.strings.fill(W.goesTo, { n: s.to }) };
  }

  function footer(ctx, n, isLast) {
    var p = ctx.board.project;
    var W = ctx.W;
    var status = p.status === "approved" ? W.approved : W.draft;
    var f = el("div", "footer");
    f.appendChild(text("span", "left", p.name + " · " + W.appFlow + " · v" + p.version + " · " + status));
    f.appendChild(text("span", "right", F.strings.fill(W.pageOf, { n: n, m: ctx.total })));
    place(ctx, f, { x: 56, y: 1070, w: 681, h: 22 });
    if (isLast) place(ctx, text("div", "credit", W.madeWith), { x: 56, y: 1096, w: 681, h: 14 });
  }

  // ---------- frames and sketches ----------

  function frame(ctx, kind, sketch, o) {
    var f = el("div", "frame " + kind + (o.error ? " err" : "") + (o.small ? " small" : ""));
    var screen = el("div", "screen");
    screen.appendChild(drawSketch(sketch));
    f.appendChild(screen);
    if (o.shot) addShot(ctx, f, screen, o.shot);
    if (o.number) f.appendChild(text("div", "num", String(o.number)));
    return f;
  }

  function addShot(ctx, frameEl, screen, src) {
    function missing() { frameEl.appendChild(text("div", "missing", ctx.W.shotMissing)); }
    // Each folder and file name goes to the browser as a name, never as part of a web address ("&", "+" and "'"
    // stay letters of the name). model.js already refuses anything but a plain path below the page; the check
    // after it keeps the browser to that folder too.
    var url = src.split("/").map(encodeURIComponent).join("/");
    var folder = new URL(".", document.baseURI).href;
    if (new URL(url, document.baseURI).href.indexOf(folder) !== 0) return missing();
    var img = new Image();
    img.className = "shot";
    img.alt = "";
    img.addEventListener("error", function () {
      img.remove();
      missing();
    });
    img.src = url;
    screen.appendChild(img);
    frameEl.classList.add("has-shot");
  }

  // Each sketch is a few grey blocks and one blue button, drawn by frameflow.css.
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

  // ---------- lines ----------

  function line(ctx, svg, link) {
    var pts = link.points.map(function (pt) { return [ctx.rtl ? ctx.plan.page.width - pt[0] : pt[0], pt[1]]; });
    var path = document.createElementNS(SVG, "path");
    path.setAttribute("d", "M" + pts.map(function (pt) { return pt[0] + "," + pt[1]; }).join(" L"));
    path.setAttribute("class", "link " + link.type);
    if (link.type === "next" || link.type === "turn") path.setAttribute("marker-end", "url(#a-blue)");
    if (link.type === "error") path.setAttribute("marker-end", "url(#a-red)");
    svg.appendChild(path);
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
      var problems = settleCover();
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

  function text(tag, cls, value) {
    var n = el(tag, cls);
    n.textContent = value;
    return n;
  }

  // The last word drawn in blue, like workflow-project's titles.
  function accented(tag, cls, value) {
    var n = el(tag, cls);
    var words = value.trim().split(/\s+/);
    var last = words.pop();
    if (words.length) n.appendChild(document.createTextNode(words.join(" ") + " "));
    n.appendChild(text("span", "accent", last));
    return n;
  }

  function fit(node, message, line) {
    node.setAttribute("data-fit", message);
    if (line) node.setAttribute("data-fit-line", line);
    return node;
  }

  function place(ctx, node, r) {
    var x = ctx.rtl ? ctx.plan.page.width - r.x - r.w : r.x;
    node.style.left = x + "px";
    node.style.top = r.y + "px";
    node.style.width = r.w + "px";
    node.style.height = r.h + "px";
    ctx.sheet.appendChild(node);
    return node;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
