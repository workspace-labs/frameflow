/* frameflow: turns a read storyboard into pages and boxes, in CSS pixels on an A4 page lying on its side.
   One screen a page, shown big; beside it the number and what the user sees and does; under it the story's
   other screens as a small strip (a phone shows the screen before and the screen after instead).
   Pure numbers: no page access, so Node's tests can check every position.
   Sizes here are part of the approved look (Cinema, 2026-11-11); change them only with the owner's yes. */
(function (root) {
  "use strict";

  // A4 on its side at 96 CSS pixels per inch, a pixel or two short each way so a page never spills onto a second
  // sheet (Safari's print rounds the sheet down to just under 793).
  var PAGE = { width: 1122, height: 792 };
  var TOP = { x: 56, y: 38, w: 1010, h: 16 };     // the two small labels: the project, and the story
  var FOOT = { x: 56, y: 748, w: 1010, h: 24 };
  var COL = { x: 56, y: 84, w: 238, h: 650 };     // the number, the screen's name, Sees and Does

  // Wide screens (tablet, desktop, website): the big screen's room, and the strip under it.
  var HERO = { x: 322, y: 96, w: 744, h: 465 };
  var STRIP = { y: 598, step: 156, w: 120, h: 75, max: 5, labelY: 680, labelH: 16, labelW: 146 };
  // A website's phone version: a small phone over the big screen's lower corner.
  var MINI = { x: 990, y: 367, w: 96, h: 208 };

  // A phone: the big phone in the middle, the screen before and the screen after smaller beside it.
  var PHONE = { x: 573, y: 84, w: 250, h: 542 };
  var SIDE = { w: 180, h: 390, gap: 44 };
  var NAMES = { y: 642, h: 16 };
  var DOTS = { x: 330, y: 686, w: 736, h: 4 };
  var BACK = { x: 867, y: 330, w: 199, h: 64 };   // "back to 4 · Pay", where the next phone would be

  var COVER = {
    text: { x: 56, y: 84, w: 400, h: 630 },
    meta: { x: 56, y: 728, w: 1010, h: 38 },
    wide: { x: 480, y: 150, w: 800, h: 500 },     // runs off the page's right edge on purpose
    phone: { x: 690, y: 112, w: 262, h: 568 }
  };

  // A frame's screen, width over height, when there is no picture to take the shape from; and how tall a
  // desktop window's or a browser's top bar is, as a share of the frame's width.
  var SHAPE = {
    phone:   { aspect: 250 / 542, bar: 0 },
    tablet:  { aspect: 1.6, bar: 0 },
    desktop: { aspect: 744 / 439, bar: 26 / 744 },
    website: { aspect: 744 / 439, bar: 26 / 744 }
  };

  /* The largest frame of this shape that fits the room, centred in it.
     aspect is the screen's width over its height; the bar (if any) sits above the screen. */
  function fitFrame(room, aspect, bar) {
    var w = Math.min(room.w, room.h / (1 / aspect + (bar || 0)));
    var barH = w * (bar || 0);
    var h = w / aspect + barH;
    return { x: room.x + (room.w - w) / 2, y: room.y + (room.h - h) / 2, w: w, h: h, bar: barH };
  }

  // Which screens the strip shows: up to `max`, keeping the current one in view (as near the middle as it can be).
  function windowOf(count, index, max) {
    var size = Math.min(count, max);
    var start = Math.max(0, Math.min(index - Math.floor(size / 2), count - size));
    var out = [];
    for (var i = 0; i < size; i++) out.push(start + i);
    return out;
  }

  // Where a marker's label sits: under the point, or over it near the screen's bottom; running toward the middle.
  function markSide(x, y) {
    return { v: y > 0.75 ? "up" : "down", h: x > 0.5 ? "left" : "right" };
  }

  /* The whole document: a cover, then every screen on its own page, each "if it goes wrong" on the page after
     its screen. Returns { kind, page, pages: [ cover | screen page ] }. */
  function plan(board) {
    var kind = board.project.kind;
    if (!SHAPE[kind]) throw new Error("layout: unknown kind " + kind);
    var phone = kind === "phone";
    var pages = [{ type: "cover", text: COVER.text, meta: COVER.meta, device: phone ? COVER.phone : COVER.wide }];

    board.stories.forEach(function (story, storyIndex) {
      story.screens.forEach(function (screen, index) {
        var base = { type: "screen", story: story, storyIndex: storyIndex, screen: screen, index: index, count: story.screens.length };
        pages.push(place(base, null, phone, board.project.phoneVersion));
        screen.errors.forEach(function (error) { pages.push(place(base, error, phone, board.project.phoneVersion)); });
      });
    });

    pages.forEach(function (p, i) { p.number = i + 1; });
    return { kind: kind, page: PAGE, top: TOP, foot: FOOT, pages: pages };
  }

  function place(base, error, phone, phoneVersion) {
    var screens = base.story.screens;
    var p = { error: error, col: COL };
    Object.keys(base).forEach(function (k) { p[k] = base[k]; });

    if (phone) {
      p.hero = PHONE;
      var sideY = PHONE.y + (PHONE.h - SIDE.h) / 2;
      // An "if it goes wrong" page shows its own screen dimmed before it, and the way back after it.
      var before = error ? base.screen : screens[base.index - 1];
      var after = error ? null : screens[base.index + 1];
      p.sides = {
        prev: before ? { screen: before, box: { x: PHONE.x - SIDE.gap - SIDE.w, y: sideY, w: SIDE.w, h: SIDE.h } } : null,
        next: after ? { screen: after, box: { x: PHONE.x + PHONE.w + SIDE.gap, y: sideY, w: SIDE.w, h: SIDE.h } } : null
      };
      p.names = { y: NAMES.y, h: NAMES.h };
      p.dots = DOTS;
      p.back = error ? BACK : null;
      return p;
    }

    p.hero = HERO;
    p.mini = phoneVersion && !error ? MINI : null;
    p.strip = windowOf(base.count, base.index, STRIP.max).map(function (i, slot, all) {
      var x = HERO.x + slot * STRIP.step;
      return {
        index: i, screen: screens[i], on: i === base.index,
        box: { x: x, y: STRIP.y, w: STRIP.w, h: STRIP.h },
        label: { x: x, y: STRIP.labelY, w: STRIP.labelW, h: STRIP.labelH },
        arrow: slot < all.length - 1 ? { x: x + STRIP.w + 9, y: STRIP.y + STRIP.h / 2 - 9, w: 18, h: 18 } : null
      };
    });
    return p;
  }

  // Right to left: the same boxes, mirrored across the page.
  function mirrorX(x, w) { return PAGE.width - x - (w || 0); }

  var api = {
    PAGE: PAGE, TOP: TOP, FOOT: FOOT, COL: COL, HERO: HERO, STRIP: STRIP, MINI: MINI, PHONE: PHONE, SIDE: SIDE,
    DOTS: DOTS, BACK: BACK, COVER: COVER, SHAPE: SHAPE,
    plan: plan, fitFrame: fitFrame, windowOf: windowOf, markSide: markSide, mirrorX: mirrorX
  };
  root.Frameflow = root.Frameflow || {};
  root.Frameflow.layout = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
