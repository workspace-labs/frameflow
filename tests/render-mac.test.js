// Exercise shell preparation without opening WebKit. Old shared paths are redirected only in the
// disposable tool copy, so these regressions never read or run a user's cached renderer.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const TOOLS = path.join(__dirname, "../tools");
const MARKDOWN = "# Demo\n- kind: phone\n## Visit\n1. Home [grid]: Sees the page.\n";

function shellPrerequisiteSkip(platform, access = fs.accessSync, probe = spawnSync) {
  if (platform === "win32") return "Shell helper fixtures require POSIX /bin/sh and Python3";
  const unavailable = (error) => error && ["ENOENT", "ENOTDIR", "EACCES"].includes(error.code);
  try { access("/bin/sh", fs.constants.X_OK); }
  catch (error) {
    if (unavailable(error)) return "Shell helper fixtures skipped: executable /bin/sh is unavailable";
    throw error;
  }
  const python = probe("python3", ["--version"], { encoding: "utf8", timeout: 3000 });
  if (unavailable(python.error)) return "Shell helper fixtures skipped: Python3 is unavailable";
  // An installed but broken or stalled prerequisite must remain a real failure.
  assert.ifError(python.error);
  assert.equal(python.status, 0, "Python3 prerequisite probe failed: " + python.stderr);
  return false;
}
const skipShell = shellPrerequisiteSkip(process.platform);

test("shell prerequisites skip only unavailable helper runtimes", () => {
  const absent = Object.assign(new Error("missing"), { code: "ENOENT" });
  const never = () => { throw new Error("Windows must not probe POSIX executables"); };
  assert.match(shellPrerequisiteSkip("win32", never, never), /POSIX/);
  assert.match(shellPrerequisiteSkip("linux", () => { throw absent; }, never), /\/bin\/sh/);
  assert.match(shellPrerequisiteSkip("linux", () => {}, () => ({ error: absent })), /Python3/);
  assert.equal(shellPrerequisiteSkip("darwin", () => {}, () => ({ status: 0 })), false);
  assert.throws(() => shellPrerequisiteSkip("darwin", () => {}, () => ({ status: 1, stderr: "broken" })), /probe failed/);
  assert.throws(() => shellPrerequisiteSkip("darwin", () => {}, () => ({ error: Object.assign(new Error("stalled"), { code: "ETIMEDOUT" }) })), /stalled/);
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "frameflow-tool-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const tools = path.join(root, "tools");
  const tmp = path.join(root, "tmp");
  const legacy = path.join(root, "legacy-output");
  const commands = path.join(root, "commands");
  const template = path.join(root, "skills/frameflow/assets/template");
  for (const dir of [tools, tmp, legacy, commands, path.join(template, "frameflow")]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // This changes the historical hardcoded path only inside our private scratch copy.
  const shell = fs.readFileSync(path.join(TOOLS, "render-mac.sh"), "utf8")
    .replaceAll("/tmp/frameflow-render", legacy);
  fs.writeFileSync(path.join(tools, "render-mac.sh"), shell);
  fs.copyFileSync(path.join(TOOLS, "render-mac.swift"), path.join(tools, "render-mac.swift"));
  fs.writeFileSync(path.join(template, "storyboard.html"),
    '<!doctype html><script type="text/markdown" id="app-flow">\nplaceholder\n</script>\n');
  fs.writeFileSync(path.join(template, "frameflow", "test-asset.txt"), "template fixture\n");
  const renderer = path.join(root, "fake-renderer");
  const invocationLog = path.join(root, "invocations.jsonl");
  const compileLog = path.join(root, "compiles.jsonl");
  fs.writeFileSync(renderer, `#!${process.execPath}
const fs = require("node:fs"), path = require("node:path");
const [page, out] = process.argv.slice(2);
const files = [];
function walk(dir, prefix = "") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    files.push(name);
    if (entry.isDirectory()) walk(path.join(dir, entry.name), name + "/");
  }
}
walk(out);
fs.appendFileSync(process.env.INVOCATION_LOG, JSON.stringify({
  page, out, files, html: fs.readFileSync(page, "utf8"),
  mode: fs.statSync(out).mode & 0o777, executable: process.argv[1]
}) + "\\n");
for (let i = 1; i <= Number(process.env.STUB_PAGES || 1); i++) {
  fs.writeFileSync(path.join(out, "page-" + String(i).padStart(2, "0") + ".png"), "test PNG " + i);
}
fs.writeFileSync(path.join(out, "storyboard.pdf"), "test PDF");
`, { mode: 0o700 });
  fs.writeFileSync(path.join(commands, "swiftc"), `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2), out = args[args.indexOf("-o") + 1];
fs.appendFileSync(process.env.COMPILE_LOG, JSON.stringify({ out }) + "\\n");
fs.copyFileSync(process.env.FAKE_RENDERER, out);
fs.chmodSync(out, 0o700);
`, { mode: 0o700 });
  function input(dir, text = MARKDOWN, screenshot = false) {
    const folder = path.join(root, dir);
    fs.mkdirSync(folder, { recursive: true });
    const file = path.join(folder, "app-flow.md");
    fs.writeFileSync(file, text);
    if (screenshot) {
      fs.mkdirSync(path.join(folder, "screenshots"));
      fs.writeFileSync(path.join(folder, "screenshots", "demo.png"), "demo screenshot A");
    }
    return file;
  }
  function run(file, pages = 1) {
    return spawnSync("/bin/sh", [path.join(tools, "render-mac.sh"), file], {
      encoding: "utf8", timeout: 10000,
      env: { ...process.env, PATH: commands + path.delimiter + process.env.PATH,
        TMPDIR: tmp, FAKE_RENDERER: renderer, INVOCATION_LOG: invocationLog,
        COMPILE_LOG: compileLog, STUB_PAGES: String(pages) }
    });
  }
  function records(file) {
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
  }
  function preparedPages() {
    const pages = [];
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (entry.name === "storyboard.html") pages.push(file);
      }
    }
    walk(tmp); walk(legacy);
    return pages;
  }
  return { root, legacy, input, run, invocationLog, compileLog, records, preparedPages };
}

test("same-name renders cannot carry another input's screenshots", { skip: skipShell }, (t) => {
  const f = fixture(t);
  assert.equal(f.run(f.input("A", MARKDOWN, true)).status, 0);
  assert.equal(f.run(f.input("B")).status, 0);
  const [a, b] = f.records(f.invocationLog);
  assert.ok(a.files.includes("screenshots/demo.png"));
  assert.ok(!b.files.includes("screenshots/demo.png"), "A's screenshot reached B's renderer");
  assert.notEqual(a.out, b.out);
});

test("a shorter rerender cannot retain stale page PNGs", { skip: skipShell }, (t) => {
  const f = fixture(t);
  const input = f.input("A");
  assert.equal(f.run(input, 2).status, 0);
  assert.equal(f.run(input, 1).status, 0);
  const [a, b] = f.records(f.invocationLog);
  assert.ok(!b.files.includes("page-02.png"), "the previous render's second page remained");
  assert.equal(fs.readFileSync(path.join(a.out, "page-02.png"), "utf8"), "test PNG 2");
});

test("a pre-existing shared executable is never trusted", { skip: skipShell }, (t) => {
  const f = fixture(t);
  const marker = path.join(f.root, "cached-executed");
  const cached = path.join(f.legacy, ".render-mac");
  fs.writeFileSync(cached, `#!${process.execPath}\nrequire("node:fs").writeFileSync(${JSON.stringify(marker)}, "cached");\n`, { mode: 0o700 });
  const future = new Date(Date.now() + 60000);
  fs.utimesSync(cached, future, future);
  assert.equal(f.run(f.input("A")).status, 0);
  assert.equal(fs.existsSync(marker), false, "the shared cached executable ran");
  assert.equal(f.records(f.compileLog).length, 1);
  const [render] = f.records(f.invocationLog);
  assert.equal(render.mode, 0o700, "render workspace must be private");
  assert.equal(path.dirname(render.executable), render.out);
});

for (const close of ["</script>", "</ScRiPt   >", `</script
>`, "</script/>"]) {
  test(`Markdown containing ${JSON.stringify(close)} is refused before rendering`, { skip: skipShell }, (t) => {
    const f = fixture(t);
    // No ordinary closing tag follows the variant: an exact-only guard must fail this test.
    const result = f.run(f.input("A", MARKDOWN + close + "inert delimiter fixture\n"));
    assert.notEqual(result.status, 0, "unsafe Markdown was accepted");
    assert.match(result.stderr, /closing.*script|script.*clos/i);
    assert.equal(f.records(f.invocationLog).length, 0, "WebKit must not be opened");
    assert.deepEqual(f.preparedPages(), [], "unsafe text must not be written to a page");
  });
}

test("ordinary Markdown is embedded without changing its text", { skip: skipShell }, (t) => {
  const f = fixture(t);
  const text = MARKDOWN + "Notes with <script>, </scripture> and 2 < 3 stay as written.\n";
  assert.equal(f.run(f.input("A", text)).status, 0);
  const [render] = f.records(f.invocationLog);
  assert.ok(render.html.includes(text));
});

for (const suffix of ["</script", "<!--<script>swallowed template"]) {
  test(`Markdown raw-text delimiter ${JSON.stringify(suffix)} is refused before rendering`, { skip: skipShell }, (t) => {
    const f = fixture(t);
    const result = f.run(f.input("A", MARKDOWN + suffix));
    assert.notEqual(result.status, 0, "unsafe Markdown was accepted");
    assert.match(result.stderr, /script|comment/i);
    assert.equal(f.records(f.invocationLog).length, 0);
    assert.deepEqual(f.preparedPages(), []);
  });
}

// Native failures use a tiny local ready page and an offscreen prohibited-activation app. Run with
// FRAMEFLOW_NATIVE_TESTS=1 on a Mac with Xcode tools and a GUI session; restricted sandboxes may block
// WebKit itself. No external data or network is used by these fixtures.
const skipNative = process.platform !== "darwin" || process.env.FRAMEFLOW_NATIVE_TESTS !== "1";
let native;
function nativeFixture(t) {
  if (!native) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "frameflow-native-test-"));
    const binary = path.join(root, "renderer");
    const build = spawnSync("swiftc", ["-O", path.join(TOOLS, "render-mac.swift"), "-o", binary], {
      encoding: "utf8", timeout: 60000
    });
    native = { root, binary, build };
  }
  assert.equal(native.build.status, 0, native.build.stderr || String(native.build.error));
  const root = fs.mkdtempSync(path.join(native.root, "run-"));
  const out = path.join(root, "out");
  fs.mkdirSync(out);
  const page = path.join(root, "ready.html");
  fs.writeFileSync(page, '<!doctype html><html data-frameflow="ready"><style>.page{width:100px;height:100px;background:white}</style><div class="page">Local fixture</div></html>');
  return { root, out, page, run(file = page, timeout = 15000) {
    return spawnSync(native.binary, [file, out], { encoding: "utf8", timeout });
  } };
}
test.after(() => { if (native) fs.rmSync(native.root, { recursive: true, force: true }); });

test("native ready-page control writes its PNG and PDF", { skip: skipNative }, (t) => {
  const f = nativeFixture(t);
  const result = f.run();
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(fs.readFileSync(path.join(f.out, "page-01.png")).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(fs.readFileSync(path.join(f.out, "storyboard.pdf")).subarray(0, 5).toString(), "%PDF-");
});

test("native PNG write failure exits with an error", { skip: skipNative }, (t) => {
  const f = nativeFixture(t);
  fs.mkdirSync(path.join(f.out, "page-01.png")); // Writing a file over a directory must fail.
  const result = f.run();
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /page-01\.png|snapshot 1/i);
  assert.doesNotMatch(result.stdout, /READY/);
  assert.equal(fs.existsSync(path.join(f.out, "storyboard.pdf")), false);
});

test("native provisional navigation failure exits instead of hanging", { skip: skipNative }, (t) => {
  const f = nativeFixture(t);
  const result = f.run(path.join(f.root, "missing.html"), 5000);
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /load failed/i);
});
