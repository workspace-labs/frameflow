# 0002. The text copy is the master

- Status: accepted
- Date: 2026-10-06
- Decided by: the owner ("the skill doesn't ask": the text copy is always saved), with the builder's
  recommendation for its shape

## Context

The storyboard has two readers. People read the page or the PDF; agents read text far better than
pictures. Updates (a client's changes, real screenshots after building) must not start from zero.

## Options weighed

1. **JSON data inside the page.** Strict, but hard for a person to read, and agents escape quotes wrongly.
2. **A short Markdown file in a fixed shape** (`app-flow.md`). A person and every agent can read it; a
   small strict reader can refuse a line that does not fit the shape.
3. **The agent writes HTML directly.** No reader needed, but the look would drift from storyboard to
   storyboard.

## Decision

Option 2. `app-flow.md` is the master. The page carries an exact copy of it in
`<script type="text/markdown" id="app-flow">`, because browsers do not let a page opened from disk read a
file next to it. After every change the agent edits `app-flow.md` first, then replaces the page's copy
with it, word for word.

## Consequences

- The shape is documented in `skills/frameflow/references/storyboard-format.md` and enforced by
  `model.js`, which refuses in plain words.
- Two copies of the same text exist; the skill's instructions say which one wins (the `.md`) and how to
  re-sync.
