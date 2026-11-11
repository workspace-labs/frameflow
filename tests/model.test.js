// The reading rules: good text copies are read correctly; broken ones are refused in plain words.
// Run from the repository root: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parse, splitCaption, VERSION } = require("../skills/frameflow/assets/template/frameflow/model.js");
const theme = require("../skills/frameflow/assets/template/frameflow/theme.js");

const EXAMPLES = path.join(__dirname, "../skills/frameflow/examples");

function board(lines) {
  return parse(["# Shop App", "", "- kind: phone", "", ...lines].join("\n"));
}

function refusedWith(result, line, words) {
  assert.equal(result.ok, false, "expected a refusal");
  const hit = result.problems.find((p) => p.line === line && p.text.includes(words));
  assert.ok(hit, `no problem on line ${line} containing "${words}". Got:\n` +
    result.problems.map((p) => `  ${p.line}: ${p.text}`).join("\n"));
}

test("the version is a real version number", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});

test("every example in the skill reads with no problems", () => {
  const files = fs.readdirSync(EXAMPLES).filter((f) => f.endsWith(".md"));
  assert.ok(files.length > 0);
  for (const file of files) {
    const result = parse(fs.readFileSync(path.join(EXAMPLES, file), "utf8"));
    assert.deepEqual(result.problems, [], file);
  }
});

test("the food delivery example is read into the right shape", () => {
  const { storyboard: b } = parse(fs.readFileSync(path.join(EXAMPLES, "food-delivery.md"), "utf8"));
  assert.equal(b.project.name, "Food Delivery App");
  assert.equal(b.project.kind, "phone");
  assert.equal(b.project.version, 2);
  assert.equal(b.project.status, "approved");
  assert.equal(b.project.approved, "2026-10-06");
  assert.equal(b.stories.length, 2);
  const order = b.stories[1];
  assert.equal(order.title, "Ordering food");
  assert.equal(order.summary, "From choosing a restaurant to the order confirmed.");
  assert.equal(order.screens.length, 6);
  const pay = order.screens[3];
  assert.deepEqual([pay.number, pay.name, pay.sketch, pay.to], [4, "Pay", "form", 5]);
  assert.equal(pay.caption, 'Sees the card form. Enters the card, taps "Pay now".');
  assert.equal(pay.errors.length, 2);
  assert.deepEqual([pay.errors[0].name, pay.errors[0].to], ["Card refused", 4]);
  assert.equal(order.screens[5].to, null, "the last screen with no arrow is the end");
});

test("defaults: English, version 1, draft, no phone version", () => {
  const r = board(["## Buy", "1. Home [grid]: Sees products."]);
  assert.equal(r.ok, true);
  const p = r.storyboard.project;
  assert.deepEqual([p.language, p.version, p.status, p.phoneVersion], ["en", 1, "draft", false]);
});

test("-> works like →, and → end is read", () => {
  const r = board(["## Buy", "1. Home [grid]: Sees products. -> 2", "2. Done [done]: Sees the receipt. → end"]);
  assert.equal(r.ok, true);
  assert.equal(r.storyboard.stories[0].screens[0].to, 2);
  assert.equal(r.storyboard.stories[0].screens[1].to, "end");
});

test("shots belong to the line right above them", () => {
  const r = parse([
    "# Site", "- kind: website", "- phone-version: yes", "## Visit",
    "1. Home [grid]: Sees the clinics. → 2",
    "   shot: screenshots/1-1-home.png",
    "   phone-shot: screenshots/1-1-home-phone.png",
    "   ! Offline: Sees a notice, taps Retry. → 1",
    "   shot: screenshots/1-1-offline.png",
    "2. Book [form]: Picks a time, taps Book.",
  ].join("\n"));
  assert.deepEqual(r.problems, []);
  const home = r.storyboard.stories[0].screens[0];
  assert.equal(home.shot, "screenshots/1-1-home.png");
  assert.equal(home.phoneShot, "screenshots/1-1-home-phone.png");
  assert.equal(home.errors[0].shot, "screenshots/1-1-offline.png");
});

test("Arabic text is read as it is", () => {
  const r = parse(["# تطبيق التوصيل", "- kind: phone", "- language: ar", "## الطلب",
    "1. الرئيسية [grid]: يرى المطاعم القريبة، ويختار واحدًا. → 2", "2. تم [done]: يرى رقم الطلب."].join("\n"));
  assert.deepEqual(r.problems, []);
  assert.equal(r.storyboard.project.language, "ar");
  assert.equal(r.storyboard.stories[0].screens[0].name, "الرئيسية");
});

// ---- refusals: each names the line and what to change ----

test("an empty file is refused", () => {
  refusedWith(parse(""), 1, "empty");
});

test("the file must start with the project's name", () => {
  refusedWith(parse("- kind: phone\n## Buy\n1. Home [grid]: Sees."), 1, "must start with the project's name");
});

test("kind is required and must be one of the four", () => {
  refusedWith(parse("# App\n## Buy\n1. Home [grid]: Sees."), 1, "what kind of project");
  refusedWith(parse("# App\n- kind: mobile\n## Buy\n1. Home [grid]: Sees."), 2, 'It says "mobile"');
});

test("unknown and repeated settings are refused", () => {
  refusedWith(board(["- colour: blue", "## Buy", "1. Home [grid]: Sees."]), 5, '"colour" is not a setting');
  refusedWith(board(["- kind: tablet", "## Buy", "1. Home [grid]: Sees."]), 5, "set twice");
});

test("a setting inside a story is refused, not taken as the summary", () => {
  const r = board(["## Buy", "- client: Acme", "1. Home [grid]: Sees."]);
  refusedWith(r, 6, "Settings go above the first story");
});

test("approval needs its date, and a date must be real", () => {
  refusedWith(board(["- status: approved", "## Buy", "1. Home [grid]: Sees."]), 5, "add the day the client approved it");
  refusedWith(board(["- status: approved", "- approved: 2026-02-30", "## Buy", "1. Home [grid]: Sees."]), 6, "real day");
  refusedWith(board(["- approved: 2026-10-06", "## Buy", "1. Home [grid]: Sees."]), 5, "status is draft");
});

test("version must be a whole number", () => {
  refusedWith(board(["- version: 2.1", "## Buy", "1. Home [grid]: Sees."]), 5, "whole number");
});

test("phone-version is for websites only", () => {
  refusedWith(board(["- phone-version: yes", "## Buy", "1. Home [grid]: Sees."]), 5, "only for websites");
});

test("no stories, or a story with no screens, is refused", () => {
  refusedWith(board([]), 1, "no stories");
  refusedWith(board(["## Buy"]), 5, "has no screens");
});

test("screens are numbered with no gaps", () => {
  refusedWith(board(["## Buy", "1. Home [grid]: Sees.", "3. Pay [form]: Pays."]), 7, "should be 2, not 3");
});

test("a target must exist and must not be the screen itself", () => {
  refusedWith(board(["## Buy", "1. Home [grid]: Sees. → 7", "2. Pay [form]: Pays."]), 6, "has 2 screens");
  refusedWith(board(["## Buy", "1. Home [grid]: Sees. → 1"]), 6, "goes to itself");
});

test("a screen needs a caption, and a sketch it names must be a known one", () => {
  refusedWith(board(["## Buy", "1. Home [grid]"]), 6, "missing its caption");
  refusedWith(board(["## Buy", "1. Home [carousel]: Sees products."]), 6, '"carousel" is not a sketch');
  refusedWith(board(["## Buy", "1. Home [big grid]: Sees products."]), 6, "must be one word");
});

test("the sketch may be left out: the screen is then blank until it has a picture", () => {
  const r = board(["## Buy", "1. Home: Sees products.", "   shot: screenshots/1-1.png"]);
  assert.deepEqual(r.problems, []);
  assert.equal(r.storyboard.stories[0].screens[0].sketch, "blank");
  assert.equal(r.storyboard.stories[0].screens[0].name, "Home");
});

test("a ! line needs a way out and at most two per screen", () => {
  refusedWith(board(["## Buy", "1. Pay [form]: Pays.", "   ! Refused: Sees an error."]), 7, "needs a way out");
  refusedWith(board(["## Buy", "1. Pay [form]: Pays.", "   ! Refused: Sees it. → 9"]), 7, "has 1 screens");
  refusedWith(board(["## Buy", "1. Pay [form]: Pays.", "   ! A: Sees. → 1", "   ! B: Sees. → 1", "   ! C: Sees. → 1"]), 9, "Up to 2");
  refusedWith(board(["## Buy", "   ! Early: Sees. → 1", "1. Pay [form]: Pays."]), 6, "must sit under the screen");
});

test("screenshots must be local pictures", () => {
  for (const bad of ["https://example.com/a.png", "https:example.invalid/a.png", "https:/example.invalid/a.png",
    "https:\\\\example.invalid\\a.png", "//example.invalid/a.png", "file:///etc/a.png", "data:image/png,x.png",
    "/Users/me/a.png", "C:/shots/a.png", "\\\\server\\a.png", "../outside.png", "screenshots/../../a.png",
    "%2e%2e/a.png", "a?.png", "a#b.png", "a|b.png", "a*b.png", 'a"b.png', "a<b>.png", "a\tb.png",
    "folder /a.png", "folder./a.png", ".../a.png", "screenshots//a.png"]) {
    refusedWith(board(["## Buy", "1. Home [grid]: Sees.", "   shot: " + bad]), 7, "in the storyboard's folder");
    refusedWith(board(["## Buy", "1. Home [grid]: Sees.", "   ! Wrong: Sees. → 1", "     shot: " + bad]), 8, "in the storyboard's folder");
  }
  const site = ["# Site", "- kind: website", "- phone-version: yes", "## Buy", "1. Home [grid]: Sees.", "   phone-shot: ../a.png"];
  refusedWith(parse(site.join("\n")), 6, "in the storyboard's folder");
  for (const good of ["a.png", "./screenshots/1-2-home.png", "screenshots/1-2 home (v2).JPG", "لقطات/١-٢.webp"]) {
    assert.deepEqual(board(["## Buy", "1. Home [grid]: Sees.", "   shot: " + good]).problems, [], good);
  }
});

test("a file name may use any character a Mac and Windows both allow, on every screenshot line", () => {
  for (const name of ["1-2+home.png", "Bob's-home.png", "home & away.png", "home,done.png", "home~2.png",
    "a[1]!@=$;{x}.png", "صفحة ۱.png"]) {
    const path = "screenshots/" + name;
    const site = ["# Site", "- kind: website", "- phone-version: yes", "## Buy",
      "1. Home [grid]: Sees.", "   shot: " + path, "   phone-shot: " + path, "   ! Wrong: Sees. → 1", "     shot: " + path];
    const result = parse(site.join("\n"));
    assert.deepEqual(result.problems, [], name);
    const screen = result.storyboard.stories[0].screens[0];
    assert.deepEqual([screen.shot, screen.phoneShot, screen.errors[0].shot], [path, path, path], name);
  }
  refusedWith(board(["## Buy", "1. Home [grid]: Sees.", "   shot: screenshots/a.pdf"]), 7, ".png, .jpg or .webp");
  refusedWith(board(["## Buy", "1. Home [grid]: Sees.", "   phone-shot: a.png"]), 7, "phone-version: yes");
});

test("an explicit screenshot declaration needs a picture path", () => {
  for (const empty of ["", "   "]) {
    refusedWith(board(["## Buy", "1. Home [grid]: Sees.", "   shot: " + empty]), 7, "needs a picture file");
    refusedWith(board(["## Buy", "1. Home [grid]: Sees.", "   ! Wrong: Tries again. → 1", "     shot: " + empty]), 8, "needs a picture file");
    refusedWith(parse(["# Site", "- kind: website", "- phone-version: yes", "## Buy", "1. Home [grid]: Sees.",
      "   phone-shot: " + empty].join("\n")), 6, "needs a picture file");
  }
});

test("an empty screenshot declaration still counts when detecting duplicate lines", () => {
  refusedWith(board(["## Buy", "1. Home [grid]: Sees.", "   shot:", "   shot: screenshots/home.png"]), 8, "already has a shot:");
  refusedWith(board(["## Buy", "1. Home [grid]: Sees.", "   ! Wrong: Tries again. → 1", "     shot:",
    "     shot: screenshots/error.png"]), 9, "already has a shot:");
  refusedWith(parse(["# Site", "- kind: website", "- phone-version: yes", "## Buy", "1. Home [grid]: Sees.",
    "   phone-shot:", "   phone-shot: screenshots/home.png"].join("\n")), 7, "already has a phone-shot:");
});

test("unsafe raw-script text is refused before it is copied into the HTML page", () => {
  for (const token of ["</script>", "</ScRiPt>", "</script >", "</script\t>", "</script/>", "</script", "<!--<script>", "<!--"]) {
    refusedWith(board(["## Buy", "1. Home [grid]: Sees " + token]), 6, "embedded copy");
  }
  refusedWith(board(["## Buy", "1. Home [grid]: Sees </script", ">"]), 6, "embedded copy");
  for (const ordinary of ["Sees <script> as text.", "Sees </scripture> as text.", "Compares 1 < 2."]) {
    assert.deepEqual(board(["## Buy", "1. Home [grid]: " + ordinary]).problems, []);
  }
});

test("the last arrow must end in a screen number or end", () => {
  refusedWith(board(["## Buy", "1. Home [grid]: Sees a list. → banana", "2. Pay [form]: Pays."]), 6, "screen number or end");
  refusedWith(board(["## Buy", "1. Home [grid]: Sees a list. →", "2. Pay [form]: Pays."]), 6, "screen number or end");
  const later = board(["## Buy", "1. Pay [form]: Pays.", "   ! Refused: Sees it. → later"]);
  refusedWith(later, 7, "screen number or end");
  assert.equal(later.problems.length, 1, "one mistake, one problem");
  refusedWith(board(["## Buy", "1. Home [grid]: Sees a list. → ٠", "2. Pay [form]: Pays."]), 6, "goes to screen 0");
  const ok = board(["## Buy", "1. Home [grid]: Swipes left → right → ٢", "٢. Pay [form]: Pays. → end"]);
  assert.deepEqual(ok.problems, []);
  const [one, two] = ok.storyboard.stories[0].screens;
  assert.equal(one.caption, "Swipes left → right");
  assert.equal(one.to, 2);
  assert.equal(two.number, 2);
  assert.equal(two.to, "end");
});

test("arrows written without spaces: the last one is the target, the others stay in the caption", () => {
  for (const [caption, target, to] of [["Swipes left→right", "→2", 2], ["Swipes left->right", "->2", 2],
    ["Swipes left→right", "→٢", 2], ["Swipes left→right", "→۲", 2], ["Swipes left→right", "→end", "end"]]) {
    const r = board(["## Buy", "1. Home [grid]: " + caption + target, "2. Pay [form]: Pays.", "   ! Wrong: Taps A→B" + target]);
    assert.deepEqual(r.problems, [], caption + target);
    const screen = r.storyboard.stories[0].screens[0];
    const error = r.storyboard.stories[0].screens[1].errors[0];
    assert.deepEqual([screen.caption, screen.to], [caption, to], caption + target);
    assert.deepEqual([error.caption, error.to], ["Taps A→B", to], "! line " + target);
  }
  refusedWith(board(["## Buy", "1. Home [grid]: Swipes left→right→banana", "2. Pay [form]: Pays."]), 6, "screen number or end");
  refusedWith(board(["## Buy", "1. Home [grid]: Swipes left→right→", "2. Pay [form]: Pays."]), 6, "screen number or end");
  refusedWith(board(["## Buy", "1. Home [grid]: Swipes left→right→9", "2. Pay [form]: Pays."]), 6, "has 2 screens");
  refusedWith(board(["## Buy", "1. Pay [form]: Pays.", "   ! Wrong: Taps A→B→7"]), 7, "goes back to screen 7");
});

test("everything after the last arrow must be a target, on screen lines and ! lines", () => {
  for (const arrow of ["→", "->"]) {
    for (const gap of ["", " "]) {
      for (const suffix of ["banana word", "2 3", "end extra"]) {
        const screen = board(["## Buy", "1. Home [grid]: Swipes left" + arrow + "right" + arrow + gap + suffix, "2. Pay [form]: Pays."]);
        refusedWith(screen, 6, "screen number or end");
        assert.equal(screen.problems.length, 1, "screen line: " + arrow + gap + suffix);
        assert.equal(screen.storyboard.stories[0].screens[0].to, null);
        const error = board(["## Buy", "1. Home [grid]: Sees.", "2. Pay [form]: Pays.", "   ! Wrong: Taps A" + arrow + "B" + arrow + gap + suffix]);
        refusedWith(error, 8, "screen number or end");
        assert.equal(error.problems.length, 1, "! line, one mistake one problem: " + arrow + gap + suffix);
      }
    }
  }
  refusedWith(board(["## Buy", "1. Home [grid]: Sees A → B, then taps.", "2. Pay [form]: Pays."]), 6, "screen number or end");
  const ok = board(["## Buy", "1. Home [grid]: Swipes left → right → END", "2. Pay [form]: Taps \"Next ->\" -> 1"]);
  assert.deepEqual(ok.problems, []);
  const [one, two] = ok.storyboard.stories[0].screens;
  assert.deepEqual([one.caption, one.to, two.caption, two.to], ["Swipes left → right", "end", 'Taps "Next ->"', 1]);
});

test("problems name the line they are on, even after blank lines", () => {
  const text = ["", "", "# " + "W".repeat(61), "", "## Buy", "1. Home [grid]: Sees."].join("\n");
  const r = parse(text);
  refusedWith(r, 3, "Keep it to 60");
  refusedWith(r, 3, "what kind of project");
  assert.equal(parse(["", "# A", "- kind: phone", "## B", "1. C [blank]: D."].join("\n")).storyboard.project.line, 2);
});

test("long words are refused with the limit named", () => {
  refusedWith(board(["## Buy", "1. Home [grid]: " + "Sees a very long caption ".repeat(8)]), 6, "Keep it to 160");
  refusedWith(board(["## Buy", "1. A screen name that is far too long [grid]: Sees."]), 6, "Keep it to 24");
});

test("a line it cannot read is named, with an example of the right shape", () => {
  refusedWith(board(["## Buy", "1. Home [grid]: Sees.", "Then the user leaves."]), 7, "I can't read this line");
});

test("a second # line is refused", () => {
  refusedWith(board(["# Another", "## Buy", "1. Home [grid]: Sees."]), 5, "Only one # line");
});

test("the template's own placeholder reads with no problems", () => {
  const page = fs.readFileSync(path.join(__dirname, "../skills/frameflow/assets/template/storyboard.html"), "utf8");
  const m = /<script type="text\/markdown" id="app-flow">\n([\s\S]*?)<\/script>/.exec(page);
  assert.ok(m, "the template has its app-flow block");
  assert.deepEqual(parse(m[1]).problems, []);
});

test("straight quotes print as curly ones in English, never in Arabic", () => {
  const strings = require("../skills/frameflow/assets/template/frameflow/strings.js");
  assert.equal(strings.quotes('Taps "Plan my week". Sees "Day off".', "en"), "Taps “Plan my week”. Sees “Day off”.");
  assert.equal(strings.quotes("What didn't happen", "en"), "What didn’t happen");
  assert.equal(strings.quotes('يضغط "ادفع"', "ar"), 'يضغط "ادفع"');
  assert.equal(strings.quotes("", "en"), "");
});

// ---------- 0.3.0: tap and look points, the app's colours, crop, Sees / Does ----------

const SHOT = ["## Buy", "1. Home: Sees products. Taps one.", "   shot: screenshots/1-1.png"];

test("tap: and look: are read as a point on the picture, with an optional label", () => {
  const r = board([...SHOT, "   tap: 86%, 91.5% Taps Checkout", "   look: 10, 20"]);
  assert.deepEqual(r.problems, []);
  const s = r.storyboard.stories[0].screens[0];
  assert.deepEqual([s.tap.x, s.tap.y, s.tap.label], [0.86, 0.915, "Taps Checkout"]);
  assert.deepEqual([s.look.x, s.look.y, s.look.label], [0.1, 0.2, ""]);
});

test("tap: under a ! line belongs to that line, and Arabic digits read as numbers", () => {
  const r = board([...SHOT, "   ! No stock: Sees a note. → 1", "   shot: screenshots/1-1-e.png", "   tap: ٥٠%, ٢٥%"]);
  assert.deepEqual(r.problems, []);
  const s = r.storyboard.stories[0].screens[0];
  assert.equal(s.tap, undefined);
  assert.deepEqual([s.errors[0].tap.x, s.errors[0].tap.y], [0.5, 0.25]);
});

test("a tap: line that is not two numbers from 0 to 100 is refused", () => {
  for (const bad of ["tap: left, top", "tap: 50%", "tap: 120%, 10%", "tap: 10% 20%", "tap: -5%, 10%", "tap:"]) {
    refusedWith(board([...SHOT, "   " + bad]), 8, "two numbers from 0 to 100");
  }
});

test("a tap: needs its picture, sits under a screen, comes once, and its label is short", () => {
  refusedWith(board(["## Buy", "1. Home [grid]: Sees products.", "   tap: 50%, 50%"]), 7, "Add its shot: line first");
  refusedWith(board(["## Buy", "   tap: 50%, 50%", "1. Home [grid]: Sees products."]), 6, "must sit right under the screen");
  refusedWith(board([...SHOT, "   tap: 50%, 50%", "   tap: 60%, 60%"]), 9, "already has a tap: line");
  refusedWith(board([...SHOT, "   look: 50%, 50% " + "a very long label ".repeat(3)]), 8, "Keep it to 28");
});

test("stage and accent are the app's two colours, written as hex", () => {
  const r = parse("# A\n- kind: phone\n- stage: #0A0E0D\n- accent: #6d9\n## S\n1. H: Sees it.");
  assert.deepEqual(r.problems, []);
  assert.deepEqual([r.storyboard.project.stage, r.storyboard.project.accent], ["#0a0e0d", "#66dd99"]);
  refusedWith(parse("# A\n- kind: phone\n- stage: dark green\n## S\n1. H: Sees it."), 3, "stage must be a colour");
  refusedWith(parse("# A\n- kind: phone\n- accent: #12345\n## S\n1. H: Sees it."), 3, "accent must be a colour");
});

test("an accent that cannot be seen on the stage is refused, also against frameflow's own colours", () => {
  refusedWith(parse("# A\n- kind: phone\n- stage: #101010\n- accent: #181818\n## S\n1. H: Sees it."), 4, "cannot be seen");
  refusedWith(parse("# A\n- kind: phone\n- accent: #f0f1f3\n## S\n1. H: Sees it."), 3, "cannot be seen");
  refusedWith(parse("# A\n- kind: phone\n- stage: #3d5afe\n## S\n1. H: Sees it."), 3, "cannot be seen");
});

test("crop cuts a share of every picture's top and bottom, up to 25% each", () => {
  const crop = (v) => parse("# A\n- kind: phone\n- crop: " + v + "\n## S\n1. H: Sees it.");
  assert.deepEqual(crop("top 4%, bottom 6%").storyboard.project.crop, { top: 0.04, bottom: 0.06 });
  assert.deepEqual(crop("bottom 5").storyboard.project.crop, { top: 0, bottom: 0.05 });
  assert.deepEqual(board(["## S", "1. H: Sees it."]).storyboard.project.crop, { top: 0, bottom: 0 });
  for (const bad of ["4%", "top 30%", "top 4%, top 5%", "left 4%", "top", "top 4%,"]) refusedWith(crop(bad), 3, "crop says how much");
});

test("a caption that starts with Sees is split into what the user sees and what they do", () => {
  assert.deepEqual(splitCaption('Sees the dishes and prices. Adds dishes, taps "Checkout".', "en"),
    { sees: "The dishes and prices.", does: 'Adds dishes, taps "Checkout".' });
  assert.deepEqual(splitCaption("Sees \u201CPayment failed\u201D. Taps Try again. Waits.", "en"),
    { sees: "\u201CPayment failed\u201D.", does: "Taps Try again. Waits." });
  assert.deepEqual(splitCaption("Sees the order number.", "en"), { sees: "The order number.", does: "" });
  assert.deepEqual(splitCaption("يرى القائمة. يضغط ادفع.", "ar"), { sees: "القائمة.", does: "يضغط ادفع." });
});

test("a caption written the old way, without Sees, is all what the user does", () => {
  assert.deepEqual(splitCaption('Types email and password, taps "Sign in".', "en"),
    { sees: "", does: 'Types email and password, taps "Sign in".' });
  assert.deepEqual(splitCaption("Seesaw page opens.", "en"), { sees: "", does: "Seesaw page opens." });
  assert.deepEqual(splitCaption("", "en"), { sees: "", does: "" });
});

test("the page's colours follow the app: light or dark words, and readable words on the accent", () => {
  const dark = theme.theme("#0a0e0d", "#62d49f");
  assert.equal(dark.dark, true);
  assert.ok(theme.contrast(dark.ink, dark.bg) > 7, "words on a dark stage are light");
  assert.ok(theme.contrast(dark.onAcc, dark.acc) > 4.5, "words on the accent can be read");
  const light = theme.theme("#f3f4f6", "#0b7a83");
  assert.equal(light.dark, false);
  assert.ok(theme.contrast(light.ink, light.bg) > 7);
  assert.ok(theme.contrast(light.onAcc, light.acc) > 4.5);
  assert.ok(theme.contrast(light.mute, light.bg) > 3, "the small grey words can still be read");
  assert.ok(theme.contrast(dark.mute, dark.bg) > 3);
  assert.deepEqual(theme.theme("", "").acc, theme.DEFAULT.accent);
});

test("colours are read as 3 or 6 hex digits and nothing else", () => {
  assert.equal(theme.hex("#ABC"), "#aabbcc");
  assert.equal(theme.hex(" #0a0e0d "), "#0a0e0d");
  for (const bad of ["", "red", "#12", "#1234567", "0a0e0d", "#ggg", "rgb(1,2,3)"]) assert.equal(theme.hex(bad), "", bad);
});
