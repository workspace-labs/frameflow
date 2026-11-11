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
- Where the user taps
- Sketches
- Limits
- What the page refuses

## A complete small file

```markdown
# Food Delivery App

- kind: phone
- client: Sample client
- about: Order a meal from nearby restaurants and track it to the door.
- stage: #f3f4f6
- accent: #f2541b
- version: 1
- status: draft
- date: 2026-10-06

## Ordering food
From opening the app to the order confirmed.

1. Sign in [form]: Sees the email and password fields. Types them, taps "Sign in". → 2
   ! Wrong password: Sees a red message. Taps "Try again". → 1
2. Home [grid]: Sees nearby restaurants. Taps one. → 3
3. Menu [list]: Sees the dishes and prices. Adds dishes, taps "Checkout". → 4
4. Pay [form]: Sees the card form. Enters the card, taps "Pay". → 5
   ! Card refused: Sees "Payment failed". Taps "Try again". → 4
5. Confirmed [done]: Sees the order number and the time.
```

With an approved design or a built app, each screen also carries its picture and where the user taps:

```markdown
3. Menu: Sees the dishes and prices. Adds dishes, taps "Checkout". → 4
   shot: screenshots/1-3-menu.png
   tap: 92%, 56% Taps Checkout
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
| `stage` | no | The app's background colour, as hex: `#0a0e0d` or `#fff`. The pages take it as their background; a dark one turns the words light. |
| `accent` | no | The app's main button colour, as hex. The big number, the tap marker and "Does" are drawn in it. |
| `crop` | no | How much of every picture's top and bottom to cut off, to drop the device's own status or navigation bar: `top 4%`, `bottom 6%`, or both with a comma. Up to 25% each. |

The storyboard follows its app: `stage` and `accent` are the app's own two colours, taken from its design.
Without them the pages wear frameflow's own light grey and blue. The two must be different enough to see one
on the other, or the page refuses.

## Stories

Each `## ` line starts a story: one thing a user does from start to end ("Signing in", "Ordering food").
Every screen of a story gets its own page. An optional single line under the title says what the story
covers; it is printed beside the story's first screen.

## Screens

Screens are numbered from 1 in each story, in the order the user sees them:

```
3. Menu [list]: Sees the dishes and prices. Adds dishes, taps "Checkout". → 4
```

- `3.` the screen's number. Numbers go 1, 2, 3… with no gaps.
- `Menu` the screen's name, a few words.
- `[list]` the sketch drawn in the frame before there is a picture (see Sketches). Leave it out when the
  screen has a `shot:` line: `3. Menu: Sees…`
- `: Sees the dishes and prices. Adds dishes, taps "Checkout".` the caption. Start with **Sees**: the first
  sentence is printed under SEES, the rest under DOES, in the app's colour. (In Arabic start with `يرى`.) A
  caption that does not start with "Sees" is printed whole under DOES, as storyboards written before 0.3.0
  are.
- `→ 4` where the tap goes. Leave it out to go to the next screen; the last screen with nothing after it
  is the end. `→ end` ends the story early. `->` works too, and Arabic digits (`→ ٤`) read as numbers.
- The last arrow on a line must be followed by a number or `end` and nothing else; anything else
  (`→ banana`, `→ 2 3`, `→ end now`) is refused.
  An arrow inside the caption is fine when the target comes after it: `Swipes left → right → 4`.

## When something goes wrong

An indented line starting with `!` under a screen is what that screen shows when something goes wrong.
It gets its own page, right after its screen's page, drawn in red with "If it goes wrong" and the way back:

```
4. Pay [form]: Sees the card form. Enters the card, taps "Pay". → 5
   ! Card refused: Sees "Payment failed". Taps "Try again". → 4
```

- It needs a way out: `→ 4` (back to a screen in this story) or `→ end` (it stops there).
- At most two per screen. More than that is its own story.

## Screenshots

Pictures replace the sketches: the approved design's screens from version 1 when there is one, otherwise
real screenshots after building. Put an indented `shot:` line under the screen (or
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
- The frame takes the picture's own shape, so the whole picture shows, never stretched, whether the tablet
  is held sideways or upright. Only `crop` cuts anything off, and only the small strip under a wide screen
  trims its pictures to fit.
- For a desktop app or a website, capture the content only: the page draws the window's or browser's top bar.
- In English, straight quote marks in the text are printed curly: `"Pay"` shows as “Pay”.
- PNG, JPG or WebP. Use demo data: no real names, phone numbers, emails or passwords.

## Where the user taps

An indented `tap:` line under a screen (or under its `!` line) marks where the user taps, on the picture:

```
3. Menu: Sees the dishes and prices. Adds dishes, taps "Checkout". → 4
   shot: screenshots/1-3-menu.png
   tap: 92%, 56% Taps Checkout
```

- Two numbers from 0 to 100: how far the point is from the picture's **left** edge, then from its **top**,
  in percent of the whole picture as the file is (before any `crop`). The `%` signs are optional.
- Then, if you want, a short label (up to 28 characters): `Taps Checkout`, `Clicks Book`.
- On a button, put the point on the button's **lower right corner**, so the button's words stay readable.
  The label sits under the point (over it near the bottom of the screen) and runs toward the middle.
- `look:` is written the same way and draws a dashed ring: where to look on a screen the user only reads
  (`look: 17%, 12% The total`). A screen may have one `tap:` and one `look:`.
- Both need the screen's `shot:` line: a sketch has no real place to point at. If the picture file is
  missing, the markers are left out with it.

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
| Caption | 160 characters (a `!` caption: 140) |
| `tap:` or `look:` label | 28 characters |
| `client`, `by` | 60 characters |
| `about` | 200 characters |
| Stories | 12 |
| Screens in a story | 24 (one page each) |
| `!` frames under one screen | 2 |

## What the page refuses

The page draws nothing messy. Instead it lists numbered problems, each naming the line and what to
change, for example:

- `Line 9: screen 4 goes to screen 7, but this story has only 5 screens.`
- `Line 12: "Card refused" needs a way out: end the line with → and a screen number, or → end.`
- `Line 3: kind must be phone, tablet, desktop or website. It says "mobile".`
- `Line 14: tap: marks a point on the screen's picture. Add its shot: line first, or remove the tap: line.`
- `Line 5: The accent colour #f0f1f3 cannot be seen on the stage colour #f3f4f6: they are too close.`
- `Screen 2 in "Ordering food": its name and caption do not fit beside the screen. Shorten the caption.`

In an Arabic storyboard (`- language: ar`) the problem page reads right to left, and its heading, its line
labels and the "does not fit" problems are in Arabic. The other problems stay in English: they quote the
file's own English words (`kind`, `status`, `→ end`, the sketch names).
