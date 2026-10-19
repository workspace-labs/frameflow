# How frameflow was tested

## Repair verification — 0.2.1, 19 October 2026

**Local result: 84/84 tests passed with native Mac checks enabled, and all six browser fixtures
rendered correctly.** This is new evidence for 0.2.1; the original 0.1.0 review is preserved below.

The repair started from [`bc84e2962d0edc5f3c344e68f7d2a3746a058ebd`](https://github.com/workspace-labs/frameflow/commit/bc84e2962d0edc5f3c344e68f7d2a3746a058ebd).
The final 23-file skill bundle has static-auditor digest
`8f9b27fc33782579a6edc59a616295cc8d676d29e03011948d86b9bda5e6f8d7`.
Tests, fixtures, helper tools and this evidence stay outside the installable skill.

### What was found and fixed

- Explicit empty screenshot lines were accepted as if no picture was requested. An empty first line
  also bypassed duplicate detection. They now refuse with the actual declaration line.
- Raw closing-script spellings could execute an inert browser test marker; an HTML-comment/script
  sequence swallowed the renderer resources and left no ready/refused state. The Mac preparation
  helper now refuses these tokens before writing a page or launching WebKit. The parser supports
  preflight refusal, and the skill/format explain the check before manual copying.
- Same-basename renders reused a shared directory: one project could inherit another project's images
  and stale pages. Each render now uses a new private directory and freshly compiled helper.
- A failed PNG write could still report success after making a PDF. It now fails with the image name.
- Missing-file provisional navigation never reached the old polling timeout. It now exits with a load
  error; an initial load that never finishes also has a bounded fallback.
- Read-back page counts, approved-design descriptions and current versus historical test claims were
  stale. Manual installation and ZIP creation now refuse existing destinations.

These were demonstrated by failing tests/probes before correction. The exact-only script-guard
mutation is also caught: mixed-case, real-newline and slash variants fail if protection is weakened.
No font, colour, frame dimension, page geometry or rendering-style change was made.

### Automated results

The original suite passed **67/67**. The final suite contains 70 reader/layout/string tests,
11 helper/precondition checks and 3 native Mac integration checks.

| Runtime on the local Mac | Result | Native checks |
|---|---|---|
| Node.js 18.20.8 | 81 passed, 0 failed | 3 explicitly skipped without opt-in |
| Node.js 20.20.2 | 81 passed, 0 failed | 3 explicitly skipped without opt-in |
| Node.js 22.23.1 | 81 passed, 0 failed | 3 explicitly skipped without opt-in |
| Node.js 20.20.2, native enabled | **84 passed, 0 failed, 0 skipped** | Real WebKit PNG/PDF control, PNG write failure and missing-file navigation |

Run from the repository root:

```bash
node --test
```

Core checks need only Node.js 18 or newer. Shell fixtures require an available POSIX shell and Python 3;
they explicitly skip when unavailable. Missing prerequisites are distinguished from installed tools
that fail. The Windows prerequisite decision is tested without pretending that Windows itself ran.
Native Mac checks need the existing Xcode command line tools and a GUI-capable session:

```bash
FRAMEFLOW_NATIVE_TESTS=1 node --test
```

Native windows remain hidden. Restricted process sandboxes can block WebKit; the recorded native
checks used a permitted local process run with a known-good fixture before testing failures.

### Browser and PDF output

The already-installed Google Chrome 155.0.8059.80 ran with isolated private profiles and external
traffic disabled. All five shipped examples plus the after-build fixture reported ready:

| Fixture | Pages including cover |
|---|---|
| Reading tablet | 2 |
| English food delivery | 6 |
| Desktop tasks | 3 |
| Arabic food delivery | 4 |
| Clinic website, with phone versions | 4 |
| After-build screenshot fixture | 3 |

All **22 page images** were inspected; their pixels and measured DOM geometry match the baseline.
The after-build fixture retained its three complete screenshots and its one intentionally missing
picture fallback. Wide-title inputs correctly refuse; tested maximum-name inputs did not wrap footers.

English and Arabic Chrome PDFs contain exactly **6 and 4 A4 pages** respectively, with no extra blank
pages. All ten rendered PDF pages were inspected. Page-isolation screenshots can hide SVG definitions
used by arrowheads; full-document PDFs were checked as well. Those temporary test artifacts are not
part of the installed package.

The repaired Mac helper was also run end to end on the English and Arabic examples in hidden WebKit
windows. It wrote six and four PNGs respectively, with matching six- and four-page PDFs in fresh
private directories.

Five unsafe baseline sources were independently retested through the actual Mac preparation helper:
each exits nonzero, writes no storyboard HTML/native binary and reaches neither compiler nor renderer.
The raw closing/comment payloads were not pasted directly into the final template for this check.

### Installation, archive and review

The documented Bash copy procedure was tested in disposable paths containing spaces and brackets.
All 23 files copied with identical SHA-256 hashes; 70 core tests passed against that installed copy.
Existing file, directory, symlink and broken-symlink destinations were refused without changing their
sentinels. Existing archive refusal also preserved its sentinel. A fresh dist/frameflow.zip passed CRC
validation and contains exactly the 23 source files with matching hashes, plus directory entries.

The standard skill validator passed. The same read-only auditor reported zero errors and zero review
warnings before and after repair. An independent source reviewer reran checks and found no remaining
blocking defect. Recovery snapshots and raw logs/manifests are retained outside the published skill.

The existing Codex and .agents skill copies were backed up and updated from the validated source.
Their complete 23-file SHA-256 manifests match, and the existing Claude symlink is preserved.

### Limits

- This is local Mac evidence across Node versions, not Windows/Linux or new CI execution. Native Windows,
  Edge, Firefox and Safari's Print dialog were not exercised in this repair.
- The initial-load 20-second fallback was not deliberately forced; successful navigation and the actual
  missing-file failure path were exercised.
- Embedding protection covers Markdown preparation/preflight. Arbitrary pre-existing HTML is trusted;
  manually pasting forbidden raw tokens into HTML bypasses the documented preparation check.
- Explicit skill selection and universal agent compliance are not established by runtime/package tests.
  No new full agent/client approval-loop dry run was performed; the earlier dry run remains historical.

---

## Historical verification record — 0.1.0, October 2026

frameflow was not just written. It was tested, then a second AI tried to break it, and every problem it found
was fixed before release. This page lists what was run and what was found, and is honest about what has not
been tried yet.

### At a glance

| What | Result |
|---|---|
| Automated tests | **64**, all passing on Node.js 18, 20 and 22 (30 for the reader, 34 for the page layout) |
| Independent review | **4 rounds** by a second AI (OpenAI Codex), which read the code and tried to break it. **Approved** on 2026-10-06 |
| Problems the review found | **11**: 1 high, 7 medium, 3 low. **All fixed** |
| Planted bugs | **8** deliberate breaks (4 in the reader, 4 in the layout). The tests caught **all 8** |
| Geometry check | Every example is checked automatically for overlapping boxes, anything off the page, and arrows through frames |
| Pages looked at | Every example drawn and every page looked at, then printed to A4 PDF in two browser engines (WebKit and Chromium) |
| Dry run | An agent followed `SKILL.md` word by word on a made-up gym-booking app, all the way to an A4 PDF |
| Skill audit | Static audit of the skill folder: no findings, and no trigger clash with other installed skills |

The release on GitHub has exactly the same skill folder, tests and tools as the approved code. Only status
wording changed.

### The automated tests

Run them yourself from the repository root (Node.js 18 or newer, needed for the tests only):

```bash
node --test
```

- **The reader** (`tests/model.test.js`): good storyboards are read correctly. Broken ones are refused with
  the line number and a plain-words reason. This covers wrong arrows, unknown screen kinds, too many screens,
  unsafe picture paths, and Arabic.
- **The layout** (`tests/layout.test.js`): every example and test storyboard is laid out and measured. No two
  boxes overlap, nothing leaves the A4 page, no arrow crosses a frame, and long stories split cleanly into
  "Part 2 of 3".

Every fix from the review left a test behind, so the same bug cannot come back silently.

### The independent review

Codex reviewed the skill as a stranger would. It read the real code, ran the tests, and tried its own
attacks. After each round the fixes went back to Codex, and Codex decided each time whether a finding was
really closed. Two findings were reopened and fixed again (F04 twice) before they closed.

| # | Severity | What Codex found | Fixed by |
|---|---|---|---|
| F01 | High | A screenshot's file path could be spelled so that the page loaded it from the internet | Only plain local file names are allowed, in every kind of frame. Checked with a browser network log against 22 hostile spellings: no network request |
| F02 | Medium | Screenshots were cropped to fill their frame | The whole screenshot is shown, never cropped or stretched |
| F03 | Medium | Changing an approved storyboard did not clear its approval | Any change sets it back to Draft until it is approved again |
| F04 | Medium | A mistyped arrow at the end of a line was quietly read as part of the caption | A bad target is refused by line number. Arrows inside a caption still work |
| F05 | Medium | Some problems were reported on the wrong line | Every problem names its real line |
| F06 | Medium | The cover could not fit the promised 12 stories | The contents list tightens itself to fit all 12 |
| F07 | Medium | Normal Arabic cover details could be clipped | The cover grows to fit, and real overflow is still refused |
| F08 | Low | The test command in the README failed on Node.js 22 | `node --test`, checked on Node.js 18, 20 and 22 |
| F09 | Low | Help messages on the page stayed English on an Arabic storyboard | The page's help messages follow the storyboard's language. The reader's problem messages stay English, by the owner's choice |
| F10 | Low | The skill's steps did not match an agreed rule about saving the text copy | The steps now follow it |
| F11 | Medium | Updating an existing storyboard could skip copying missing files (found in round 2) | The update step copies what is missing and keeps the person's own files |

### Not tried yet

These have not been tried yet. If you try one, an issue telling us how it went is welcome.

- Windows and Microsoft Edge, Firefox, and a normally installed Google Chrome (only a test build of Chromium
  was used)
- Safari's own Print dialog (only WebKit's automatic printing was used)
- A brand-new user who has never seen frameflow, following it from scratch
- AI tools other than the builder's: Claude in the browser, Copilot, Cursor, and Codex as the agent using the
  skill
