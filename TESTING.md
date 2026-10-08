# How frameflow was tested

frameflow was not just written. It was tested, then a second AI tried to break it, and every problem it found
was fixed before release. This page lists what was run and what was found, and is honest about what has not
been tried yet.

## At a glance

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

## The automated tests

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

## The independent review

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

## Not tried yet

These have not been tried yet. If you try one, an issue telling us how it went is welcome.

- Windows and Microsoft Edge, Firefox, and a normally installed Google Chrome (only a test build of Chromium
  was used)
- Safari's own Print dialog (only WebKit's automatic printing was used)
- A brand-new user who has never seen frameflow, following it from scratch
- AI tools other than the builder's: Claude in the browser, Copilot, Cursor, and Codex as the agent using the
  skill
