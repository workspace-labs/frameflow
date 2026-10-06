# Scope

## What it does

- Draws an app's **screens as a numbered storyboard**: frames left to right like a comic strip, a short
  caption under each ("Types email and password, taps Sign in"), blue arrows for the normal path, and
  red dashed frames for what happens when something goes wrong.
- For a **phone app, tablet app, desktop app or website**: the frame follows the kind (phone, tablet,
  app window, browser). A website can also show its phone version.
- **Before building**: simple sketches, so the client agrees on the screens before any code exists.
  **After building**: real screenshots, for the handover.
- **The client decides**: every storyboard has a version (v1, v2…) and is either a draft or
  "Approved" with the date.
- One page per user story (a default the person can change). A story too long for a page continues on a
  "part 2" page.
- Saves a **text copy** (`app-flow.md`) next to the page every time. It is the master copy that any agent
  can read, and updates start from it.
- English by default; **Arabic** (right to left) when asked.
- Works with Claude Code, Claude in the browser, ChatGPT/Codex, GitHub Copilot and Cursor. If the
  workflow-project skill is there, frameflow builds from its approved workflow.

## What it will NOT do

- No workflow or swimlane of a whole process (that is workflow-project's job).
- No building of the app itself, and no code generation.
- No installing anything on the person's computer. It suggests workflow-project once, and installs only on
  the person's yes.
- No network access, no data collection, no accounts: the page reads files next to it and nothing else.
- No redesign by the agent: the agent writes the text copy; the template owns the look.
- No dashboards, number tiles or charts.

## How good it must be

- **Clean or refused.** A caption that does not fit, a screen number that does not exist, a missing
  "back to" on an error frame: the page shows a numbered list of plain-language problems instead of a
  messy drawing.
- **Nothing to install.** A browser is the only need. The fonts travel inside the template.
- **Same look everywhere.** White page, thin blue top line, Plus Jakarta Sans, one blue accent word; the
  approved B2 storyboard. A stranger's storyboard carries their own name (or none) and one small line:
  "Made with frameflow · by WorkSpace Labs".
- **Private by default.** Before real screenshots, the agent warns: use demo data, never real names,
  phone numbers or passwords.
- **Proven.** The reading rules have automated tests; every page kind is checked by eye on the drawn page.
