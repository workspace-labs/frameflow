/* frameflow: reads the text copy (app-flow.md) into a storyboard, or refuses it in plain words.
   No page access here (no `document`), so the same file runs in a browser and in Node's tests.
   The shape it reads is documented in references/storyboard-format.md. */
(function (root) {
  "use strict";

  var VERSION = "0.1.0";

  var KINDS = ["phone", "tablet", "desktop", "website"];
  var LANGUAGES = ["en", "ar"];
  var SKETCHES = ["form", "list", "grid", "detail", "done", "message", "blank"];
  var SETTINGS = ["kind", "language", "client", "by", "about", "version", "status", "approved", "date", "phone-version"];
  var LIMITS = {
    projectName: 60, storyTitle: 48, storySummary: 140, screenName: 24, caption: 90,
    errorCaption: 70, person: 60, about: 200, stories: 12, screens: 24, errorsPerScreen: 2
  };
  var PICTURE = /\.(png|jpe?g|webp)$/i;

  var TITLE = /^#\s+(.+?)\s*$/;
  var STORY = /^##\s+(.+?)\s*$/;
  var SETTING = /^\s*[-*]\s+([A-Za-z][A-Za-z-]*)\s*:\s*(.*?)\s*$/;
  var DIGIT = "0-9\u0660-\u0669\u06F0-\u06F9"; // 0-9, Arabic ٠-٩ and Persian ۰-۹
  var SCREEN = new RegExp("^([" + DIGIT + "]+)\\.\\s+(.*)$");
  var SCREEN_BODY = /^(.+?)\s*\[\s*([A-Za-z]+)\s*\]\s*:\s*(.+)$/;
  var ERROR = /^\s*!\s*(.*)$/;
  var ERROR_BODY = /^(.+?)\s*:\s*(.+)$/;
  var SHOT = /^\s+(shot|phone-shot)\s*:\s*(.*?)\s*$/i;
  // The last arrow on a line (the greedy start runs up to it) and everything after it. All of that must be a
  // screen number or "end", or the line is refused. Arrows earlier on the line stay in the caption.
  var TARGET = /^([\s\S]*)(→|->)([\s\S]*)$/;
  // A screenshot path is file and folder names split by "/". These characters make a browser or Windows read it
  // as more than a name (":" for a web link or a drive, "\", "%", "?", "#"), or no file can have them.
  var PATH_BAD_CHAR = /[<>:"\\|?*%#\u0000-\u001f\u007f]/;

  // ٣ and ۳ read as 3.
  function westernDigits(text) {
    return text.replace(/[\u0660-\u0669]/g, function (d) { return d.charCodeAt(0) - 0x0660; })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return d.charCodeAt(0) - 0x06F0; });
  }

  function parse(text) {
    var problems = [];
    var board = { project: { name: "", settings: {} }, stories: [] };
    var settingLines = {};
    var story = null;
    var lastScreen = null;
    var lastItem = null;
    var seenTitle = false;

    function problem(line, message) { problems.push({ line: line, text: message }); }

    var lines = String(text == null ? "" : text).replace(/\r\n?/g, "\n").split("\n");
    for (var i = 0; i < lines.length; i++) {
      var n = i + 1;
      var raw = lines[i];
      if (!raw.trim()) continue;
      var m;

      if (!seenTitle) {
        m = TITLE.exec(raw);
        if (m && raw.indexOf("##") !== 0) {
          board.project.name = m[1];
          board.project.line = n;
          seenTitle = true;
          continue;
        }
        problem(n, "The file must start with the project's name, as a line like: # Food Delivery App");
        board.project.line = n;
        seenTitle = true;
        continue;
      }

      if ((m = STORY.exec(raw))) {
        story = { title: m[1], summary: "", line: n, screens: [] };
        board.stories.push(story);
        lastScreen = null;
        lastItem = null;
        continue;
      }

      if (TITLE.test(raw)) {
        problem(n, "Only one # line is allowed: the project's name. Start a story with ## instead.");
        continue;
      }

      m = SETTING.exec(raw);
      if (m && story && SETTINGS.indexOf(m[1].toLowerCase()) >= 0) {
        problem(n, "Settings go above the first story, under the project's name. Move " + quote(raw) + " up.");
        continue;
      }

      if (m && !story) {
        var key = m[1].toLowerCase();
        if (SETTINGS.indexOf(key) < 0) {
          problem(n, '"' + m[1] + '" is not a setting. The settings are: ' + SETTINGS.join(", ") + ".");
        } else if (settingLines[key]) {
          problem(n, '"' + key + '" is set twice (also on line ' + settingLines[key] + "). Keep one.");
        } else {
          board.project.settings[key] = m[2];
          settingLines[key] = n;
        }
        continue;
      }

      if (!story) {
        problem(n, "I can't read this line before the first story: " + quote(raw) +
          ". Settings look like: - kind: phone. A story starts with ## and its title.");
        continue;
      }

      if ((m = SHOT.exec(raw))) {
        readShot(n, m[1].toLowerCase(), m[2]);
        continue;
      }

      if ((m = ERROR.exec(raw))) {
        readError(n, m[1]);
        continue;
      }

      if ((m = SCREEN.exec(raw.trim()))) {
        readScreen(n, Number(westernDigits(m[1])), m[2]);
        continue;
      }

      if (story.screens.length === 0 && !story.summary && !/^\s/.test(raw)) {
        story.summary = raw.trim();
        story.summaryLine = n;
        continue;
      }

      problem(n, "I can't read this line: " + quote(raw) +
        ". A screen looks like: 2. Home [grid]: Sees the restaurants, taps one. → 3");
    }

    function splitTarget(n, body) {
      var t = TARGET.exec(body);
      if (!t) return { rest: body.trim(), to: null };
      var word = westernDigits(t[3].trim());
      var rest = t[1].trim();
      if (/^end$/i.test(word)) return { rest: rest, to: "end" };
      if (/^\d+$/.test(word)) return { rest: rest, to: Number(word) };
      problem(n, "After the last → there must be a screen number or end, and nothing else. It says " + quote(t[2] + t[3]) +
        ". An arrow inside the caption needs a target after it: … → 3.");
      return { rest: rest, to: null, bad: true };
    }

    function readScreen(n, number, body) {
      var parts = SCREEN_BODY.exec(body);
      lastItem = null;
      if (!parts) {
        problem(n, "Screen " + number + " is missing its sketch or caption. Write it like: " +
          number + ". Home [grid]: Sees the restaurants, taps one.");
        return;
      }
      var target = splitTarget(n, parts[3]);
      var screen = {
        number: number, name: parts[1].trim(), sketch: parts[2].toLowerCase(), caption: target.rest,
        to: target.to, line: n, shot: "", phoneShot: "", errors: []
      };
      story.screens.push(screen);
      lastScreen = screen;
      lastItem = screen;
    }

    function readError(n, body) {
      if (!lastScreen) {
        problem(n, "A ! line must sit under the screen it belongs to.");
        lastItem = null;
        return;
      }
      var parts = ERROR_BODY.exec(body);
      if (!parts) {
        problem(n, 'Write what goes wrong like: ! Card refused: Sees "Payment failed", taps "Try again". → 4');
        lastItem = null;
        return;
      }
      var target = splitTarget(n, parts[2]);
      var error = { name: parts[1].trim(), caption: target.rest, to: target.to, badTarget: target.bad, line: n, shot: "" };
      lastScreen.errors.push(error);
      lastItem = error;
    }

    function readShot(n, key, path) {
      if (!lastItem) {
        problem(n, "A " + key + ": line must sit right under the screen (or the ! line) it belongs to.");
        return;
      }
      if (key === "phone-shot" && lastItem.errors === undefined) {
        problem(n, "phone-shot: belongs under a screen, not under a ! line.");
        return;
      }
      var field = key === "shot" ? "shot" : "phoneShot";
      if (lastItem[field]) {
        problem(n, "This screen already has a " + key + ": line. Keep one.");
        return;
      }
      lastItem[field] = path;
      lastItem[field + "Line"] = n;
    }

    board.project.lines = settingLines;
    if (!seenTitle) problem(1, "The file is empty. It starts with the project's name, as a line like: # Food Delivery App");
    else check(board, settingLines, problem);

    return { ok: problems.length === 0, problems: problems, storyboard: board };
  }

  function check(board, settingLines, problem) {
    var p = board.project;
    var s = p.settings;
    var titleLine = p.line || 1;

    tooLong(titleLine, "The project's name", p.name, LIMITS.projectName);

    p.kind = (s.kind || "").toLowerCase();
    if (!s.kind) problem(titleLine, "Say what kind of project it is, under the name: - kind: phone (or tablet, desktop, website).");
    else if (KINDS.indexOf(p.kind) < 0) problem(settingLines.kind, "kind must be phone, tablet, desktop or website. It says " + quote(s.kind) + ".");

    p.language = (s.language || "en").toLowerCase();
    if (LANGUAGES.indexOf(p.language) < 0) problem(settingLines.language, "language must be en (English) or ar (Arabic). It says " + quote(s.language) + ".");

    p.client = s.client || "";
    p.by = s.by || "";
    p.about = s.about || "";
    tooLong(settingLines.client, "client", p.client, LIMITS.person);
    tooLong(settingLines.by, "by", p.by, LIMITS.person);
    tooLong(settingLines.about, "about", p.about, LIMITS.about);

    p.version = 1;
    if (s.version !== undefined) {
      if (/^[1-9]\d{0,3}$/.test(s.version)) p.version = Number(s.version);
      else problem(settingLines.version, "version must be a whole number: 1, 2, 3… It says " + quote(s.version) + ".");
    }

    p.status = (s.status || "draft").toLowerCase();
    if (p.status !== "draft" && p.status !== "approved") problem(settingLines.status, "status must be draft or approved. It says " + quote(s.status) + ".");

    p.approved = readDate(s.approved, settingLines.approved, "approved");
    if (p.status === "approved" && s.approved === undefined) problem(settingLines.status, "status is approved, so add the day the client approved it: - approved: 2026-10-06");
    if (p.status === "draft" && s.approved !== undefined) problem(settingLines.approved, "approved is set but status is draft. Set status: approved, or remove the approved line.");

    p.date = readDate(s.date, settingLines.date, "date");

    p.phoneVersion = false;
    if (s["phone-version"] !== undefined) {
      var pv = s["phone-version"].toLowerCase();
      if (pv !== "yes" && pv !== "no") problem(settingLines["phone-version"], "phone-version must be yes or no.");
      else if (pv === "yes" && p.kind !== "website") problem(settingLines["phone-version"], "phone-version is only for websites. This project's kind is " + (p.kind || "not set") + ".");
      else p.phoneVersion = pv === "yes";
    }

    if (board.stories.length === 0) problem(titleLine, "There are no stories yet. Start one with ## and its title, then its screens.");
    if (board.stories.length > LIMITS.stories) problem(board.stories[LIMITS.stories].line, "Up to " + LIMITS.stories + " stories. Split this project into two storyboards.");

    board.stories.forEach(function (story) {
      tooLong(story.line, "The story title", story.title, LIMITS.storyTitle);
      tooLong(story.summaryLine, "The line under the story title", story.summary, LIMITS.storySummary);
      var count = story.screens.length;
      if (count === 0) problem(story.line, 'The story "' + story.title + '" has no screens. Add them as 1. Name [sketch]: caption');
      if (count > LIMITS.screens) problem(story.screens[LIMITS.screens].line, "Up to " + LIMITS.screens + " screens in one story. Split it into two stories.");

      story.screens.forEach(function (screen, index) {
        if (screen.number !== index + 1) problem(screen.line, "Screens are numbered 1, 2, 3… with no gaps. This one should be " + (index + 1) + ", not " + screen.number + ".");
        tooLong(screen.line, "Screen " + screen.number + "'s name", screen.name, LIMITS.screenName);
        tooLong(screen.line, "Screen " + screen.number + "'s caption", screen.caption, LIMITS.caption);
        if (!screen.caption) problem(screen.line, "Screen " + screen.number + " needs a caption: what the user sees and does.");
        if (SKETCHES.indexOf(screen.sketch) < 0) problem(screen.line, quote(screen.sketch) + " is not a sketch. Use one of: " + SKETCHES.join(", ") + ".");
        if (typeof screen.to === "number") {
          if (screen.to < 1 || screen.to > count) problem(screen.line, "Screen " + screen.number + " goes to screen " + screen.to + ", but this story has " + count + " screens.");
          else if (screen.to === screen.number) problem(screen.line, "Screen " + screen.number + " goes to itself. Point it to the next screen, or remove the →.");
        }
        if (screen.errors.length > LIMITS.errorsPerScreen) problem(screen.errors[LIMITS.errorsPerScreen].line, "Up to " + LIMITS.errorsPerScreen + " ! lines under one screen. Make the rest their own story.");
        checkPicture(screen.shotLine, screen.shot);
        checkPicture(screen.phoneShotLine, screen.phoneShot);
        if (screen.phoneShot && !p.phoneVersion) problem(screen.phoneShotLine, "phone-shot: needs - phone-version: yes in the settings.");

        screen.errors.forEach(function (error) {
          tooLong(error.line, '"' + error.name + '"', error.name, LIMITS.screenName);
          tooLong(error.line, '"' + error.name + '"' + "'s caption", error.caption, LIMITS.errorCaption);
          if (!error.caption) problem(error.line, '"' + error.name + '" needs a caption: what the user sees and does.');
          if (error.to === null && !error.badTarget) problem(error.line, '"' + error.name + '" needs a way out: end the line with → and a screen number, or → end.');
          else if (typeof error.to === "number" && (error.to < 1 || error.to > count)) problem(error.line, '"' + error.name + '" goes back to screen ' + error.to + ", but this story has " + count + " screens.");
          checkPicture(error.shotLine, error.shot);
        });
      });
    });

    function tooLong(line, label, value, limit) {
      if (value && [...value].length > limit) problem(line, label + " is " + [...value].length + " characters. Keep it to " + limit + ".");
    }

    function readDate(value, line, key) {
      if (value === undefined) return "";
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (m) {
        var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
        if (d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]) return value;
      }
      problem(line, key + " must be a real day written as YYYY-MM-DD, like 2026-10-06. It says " + quote(value) + ".");
      return "";
    }

    function checkPicture(line, path) {
      if (!path) return;
      // Each name must stay below the page and mean the same on a Mac and on Windows: not empty (a "/" at the start,
      // "//"), not "..", and not ending in a space or a dot, which Windows drops (a lone "." is this folder).
      var badName = path.split("/").some(function (name) {
        return name === "" || name === ".." || (name !== "." && /[ .]$/.test(name));
      });
      if (PATH_BAD_CHAR.test(path) || badName) {
        problem(line, "A screenshot must be a file in the storyboard's folder or below it, like screenshots/1-2-home.png. " +
          'Not allowed: a web link, a "/" or a drive at the start, "..", a name ending in a space or a dot, and the ' +
          'characters < > : " \\ | ? * % #. It says ' + quote(path) + ".");
      } else if (!PICTURE.test(path)) problem(line, "A screenshot must be a .png, .jpg or .webp file. It says " + quote(path) + ".");
    }
  }

  function quote(text) {
    var t = String(text).trim();
    if ([...t].length > 60) t = [...t].slice(0, 57).join("") + "…";
    return '"' + t + '"';
  }

  var api = { VERSION: VERSION, KINDS: KINDS, SKETCHES: SKETCHES, LIMITS: LIMITS, parse: parse };
  root.Frameflow = root.Frameflow || {};
  root.Frameflow.model = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
