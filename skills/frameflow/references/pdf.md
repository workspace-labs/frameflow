# Making the PDF

The storyboard page draws itself in any browser. The PDF is that page, printed. Never install a browser or
anything else to get one.

## Contents

- 1. Check the page drew
- 2. Print it yourself, when Chrome or Edge is already there
- 3. Otherwise, the person prints it
- What "ready" and "refused" mean

## 1. Check the page drew

When the page finishes it marks itself: `<html data-frameflow="ready">`, or `"refused"` with a numbered list
of problems in the page. If you can run Chrome or Edge from the command line (next section), read the drawn
page first:

```bash
"<browser>" --headless --disable-gpu --virtual-time-budget=10000 --dump-dom "file:///full/path/docs/app-flow/storyboard.html"
```

- The output contains `data-frameflow="ready"` → print it.
- It contains `data-frameflow="refused"` → the problems are in the `<section class="problems">` list, each
  with its line in `app-flow.md`. Fix them in `app-flow.md`, copy it into the page again, and check again.

## 2. Print it yourself, when Chrome or Edge is already there

Look for an installed Chrome or Edge. Use the first that exists; do not install one.

| System | Where to look |
|---|---|
| macOS | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` · `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge` |
| Windows | `C:\Program Files\Google\Chrome\Application\chrome.exe` · `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` · `C:\Program Files\Microsoft\Edge\Application\msedge.exe` |
| Linux | `google-chrome` · `chromium` · `chromium-browser` · `microsoft-edge` on the PATH |

Then print (one line):

```bash
"<browser>" --headless --disable-gpu --no-pdf-header-footer --virtual-time-budget=10000 --print-to-pdf="docs/app-flow/<Project> - App flow v<N>.pdf" "file:///full/path/docs/app-flow/storyboard.html"
```

Windows PowerShell:

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --disable-gpu --no-pdf-header-footer --virtual-time-budget=10000 --print-to-pdf="C:\path\docs\app-flow\Project - App flow v1.pdf" "file:///C:/path/docs/app-flow/storyboard.html"
```

- The page address must be a full `file:///` path; on Windows use forward slashes after `file:///C:/`.
- `--virtual-time-budget` gives the fonts and screenshots time to load before printing.
- An older browser that does not know `--no-pdf-header-footer` uses `--print-to-pdf-no-header` instead.
- Check the PDF exists and is not empty. Its page count is the cover plus every story page.

## 3. Otherwise, the person prints it

When you cannot run a browser (no command line, no Chrome or Edge, or Claude in the browser), hand over the
`docs/app-flow/` folder and tell the person, in these words or close to them:

> Open `storyboard.html` in Chrome, Edge or Safari. Press Print, choose **Save as PDF**, then set **Paper A4**,
> **Margins None**, turn **Background graphics** on (in Safari: **Print backgrounds**) and **Headers and
> footers** off. Save it as "<Project> - App flow v<N>.pdf".

If the page shows a red "frameflow can't draw this storyboard yet" box instead of the storyboard, ask the
person to paste the list into the chat, then fix those lines.

## What "ready" and "refused" mean

| The page shows | Meaning | What you do |
|---|---|---|
| The cover and the story pages | Every line was read and every word fits | Print |
| A red box with numbered problems | A line is wrong, or a word does not fit its place | Fix `app-flow.md` by the line numbers, copy it in again, check again |
| A grey box "Turn on JavaScript…" | The browser blocks scripts for files | Try another browser |
