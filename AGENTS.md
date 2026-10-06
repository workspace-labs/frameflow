# AGENTS.md: working on frameflow

For coding agents changing this repository. What the skill does is in `README.md`; what it must never do
is in `docs/scope.md`; why it is built this way is in `docs/adr/`.

## Test

```bash
cd frameflow        # your clone
node --test
```

Node.js 18 or newer, for the tests only. The skill itself needs nothing but a browser.

## Look at the pages

The tests check the reading rules and the page layout numbers. They cannot see the page. After any change
to the template, open each example in a browser and look at every page, or on a Mac run
`tools/render-mac.sh` (it writes page pictures and a PDF to `/tmp/frameflow-render/`).

## Rules for this repository

- Keep `skills/frameflow/` clean: it is installed and uploaded as it is. No test files, no drawn PDFs.
- The look lives in `skills/frameflow/assets/template/frameflow/frameflow.css` and the sizes in
  `layout.js`. They are the owner's decisions: never change fonts, colours or the page shape without his yes.
- `model.js` and `layout.js` never touch the page (no `document`); only `render.js` does. That keeps them
  testable in Node.
- After the first release (0.1.0), every change bumps `VERSION` in
  `skills/frameflow/assets/template/frameflow/model.js` and adds a dated `CHANGELOG.md` entry.
- After a change, rebuild `dist/frameflow.zip` (command in `README.md`).
- Never commit or push without the owner's word. Never put a path from the owner's computer in anything
  published.
