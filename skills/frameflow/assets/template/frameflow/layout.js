/* frameflow: turns a read storyboard into pages, rows and boxes, in CSS pixels on an A4 page.
   Pure numbers: no page access, so Node's tests can check every position.
   Sizes here are part of the approved look; change them only with the owner's yes. */
(function (root) {
  "use strict";

  // A4 at 96 CSS pixels per inch, one pixel short each way so a page never spills onto a second sheet.
  var PAGE = { width: 793, height: 1122 };
  var CONTENT = { left: 56, right: 737, top: 156, bottom: 1056 };

  // Per kind: columns per row, the frame, and the small frame used for "if it goes wrong".
  var KIND = {
    phone:   { cols: 3, w: 128, h: 212, ew: 56,  eh: 93 },
    tablet:  { cols: 3, w: 150, h: 200, ew: 66,  eh: 88 },
    desktop: { cols: 2, w: 280, h: 184, ew: 124, eh: 81 },
    website: { cols: 2, w: 280, h: 184, ew: 124, eh: 81 }
  };

  var FRAME_INSET = 36;    // frame's left edge from its cell's left edge (room for the red line and the number)
  var CAPTION_GAP = 10;    // frame bottom to caption
  var CAPTION_H = 84;      // name + up to three lines + the "goes to" note
  var ERROR_TOP_GAP = 12;  // caption bottom to the first "if it goes wrong" frame
  var ERROR_GAP = 10;      // between two "if it goes wrong" frames
  var ROW_GAP = 30;        // between rows: room for the arrow that turns to the next row
  var CELL_RIGHT_PAD = 6;
  var ERROR_TEXT_GAP = 8;
  // A website's phone version: a small phone over the browser frame's lower right corner.
  var MINI = { w: 52, h: 88, out: 8, down: 4 };
  // The number badge on each frame's top left corner: 11px out from inside the frame's 2px border.
  var BADGE = { out: 13, size: 24 };

  function rowHeight(k, errors) {
    var h = k.h + CAPTION_GAP + CAPTION_H + ROW_GAP;
    if (errors > 0) h += ERROR_TOP_GAP + errors * k.eh + (errors - 1) * ERROR_GAP;
    return h;
  }

  /* The whole document: a cover, then each story on its own page(s).
     Returns { kind, pages: [ { type: "cover" } | { type: "story", story, storyIndex, part, parts, rows } ] }. */
  function plan(board) {
    var kind = board.project.kind;
    var k = KIND[kind];
    if (!k) throw new Error("layout: unknown kind " + kind);
    var cellW = (CONTENT.right - CONTENT.left) / k.cols;
    var pages = [{ type: "cover" }];

    board.stories.forEach(function (story, storyIndex) {
      var rows = [];
      for (var i = 0; i < story.screens.length; i += k.cols) {
        var screens = story.screens.slice(i, i + k.cols);
        var errors = Math.max.apply(null, screens.map(function (s) { return s.errors.length; }));
        rows.push({ screens: screens, height: rowHeight(k, errors) });
      }

      var storyPages = [];
      var current = null;
      rows.forEach(function (row) {
        if (!current || current.used + row.height - ROW_GAP > CONTENT.bottom - CONTENT.top) {
          current = { rows: [], used: 0 };
          storyPages.push(current);
        }
        row.top = CONTENT.top + current.used;
        current.rows.push(row);
        current.used += row.height;
      });

      storyPages.forEach(function (sp, part) {
        var placed = sp.rows.map(function (row) { return placeRow(row, k, cellW, story, board.project.phoneVersion); });
        placed.forEach(function (row, r) {
          if (placed[r + 1] && goesToNext(row.cells[row.cells.length - 1].screen, story)) row.links.push(turn(row, placed[r + 1], CONTENT));
        });
        pages.push({
          type: "story", story: story, storyIndex: storyIndex, part: part + 1, parts: storyPages.length, rows: placed
        });
      });
    });

    pages.forEach(function (p, i) { p.number = i + 1; });
    return { kind: kind, page: PAGE, content: CONTENT, pages: pages };
  }

  function placeRow(row, k, cellW, story, phoneVersion) {
    var cells = row.screens.map(function (screen, col) {
      var cellLeft = CONTENT.left + col * cellW;
      var frame = { x: cellLeft + FRAME_INSET, y: row.top, w: k.w, h: k.h };
      var caption = {
        x: frame.x, y: frame.y + frame.h + CAPTION_GAP,
        w: cellLeft + cellW - CELL_RIGHT_PAD - frame.x, h: CAPTION_H
      };
      var errors = screen.errors.map(function (error, e) {
        var ey = caption.y + CAPTION_H + ERROR_TOP_GAP + e * (k.eh + ERROR_GAP);
        var ef = { x: frame.x, y: ey, w: k.ew, h: k.eh };
        var tx = ef.x + ef.w + ERROR_TEXT_GAP;
        return { error: error, frame: ef, text: { x: tx, y: ey, w: caption.x + caption.w - tx, h: k.eh } };
      });
      var badge = { x: frame.x - BADGE.out, y: frame.y - BADGE.out, w: BADGE.size, h: BADGE.size };
      var mini = phoneVersion ? {
        x: frame.x + frame.w + MINI.out - MINI.w, y: frame.y + frame.h + MINI.down - MINI.h, w: MINI.w, h: MINI.h
      } : null;
      return { screen: screen, frame: frame, badge: badge, mini: mini, caption: caption, errors: errors };
    });
    return { top: row.top, height: row.height, cells: cells, links: links(cells, k, story) };
  }

  /* The lines drawn on a row, as point lists:
     - "next": a blue arrow between two frames side by side, when the tap goes to the next screen;
     - "error": the red dashed line from a frame down to its "if it goes wrong" frames;
     - "turn": added by plan(), from a row's last frame to the first frame of the row below. */
  function links(cells, k, story) {
    var out = [];
    cells.forEach(function (cell, i) {
      var s = cell.screen;
      var next = cells[i + 1];
      if (next && goesToNext(s, story)) {
        var y = cell.frame.y + cell.frame.h / 2;
        var gap = next.frame.x - (cell.frame.x + cell.frame.w);
        var pad = Math.max(10, (gap - 56) / 2);
        out.push({ type: "next", points: [[cell.frame.x + cell.frame.w + pad, y], [next.frame.x - pad, y]] });
      }
      if (cell.errors.length) {
        var lx = cell.frame.x - 14;
        var start = cell.frame.y + cell.frame.h * 0.75;
        var last = cell.errors[cell.errors.length - 1];
        out.push({ type: "error-trunk", points: [[cell.frame.x, start], [lx, start], [lx, last.frame.y + last.frame.h / 2]] });
        cell.errors.forEach(function (e) {
          var ey = e.frame.y + e.frame.h / 2;
          out.push({ type: "error", points: [[lx, ey], [e.frame.x - 3, ey]] });
        });
      }
    });
    return out;
  }

  // The turning arrow from the last frame of a row to the first frame of the row below.
  function turn(fromRow, toRow, content) {
    var last = fromRow.cells[fromRow.cells.length - 1].frame;
    var first = toRow.cells[0].frame;
    var x = content.right + 14;
    var y = toRow.top - ROW_GAP / 2;
    var cx = first.x + first.w / 2;
    return { type: "turn", points: [[last.x + last.w + 10, last.y + last.h / 2], [x, last.y + last.h / 2], [x, y], [cx, y], [cx, first.y - 6]] };
  }

  function goesToNext(screen, story) {
    if (screen.to === null) return screen.number < story.screens.length;
    return screen.to === screen.number + 1;
  }

  // Right to left: the same boxes, mirrored across the page.
  function mirrorX(x, w) { return PAGE.width - x - (w || 0); }

  var api = {
    PAGE: PAGE, CONTENT: CONTENT, KIND: KIND, ROW_GAP: ROW_GAP, MINI: MINI, BADGE: BADGE,
    plan: plan, turn: turn, goesToNext: goesToNext, mirrorX: mirrorX, rowHeight: rowHeight
  };
  root.Frameflow = root.Frameflow || {};
  root.Frameflow.layout = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
