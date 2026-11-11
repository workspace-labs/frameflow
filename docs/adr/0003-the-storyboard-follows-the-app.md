# 0003. One screen a page, and the storyboard follows the app

- Status: accepted
- Date: 2026-11-11
- Decided by: the owner (look A, "Cinema", of three shown; then "every project I prefer with own color", and
  "build it" after seeing it on a phone app, a website, a desktop app and a tablet app)

## Context

The first look (B2: a white upright page, several small frames in rows, blue arrows) was approved in October
2026. Used on a real tablet app, it failed its purpose: each screen took a third of the page and could not be
read, nothing showed where the user taps, half the page was empty and the cover was bare. A client is asked
to approve these pages, so they must show the app clearly.

## Options weighed

Three looks were drawn from the same real story:

1. **Cinema**: A4 on its side, one screen a page shown big, the number and "Sees / Does" beside it, the
   story's other screens as a small strip underneath.
2. **Magnifier**: the whole story on one sheet, with zoom circles on the places that matter.
3. **Path**: an upright page, big screens, a thread drawn from each tap to the next screen.

And for colour: frameflow's own fixed colours on every storyboard, or the app's own.

## Decision

Cinema, and the storyboard follows its app: the pages take the app's background colour (`stage`) and its main
button colour (`accent`), and the frame follows the platform (phone, tablet, window, browser). frameflow keeps
its own type, page structure and captions, and puts no brand logo on the pages. A `tap:` line marks where the
user taps on a screen's picture. The old look is removed, not kept as an option.

## Consequences

- A storyboard has many more pages: one per screen and one per "if it goes wrong" line.
- The text copy keeps its shape (ADR 0002). Files written for the old look still read: `[sketch]` became
  optional, and a caption that does not start with "Sees" is printed whole under "Does".
- The other page colours (words, lines, the device's edge) are worked out from the two given, in `theme.js`,
  and an accent that cannot be seen on its stage is refused.
- A storyboard folder made with an older frameflow holds the old template; the skill replaces the template
  files there and keeps the text copy.
- The frame takes each picture's own shape, so the page can only place it once the picture has loaded.
