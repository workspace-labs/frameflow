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
    var plan = L.plan(board);
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
      else screenPage(ctx, page);
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
    html.classList.toggle("dark", t.dark);
  }

  function cover(ctx, page) {
    var p = ctx.board.project;
    var W = ctx.W;
    ctx.sheet.classList.add("cover");

    var first = ctx.board.stories[0].screens[0];
    device(ctx, p.kind, first, page.device, "tilt");

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

  function footer(ctx, n) {
    var p = ctx.board.project;
    var W = ctx.W;
    var f = el("div", "foot");
    f.appendChild(dotted("span", "", [p.name, W.appFlow, "v" + p.version, p.status === "approved" ? W.approved : W.draft]));
    if (n === ctx.total) f.appendChild(text("span", "credit", W.madeWith));
    f.appendChild(text("span", "", F.strings.fill(W.pageOf, { n: n, m: ctx.total })));
    place(ctx, f, ctx.plan.foot);
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
      var problems = [];
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
