# Scope

## What it does

- Draws an app's **screens as a numbered storyboard**: one screen a page, shown big, with a marker where
  the user taps; beside it the number and what the user sees and does; under it the story's other screens,
  small; and a red page for what happens when something goes wrong.
- For a **phone app, tablet app, desktop app or website**: the frame follows the kind (phone, tablet,
  app window, browser). A website can also show its phone version.
- **Before building**: approved screen designs from version 1 when available; otherwise simple sketches,
  so the client agrees on the screens before any code exists. **After building**: the real screens,
  including any differences from the earlier approved design.
- **The client decides**: every storyboard has a version (v1, v2…) and is either a draft or
  "Approved" with the date.
- One page per screen, on A4 lying on its side, grouped by user story.
- **Follows the app**: the pages take the app's own background and main button colour, and the frame its
  platform. The type, the page structure and the captions stay frameflow's; no brand logo on the pages.
- Saves a **text copy** (`app-flow.md`) next to the page by default. It is the master copy that any agent
  can read, and updates start from it. If the person explicitly asks for no text file, the page's
  app-flow block is the master instead; never replace it with the template.
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
- **Same structure everywhere.** The approved Cinema look (2026-11-11): the big number, Sees and Does, the
  big screen, the strip, Plus Jakarta Sans; only the two colours change with the app. A stranger's storyboard carries their own name (or none) and one small line:
  "Made with frameflow · by WorkSpace Labs".
- **Private by default.** Before real screenshots, the agent warns: use demo data, never real names,
  phone numbers or passwords.
- **Proven.** The reading rules have automated tests; every page kind is checked by eye on the drawn page.
