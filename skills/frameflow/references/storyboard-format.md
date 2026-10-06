# The text copy: `app-flow.md`

The storyboard is written as one short Markdown file in a fixed shape. It is the **master copy**: the
page draws from it, and every update starts from it. The page refuses a line that does not fit the shape,
and says which line and what to change.

## Contents

- A complete small file
- The heading and settings
- Stories
- Screens
- When something goes wrong
- Screenshots
- Sketches
- Limits
- What the page refuses

## A complete small file

```markdown
# Food Delivery App

- kind: phone
- client: Sample client
- about: Order a meal from nearby restaurants and track it to the door.
- version: 1
- status: draft
- date: 2026-10-06

## Ordering food
From opening the app to the order confirmed.

1. Sign in [form]: Types email and password, taps "Sign in". → 2
   ! Wrong password: Sees a red message, taps "Try again". → 1
2. Home [grid]: Sees nearby restaurants, taps one. → 3
3. Menu [list]: Adds dishes, taps "Checkout". → 4
4. Pay [form]: Enters the card, taps "Pay". → 5
   ! Card refused: Sees "Payment failed", taps "Try again". → 4
5. Confirmed [done]: Sees the order number and the time.
```

## The heading and settings

The file starts with one `# ` line: the project's name. Settings follow, one per line, as `- key: value`.

| Key | Needed | Value |
|---|---|---|
| `kind` | yes | `phone`, `tablet`, `desktop` or `website`. It sets the frame. |
| `language` | no | `en` (default) or `ar`. Arabic turns the whole page right to left. |
| `client` | no | Who it is for. Shown as "Prepared for" on the cover. |
| `by` | no | Who made it: the person's or company's own name. Shown as "Prepared by". |
| `about` | no | One sentence: what the app is. Shown on the cover. |
| `version` | no | A whole number: `1`, `2`, `3`… Default `1`. Shown as v1, v2… |
| `status` | no | `draft` (default) or `approved`. |
| `approved` | when `status: approved` | The day the client approved it: `YYYY-MM-DD`. |
| `date` | no | The day of this version: `YYYY-MM-DD`. |
| `phone-version` | no | `yes` or `no` (default). Websites only: each browser frame also shows a small phone. |

## Stories

Each `## ` line starts a story: one thing a user does from start to end ("Signing in", "Ordering food").
Each story gets its own page. An optional single line under the title says what the story covers.

## Screens

Screens are numbered from 1 in each story, in the order the user sees them:

```
3. Menu [list]: Adds dishes, taps "Checkout". → 4
```

- `3.` the screen's number. Numbers go 1, 2, 3… with no gaps.
- `Menu` the screen's name, a few words.
- `[list]` the sketch drawn in the frame before there is a screenshot (see Sketches).
- `: Adds dishes, taps "Checkout".` the caption: what the user sees and does. Start with a verb.
- `→ 4` where the tap goes. Leave it out to go to the next screen; the last screen with nothing after it
  is the end. `→ end` ends the story early. `->` works too, and Arabic digits (`→ ٤`) read as numbers.
- The last arrow on a line must be followed by a number or `end` and nothing else; anything else
  (`→ banana`, `→ 2 3`, `→ end now`) is refused.
  An arrow inside the caption is fine when the target comes after it: `Swipes left → right → 4`.

## When something goes wrong

An indented line starting with `!` under a screen is what that screen shows when something goes wrong.
It is drawn as a red dashed frame below its screen:

```
4. Pay [form]: Enters the card, taps "Pay". → 5
   ! Card refused: Sees "Payment failed", taps "Try again". → 4
```

- It needs a way out: `→ 4` (back to a screen in this story) or `→ end` (it stops there).
- At most two per screen. More than that is its own story.

## Screenshots

After building, real screenshots replace the sketches. Put an indented `shot:` line under the screen (or
under its `!` line) with the picture's path, relative to the storyboard page. The picture must be in the
page's folder or a folder below it, with folders split by `/`. Any name a Mac and Windows both allow works
(`1-2+home.png`, `Bob's home.png`, `home & away.png`). Refused: web links, a drive or `/` at the start, `..`,
a name ending in a space or a dot, and the characters `< > : " \ | ? * % #`.

```
2. Home [grid]: Sees nearby restaurants, taps one. → 3
   shot: screenshots/1-2-home.png
```

- Name the files by story and screen number: `1-2-home.png` is story 1, screen 2.
- For a website with `phone-version: yes`, a `phone-shot:` line gives the phone picture.
- A missing picture keeps its sketch, with a small "Screenshot missing" note. The page never breaks.
- The whole picture is shown, never cropped or stretched; a picture shaped differently from the frame
  leaves light grey room around it.
- PNG, JPG or WebP. Use demo data: no real names, phone numbers, emails or passwords.

## Sketches

| Sketch | Drawn as | Use for |
|---|---|---|
| `form` | two fields and a button | sign in, sign up, payment, settings |
| `list` | rows | menus, messages, search results, orders |
| `grid` | cards | home pages, galleries, products |
| `detail` | a big picture, text and a button | a product, a profile, an article |
| `done` | a green tick and a line | confirmed, sent, saved |
| `message` | a block of text | a welcome, an explanation, a chat |
| `blank` | an empty screen | anything else |

## Limits

| What | Up to |
|---|---|
| Project name | 60 characters |
| Story title | 48 characters |
| Story line under the title | 140 characters |
| Screen or `!` name | 24 characters |
| Caption | 90 characters (a `!` caption: 70) |
| `client`, `by` | 60 characters |
| `about` | 200 characters |
| Stories | 12 |
| Screens in a story | 24 (a long story continues on a "part 2" page) |
| `!` frames under one screen | 2 |

## What the page refuses

The page draws nothing messy. Instead it lists numbered problems, each naming the line and what to
change, for example:

- `Line 9: screen 4 goes to screen 7, but this story has only 5 screens.`
- `Line 12: "Card refused" needs a way out: end the line with → and a screen number, or → end.`
- `Line 3: kind must be phone, tablet, desktop or website. It says "mobile".`
- `Screen 2 in "Ordering food": the caption does not fit under the frame. Shorten it.`

In an Arabic storyboard (`- language: ar`) the problem page reads right to left, and its heading, its line
labels and the "does not fit" problems are in Arabic. The other problems stay in English: they quote the
file's own English words (`kind`, `status`, `→ end`, the sketch names).
