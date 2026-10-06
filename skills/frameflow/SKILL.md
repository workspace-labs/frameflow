---
name: frameflow
description: "Use when someone wants an app flow: the screens a user sees and taps in a phone app, tablet app, desktop app or website, drawn as a numbered storyboard (frames left to right, a caption under each, and what happens when something goes wrong) for a client to approve. Before building it draws sketches; after building it is updated with real screenshots. Also when asked for a user flow, a screen flow or a storyboard of an app's screens, or to update one. Not for how a whole process works or who does what (that is a workflow or swimlane), and not for designing or building the screens themselves."
---

# frameflow

An app flow, drawn as a storyboard: numbered screens left to right like a comic strip, a short caption under
each, blue arrows for the normal path, red dashed frames for what happens when something goes wrong. The
client approves it before anything is built. After building, the sketches are swapped for real screenshots.

It is two files in the project's `docs/app-flow/`: **`app-flow.md`**, the text copy (the master, which any
agent can read), and **`storyboard.html`**, the page that draws it, plus the PDF printed from that page. A
browser is the only need: nothing to install.

## When

- Someone wants the screens of an app or website mapped: "make the app flow", "the user flow", "what screens
  do we need", "a storyboard for the client".
- A storyboard exists and needs changes, approval, or real screenshots after building: update the same one.
- **Not** for a whole process with several people or systems (that is a workflow; the workflow-project
  skill draws those), and not for designing the screens' look or writing their code.

## The principle: smart defaults, the person decides

Always suggest the best way and say why in one sentence. The person can always say "no, do it my way". Only
real limits (a page's size, the shape of the text copy) cannot be overruled; explain them plainly.

## 1. Start: two questions

Ask these first, as in [references/questions.md](references/questions.md):

1. **What kind of project is it?** Phone app, tablet app, desktop app or website. It sets the frame.
2. **Do you have a workflow for this project?** Yes: ask them to share it and build from it. No: recommend
   the workflow-project skill **once**; install it only on their yes, never silently; if they say no, go on
   without it and do not ask again.

Started right after a finished workflow? You already have it: skip question 2.

## 2. Understand the screens

Ask the rest of [references/questions.md](references/questions.md) in rounds of two or three: who uses it,
what they see first, the main things they do (each becomes a story), each story step by step, what can go
wrong, where it ends. **Never invent a screen, a tap or an error.** Anything unknown is a question.

## 3. Read it back

Say the plan back and wait for *"yes, that's it"*: the stories, one page each by default, with their screen
counts and what can go wrong. The person may merge, split, rename or reorder. A story longer than one page
continues on a "part 2" page; say so.

## 4. Write the text copy

Write `docs/app-flow/app-flow.md` in the shape in
[references/storyboard-format.md](references/storyboard-format.md). Save it by default, without asking: it is
the master copy. English unless the person asks for Arabic (`- language: ar`: the whole page reads right to
left). Start at version 1 and `status: draft`.

- **A storyboard already there?** If `docs/app-flow/` already has `app-flow.md` or `storyboard.html`, read
  them first and update them. Never write over someone's file with a new one.
- **"No text file"?** Respect it: do not save `app-flow.md`. The same text then lives only inside
  `storyboard.html` (its app-flow block, next step), and that block is the master: read it, change it there,
  and never copy the template over that page again. Everything below that says `app-flow.md` means that
  block.

## 5. Draw it

1. **Copy** into `docs/app-flow/` every file of this skill's `assets/template/` folder that is not there yet:
   `storyboard.html`, and the `frameflow/` folder with everything in it. Copy the files; never retype them.
   Never replace a file that is already there: on an update, copy only what is missing (for example, only
   `app-flow.md` is there: copy the page and the folder).
2. In `docs/app-flow/storyboard.html`, replace only the text between
   `<script type="text/markdown" id="app-flow">` and `</script>` with the exact text of `app-flow.md`,
   starting at the left edge. Change nothing else in the template: the look is fixed.
3. Check the page drew and make the PDF: [references/pdf.md](references/pdf.md). If it refuses, fix
   `app-flow.md` by the line numbers it gives, copy it in again, check again. Never edit the template to
   silence a refusal.
4. Look at the pages if you can. Does every screen match what the person said? Is every "if it goes wrong"
   there?

## 6. The client's approval

Hand it over in two to four plain sentences (how many stories, pages and screens; what is still open), then
ask: *"Did the client agree, or do they want changes?"*

- **Changes** → change `app-flow.md` and raise `version` by one. A new version is a draft until the client
  agrees to it: set `status: draft` and delete the `approved:` line (the old approval was for the old
  version). Copy it into the page, draw it again, show it again. As many rounds as needed.
- **Agreed** → only now set `status: approved` and add `approved:` with the day they agreed, draw it again.
  Building can start.

## 7. After building

Offer once: *"Do you want me to update the app flow to match what was built?"* Then:

1. **Warn first:** use demo data on screen, never real names, phone numbers, emails or passwords.
2. **Screenshots:** take them yourself only with a tool you already have (a browser you can drive, a
   simulator). Never install anything to get one. Otherwise ask the person to put them in
   `docs/app-flow/screenshots/`, named by story and screen (`1-2-home.png` is story 1, screen 2).
3. Add a `shot:` line under each screen (format in
   [references/storyboard-format.md](references/storyboard-format.md)). A missing picture keeps its sketch
   with "Screenshot missing"; the page never breaks.
4. Change captions and screens to what was really built and raise the version. As in step 6, the new version
   is a draft: set `status: draft`, delete the `approved:` line, say plainly what changed since the approved
   version (or "only the real screenshots"), and ask the client to agree again.

## Rules

- `app-flow.md` is the master. When the page and the file disagree, the file wins: copy it into the page
  again. (With "no text file", the page's app-flow block is the master.)
- Never change the template's layout, colours or fonts. The person's own name goes in `- by:`; the page
  carries one small "Made with frameflow · by WorkSpace Labs" line on its last page.
- Never install anything without the person's yes. Ask once; never nag.
- No network: screenshots are files next to the page, never web links.
- Keep the person's words: captions say what the user sees and does, in plain language.

## Limits

Say these when they matter:

- Up to 12 stories and 24 screens a story; up to two "if it goes wrong" frames under a screen.
- Six screens fit on a page (three rows of two for desktop and websites, two rows of three otherwise); "if it
  goes wrong" frames take room, so a story continues on a "part 2" page.
- English and Arabic only.
- Each website screen is a browser window; `phone-version: yes` adds a small phone over its corner.
- Never write the characters `</script>` in `app-flow.md`: they would end the page's copy early.

## Files

| File | What it is |
|---|---|
| `references/questions.md` | the questions to ask, how to read a workflow, the read-back |
| `references/storyboard-format.md` | the shape of `app-flow.md`, and what the page refuses |
| `references/pdf.md` | checking the drawn page and making the PDF on any computer |
| `assets/template/` | the page (`storyboard.html`) and its `frameflow/` folder: the look, the reading and drawing code, and the fonts (SIL Open Font License) |
| `examples/` | complete text copies: a phone app, a phone app in Arabic, a website with its phone version, a desktop app, a tablet app |
