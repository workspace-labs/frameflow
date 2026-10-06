// The reading rules: good text copies are read correctly; broken ones are refused in plain words.
// Run from the repository root: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parse, VERSION } = require("../skills/frameflow/assets/template/frameflow/model.js");

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
  assert.equal(pay.caption, 'Enters the card, taps "Pay now".');
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

test("a screen needs its sketch, a known sketch, and a caption", () => {
  refusedWith(board(["## Buy", "1. Home: Sees products."]), 6, "missing its sketch");
  refusedWith(board(["## Buy", "1. Home [carousel]: Sees products."]), 6, '"carousel" is not a sketch');
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
  refusedWith(board(["## Buy", "1. Home [grid]: " + "Sees a very long caption ".repeat(5)]), 6, "Keep it to 90");
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
