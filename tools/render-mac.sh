#!/bin/sh
# Builder's tool, macOS only. Draws a storyboard the way a user's browser would, and writes each page as a
# PNG plus the printed PDF, so the builder can look at every page.
#
#   tools/render-mac.sh skills/frameflow/examples/food-delivery.md            # an app-flow.md
#   tools/render-mac.sh path/to/storyboard.html                              # a filled page
#
# Output: a private frameflow-render.XXXXXX directory in TMPDIR (page-01.png …, storyboard.pdf).
# Needs the Xcode command line tools. The final output line names this run's directory.
set -eu

here=$(cd "$(dirname "$0")" && pwd)
repo=$(dirname "$here")
template="$repo/skills/frameflow/assets/template"
input=${1:?usage: tools/render-mac.sh <app-flow.md | storyboard.html>}
umask 077
work=$(mktemp -d "${TMPDIR:-/tmp}/frameflow-render.XXXXXX")
bin="$work/.render-mac"

case "$input" in
  *.md)
    # A fresh copy of the template with this text copy inside, as the skill itself would make it.
    cp -R "$template/frameflow" "$work/"
    [ -d "$(dirname "$input")/screenshots" ] && cp -R "$(dirname "$input")/screenshots" "$work/"
    python3 - "$template/storyboard.html" "$input" "$work/storyboard.html" <<'PY'
import re, sys
page = open(sys.argv[1], encoding="utf-8").read()
text = open(sys.argv[2], encoding="utf-8").read()
# HTML closes a raw-text script element even when its type is text/markdown. Refuse before writing
# a page: escaping this text would change the master copy that the renderer must read verbatim.
if re.search(r'</script(?=[\t\n\f\r />]|$)', text, re.IGNORECASE | re.ASCII):
    sys.exit("render-mac: Markdown contains a closing script tag; remove it before rendering")
if '<!--' in text:
    sys.exit("render-mac: Markdown contains an HTML comment opener; remove it before rendering")
start = '<script type="text/markdown" id="app-flow">\n'
i = page.index(start) + len(start)
j = page.index("</script>", i)
open(sys.argv[3], "w", encoding="utf-8").write(page[:i] + text.rstrip("\n") + "\n" + page[j:])
PY
    page="$work/storyboard.html" ;;
  *.html) page=$(cd "$(dirname "$input")" && pwd)/$(basename "$input") ;;
  *) echo "render-mac: give an app-flow .md or a storyboard .html" >&2; exit 1 ;;
esac

# Compile only into the private directory made for this run; never execute a shared cached binary.
swiftc -O "$here/render-mac.swift" -o "$bin"
"$bin" "$page" "$work"
echo "$work"
