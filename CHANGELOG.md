# Changelog

All notable changes to this project. The version is `VERSION` in
`skills/frameflow/assets/template/frameflow/model.js`.

## [0.1.1] - 2026-10-09

### Added

- `TESTING.md`: how frameflow was tested. It lists the 64 automated tests, the 8 planted bugs the tests
  caught, the four review rounds by a second AI with all 11 findings and their fixes, and what has not been
  tried yet. The README links to it and gives a short summary. No change to the skill itself.

## [0.1.0] - 2026-10-06

The first release, built from the owner's decisions of 2026-10-06. Reviewed by Codex over four rounds and
approved on 2026-10-06; the fixes from those reviews are listed below and stay in 0.1.0. Not yet tried by a
fresh user or on Windows.

### Added

- The repository: scope, two decision records (an HTML template draws the storyboard; the text copy is the
  master), the fonts, and the picture.
- The text copy's shape (`references/storyboard-format.md`) and its reader, `model.js`, which refuses each
  problem by line number, in plain words.
- The storyboard page: a cover (name, about line, Draft or Approved with the date, the stories with their
  pages, who it is for), then each story on its own pages: numbered frames left to right, a caption under
  each, blue arrows (turning down to the next row), red dashed "if it goes wrong" frames with "Back to 3" or
  "Ends here", "Goes to 1" for a jump, and "Part 2 of 3" when a story is long. The small credit line sits at
  the bottom of the last page only.
- Four frame kinds: phone and tablet (six screens a page), desktop window and browser (six a page), and a
  small phone over each browser frame when a website has `phone-version: yes`.
- Clean or refused: after the fonts load the page measures every caption and refuses, by line, anything that
  does not fit. It reports `data-frameflow="ready"` or `"refused"` for an agent to check.
- Builder's checks: an independent geometry test (no overlaps, nothing off the page, no line through a box)
  for every example, and `tools/render-mac.sh` to draw page pictures and the PDF on a Mac.
- Arabic: the whole page right to left with Noto Naskh Arabic, fixed Arabic month names and counting words.
- Real screenshots in the frames after building; a missing one keeps its sketch with "Screenshot missing".
- `references/pdf.md`: check the drawn page, print with an installed Chrome or Edge, or the exact Print
  settings for the person. The tick is drawn, so the PDF needs no system font.
- `SKILL.md` and `references/questions.md`: the two first questions, the screens in rounds, the read-back,
  the client's approval loop and the after-building update. The template ships a five-line placeholder.
- The README for readers, five examples (phone, phone in Arabic, website with its phone version, desktop,
  tablet), and the zip for the Claude app.

### Fixed after the first Codex review (round 2)

- F01: a screenshot must be a plain file in the storyboard's folder or below it. Web links in any spelling
  (`https:host/a.png`, `https:/host`, `https:\\host`, `//host`), `data:`, a drive or `/` at the start, `\`,
  `%` and `..` are refused by line, for `shot:`, `phone-shot:` and a `!` line's `shot:`. The page also checks
  each path again before loading it and shows "Screenshot missing" instead.
- F02: screenshots are shown whole, never cropped or stretched (the owner's pick: light grey room around a
  picture shaped differently from its frame).
- F03: `SKILL.md`: a new version is a draft until the client agrees to it; the old `approved:` line is
  deleted on every change and after building, and only the client's yes stamps the new version.
- F04: the last arrow on a line must be followed by a screen number or `end`; `→ banana` and a bare `→` are
  refused, Arabic digits (`→ ٢`, `٢.`) read as numbers, and an arrow inside a caption still works.
- F05: problems name the real line: the project's name after blank lines, and every cover fit problem.
- F06 and F07: the cover holds all 12 stories and all five details in English and Arabic (the owner's pick:
  short covers stay exactly as approved; a long list or long details grow upward and push the name block
  up, with tighter rows above nine stories). Every cover box is at least as tall as what is in it, so
  nothing is clipped at any edge; the page refuses only when the name block runs out of room.
- F08: the test command is `node --test` (the old `node --test tests/` fails on Node 22).
- F09: in an Arabic storyboard the print help, the problem page's heading and instructions, its line labels
  and every fit problem are in Arabic, right to left. The reading rules' own messages stay in English.
- F10: `SKILL.md`: an existing storyboard is read and updated, never written over; "no text file" is
  respected, and the page's own copy then becomes the master.
- Tests: arrows are now checked against the format's own rules (every step to the next screen has its
  arrow, no other arrow is drawn), the badge and frame border are read from `frameflow.css` and compared
  with `layout.js`, and the turning arrows are part of the layout plan.

### Fixed after the second Codex review (round 3)

- F01: a screenshot's file name may use any character a Mac and Windows both allow (`1-2+home.png`,
  `Bob's-home.png`, `home & away.png`, `home,done.png`, `home~2.png`). Still refused: web links, a drive or
  `/` at the start, `..`, the characters `< > : " \ | ? * % #`, and now also a folder or file name ending in a
  space or a dot, which Windows drops. The page sends each name to the browser encoded, as a name.
- F04: the target is the last arrow on the line even without spaces (`Swipes left→right→2`); earlier arrows
  stay in the caption, on screen lines and `!` lines alike.
- F11: `SKILL.md` step 5 copies every template file that is missing (for example when only `app-flow.md` is
  there) and never replaces one that is already there.

### Fixed after the third Codex review (round 4)

- F04: the last arrow on a line is now always the target's arrow, whatever follows it, and everything after it
  must be a screen number or `end`. `→ banana word`, `→ 2 3` and `→ end extra` (and the same with `->`) are
  refused by line, on screen lines and `!` lines, instead of being drawn as an arrow to the next screen. A
  single arrow in the middle of a caption therefore needs a target after it (`Sees A → B → 3`).
