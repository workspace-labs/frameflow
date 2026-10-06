#!/bin/sh
# Builder's tool, macOS only. Draws a storyboard the way a user's browser would, and writes each page as a
# PNG plus the printed PDF, so the builder can look at every page.
#
#   tools/render-mac.sh skills/frameflow/examples/food-delivery.md            # an app-flow.md
#   tools/render-mac.sh path/to/storyboard.html                              # a filled page
#
# Output: /tmp/frameflow-render/<name>/ (page-01.png …, storyboard.pdf). Needs the Xcode command line tools.
set -eu

here=$(cd "$(dirname "$0")" && pwd)
repo=$(dirname "$here")
template="$repo/skills/frameflow/assets/template"
input=${1:?usage: tools/render-mac.sh <app-flow.md | storyboard.html>}
name=$(basename "$input"); name=${name%.*}
work=/tmp/frameflow-render/$name
bin=/tmp/frameflow-render/.render-mac

mkdir -p "$work"
if [ ! -x "$bin" ] || [ "$here/render-mac.swift" -nt "$bin" ]; then
  swiftc -O "$here/render-mac.swift" -o "$bin" 2>/dev/null
fi

case "$input" in
  *.md)
    # A fresh copy of the template with this text copy inside, as the skill itself would make it.
    cp -R "$template/frameflow" "$work/"
    [ -d "$(dirname "$input")/screenshots" ] && cp -R "$(dirname "$input")/screenshots" "$work/"
    python3 - "$template/storyboard.html" "$input" "$work/storyboard.html" <<'PY'
import re, sys
page = open(sys.argv[1], encoding="utf-8").read()
text = open(sys.argv[2], encoding="utf-8").read()
start = '<script type="text/markdown" id="app-flow">\n'
i = page.index(start) + len(start)
j = page.index("</script>", i)
open(sys.argv[3], "w", encoding="utf-8").write(page[:i] + text.rstrip("\n") + "\n" + page[j:])
PY
    page="$work/storyboard.html" ;;
  *.html) page=$(cd "$(dirname "$input")" && pwd)/$(basename "$input") ;;
  *) echo "render-mac: give an app-flow .md or a storyboard .html" >&2; exit 1 ;;
esac

"$bin" "$page" "$work"
echo "$work"
