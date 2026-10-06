# 0001. An HTML template draws the storyboard

- Status: accepted
- Date: 2026-10-06
- Decided by: the owner (option 2 of two, "option 2 boss! add in list")

## Context

frameflow is public. It must work on a stranger's computer, including a Windows PC where installing Python
or a package may be blocked. It must also draw Arabic right to left and place real screenshots into the
frames.

## Options weighed

1. **Python + reportlab** (like workflow-project). Draws the PDF directly with strong checks, but needs
   Python and a package installed, and right-to-left Arabic is hard to get right in reportlab.
2. **An HTML page with one fixed template, printed to PDF.** Works in any browser with nothing to install;
   right to left is built into every browser; images drop straight in. Getting a PDF needs a print step
   (automatic when Chrome or Edge is present).

## Decision

Option 2. The template is a folder: `storyboard.html`, one CSS file, small JavaScript files (reading,
page layout, drawing, labels) and the fonts. The agent copies it, writes the text copy, and never changes
the template's layout or colours.

## Consequences

- Classic `<script>` files, not JavaScript modules: browsers refuse modules opened from a file on disk.
- The page has to check its own fit (captions measured after the fonts load) and refuse rather than
  overflow, since there is no separate drawing tool to do it.
- The builder's tests run with Node.js (the same files load in Node); users never need Node.
