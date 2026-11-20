# 0004. Draw the flow map and path check together when they fit

- Status: accepted
- Date: 2026-11-20
- Decided by: the owner

## Context

The storyboard shows each screen at a readable size. A reader also needs to see where each story begins,
how its decisions branch and whether a user can finish or recover from an error. The text copy already
contains screens, their destinations and their error routes. Adding explicit decisions lets the template
draw the map and run the path check from the same source.

## Options weighed

1. **A, Rows.** Full-size horizontal rows leave more room for branches and long stories. The map and
   check use separate pages.
2. **B, Columns.** Vertical paths use a column for each part and branch to its side.
3. **C, Map + check.** A compact row map, goal cards and four checks share a page, giving the reader an
   overview immediately after the cover.

## Decision

Use C when the map takes at most four lines and fits at 0.70 scale. Put the goal, start and end cards above
the map, the colour key below it and the path check beside it. Use A when the compact map does not fit.
It gets up to four lines per page, followed by a page for the three cards and check. The template chooses
automatically. A plain text line gives counts for steps, decisions and wrong ways.

Each story is a separate task. A later story can start again at Home, so the line that linked one story
to the next in the demo would imply a transition that does not exist. Give each story its own Start and
End, and connect wrapped lines within the same story. Arabic mirrors the page right to left.

Keep the app's stage and accent as the basis for map colours. In these rules, `mix(a, b, n)` uses a
proportion `n` of colour `a` and the rest of colour `b`.

- Step boxes use `mix(accent, stage, 0.14)` for fill and `mix(accent, stage, 0.45)` for the border.
  Start and End use the same colours at `0.26` and `0.55`. Their text starts from `ink`.
- When the accent is within 40° of the theme red on the hue wheel, use `mix(ink, stage, 0.08)` for
  the fill and `mix(ink, stage, 0.3)` for the border of steps, start and end ovals, goal cards and the
  path check panel. This keeps red tints reserved for errors. Their primary text starts from `ink`
  and uses the same contrast check.
- Error boxes use `mix(red, stage, 0.14)` for fill and `mix(red, stage, 0.5)` for the border.
- Light decisions use `#fde68a` fill, `#e3be3e` border and `#5b4300` text. Dark decisions use
  `mix("#f5c542", stage, 0.3)` fill, `#f5c542` border and `ink` text.
- Light completion boxes use `#cdefd9` fill, `#86cfa2` border and `#14532d` text. Dark completion boxes
  use `mix("#4ade80", stage, 0.22)` fill, `#4ade80` border and `ink` text.
- The normal connectors use `mute`. On light pages, the red box text and second answer start from
  `mix(red, ink, 0.7)` and the first answer starts from `mix("#15803d", ink, 0.7)`. On dark pages, they
  start from `red` and `#4ade80` respectively. Check map text at 4.5:1 against its background and adjust
  the text as needed. Outside the map, the storyboard uses its existing colour rules.

## Consequences

- Existing text copies supply default card text. The optional settings let an author explain the user
  goal and outcome directly.
- The graph drives the path check. An unresolved check remains visible to the client with details.
- The inserted pages count in the contents and page numbers. Screen and error pages retain their
  existing layout and order.
