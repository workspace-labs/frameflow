# The questions

Ask only what you do not already know, in rounds of two or three. Each answer can open a sharper question.
Offer clickable choices where your tool has them, always with a way to type their own answer. Never fill a
gap with a guess: an unknown screen, tap or error is a question, not an invention.

## Contents

- The two first questions
- Understanding the screens
- Reading a workflow
- The read-back
- After building

## The two first questions

**1. What kind of project is it?**
Phone app · Tablet app · Desktop app · Website · Other.
"Other" (a watch, a TV, a kiosk): pick the closest frame and say which one you picked.
For a website, also ask once: *"Should each page also show its phone version?"* Default: no.

**2. Do you have a workflow for this project?** (skip it if frameflow was started from a finished workflow)
- **Yes** → *"Share it with me"*: the workflow's `.json` file (best) or its PDF. Read it, then ask only what it
  does not already answer.
- **No** → recommend the workflow-project skill once, in one or two sentences: *"I recommend making the
  workflow first with workflow-project. It shows how the whole project works, and the client approves it
  before the screens."* Give the link https://github.com/workspace-labs/workflow-project and, where the person
  can run commands, `npx skills add workspace-labs/workflow-project -g`.
  - They say yes → install only now, with their yes (or explain how to upload it in Claude in the browser:
    Customize → Skills). Make the workflow, then come back here.
  - They say no → *"No problem."* Go on with your own questions. Do not ask again for this project.

**Are the screens already designed and approved?** (a demo, mockups, a design file)
- **Yes** → the frames show those designs from the first version (a picture of each screen, with demo data),
  never grey sketches. Ask where they are if you do not know.
- **No** → sketches until the app is built.

## Understanding the screens

**3. Who uses it?** One kind of user, or several (a customer and an admin)? Each kind of user gets its own
stories.

**4. What does the user want to achieve?** For example, book a visit with a doctor or send a file to
a teammate. Use this for `goal`.

**5. Where does the flow start?** Ask what the user sees first, such as a welcome screen or home page.
Use this for `starts`.

**6. Where does the flow end?** Ask what the user sees when they have reached the goal, such as an order
confirmation. Use this for `ends`.

**7. What are the main things a user does?** Signing in, ordering, booking, paying and changing settings
can each be a story. Make sure each story has an ending.

**8. What do they see, tap or click at each step?** Ask about one story at a time. If a screen has two
possible next steps, ask the question that decides the route and where each answer leads.

**9. What can go wrong?** A wrong password, a lost connection, a refused card or a time already taken.
Ask where the user can go from each error screen, or whether the story ends there.

Good follow-ups when an answer is thin: *"What does the button say?"*, *"Where does that take them?"*,
*"Can they go back from here?"*, *"Is that one screen or two?"*

## Reading a workflow

A workflow-project file (`.json`) has `parts` (the stages) and, in each, `nodes` with a `lane` (who does it).
The steps in the user's lane, in order, are where screens come from:

- A step the user does ("Fills in the form") → a screen with that action in its caption.
- A decision that sends the user along two routes → a `?` line under the screen where the route is
  decided. A failure the user sees also needs a `!` line if it has its own error page.
- A `stop` the user sees → a "! … → end" frame. An `end` → the last screen of a story.
- Steps done by people or systems the user never sees (a manager, a server) → no screen of their own, but
  what the user sees as a result can be a caption ("Sees the request is waiting").

The workflow tells you the steps, not the screens: confirm the screens with the person in the read-back.

## The read-back

Before drawing anything, say the plan back in your own words and wait for their yes:

> *"I'll draw 3 stories: **Signing in** (3 screens) · **Ordering food** (6 screens, with 2 things that can go
> wrong on Pay) · **Settings** (2 screens). That's 13 screen and error pages plus the cover, flow map and
> path check. Is that right?"*

They can keep it, merge two stories, split one, rename them or change the order. Draw only after *"yes,
that's it"*. Every screen and every "if it goes wrong" is its own page: say the page count in the read-back.

## After building

- *"Do you want me to update the app flow to match what was built?"*
- Before any screenshot: *"Use demo data on screen first: no real names, phone numbers, emails or
  passwords."*
- *"Is anything different from the approved storyboard?"* (a screen added, removed or changed). Changes are
  written into the text copy and shown as a new version.
