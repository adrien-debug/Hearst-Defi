#!/usr/bin/env bash
# Build the Hearst Yield Vault strategy PDF.
#
# Pipeline: markdown → HTML (pandoc, embedded CSS) → PDF (Chrome headless).
# No LaTeX, no wkhtmltopdf — works on a vanilla macOS box.
#
# Usage: ./scripts/build-strategy-pdf.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_MD="${ROOT_DIR}/docs/strategy/hearst-yield-vault-v1.0.md"
TMP_HTML="${ROOT_DIR}/docs/strategy/.hearst-yield-vault-v1.0.html"
OUT_PDF="${ROOT_DIR}/docs/strategy/hearst-yield-vault-v1.0.pdf"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [[ ! -f "$SRC_MD" ]]; then
  echo "Source markdown not found: $SRC_MD" >&2
  exit 1
fi

if [[ ! -x "$CHROME" ]]; then
  echo "Chrome not found at: $CHROME" >&2
  exit 1
fi

if ! command -v pandoc >/dev/null 2>&1; then
  echo "pandoc not installed" >&2
  exit 1
fi

# Inline CSS — institutional look, print-friendly, monochrome with one accent.
CSS=$(cat <<'EOF'
@page {
  size: A4;
  margin: 22mm 18mm 22mm 18mm;
}
html {
  font-size: 10.5pt;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: #111;
  line-height: 1.5;
  max-width: 100%;
  margin: 0;
}
h1 {
  font-size: 22pt;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: 0;
  margin-bottom: 0.4em;
  border-bottom: 2px solid #111;
  padding-bottom: 0.3em;
  page-break-after: avoid;
}
h2 {
  font-size: 14pt;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-top: 1.6em;
  margin-bottom: 0.4em;
  padding-bottom: 0.15em;
  border-bottom: 1px solid #ccc;
  page-break-after: avoid;
}
h3 {
  font-size: 11.5pt;
  font-weight: 700;
  margin-top: 1.2em;
  margin-bottom: 0.3em;
  page-break-after: avoid;
}
p {
  margin: 0.4em 0 0.6em 0;
  orphans: 3;
  widows: 3;
}
strong {
  font-weight: 700;
}
blockquote {
  border-left: 3px solid #5a8048;
  background: #f7faf4;
  padding: 0.5em 0.9em;
  margin: 0.8em 0;
  color: #333;
  font-size: 0.93em;
  page-break-inside: avoid;
}
blockquote p {
  margin: 0.2em 0;
}
code {
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.92em;
  background: #f0f0ef;
  padding: 0.05em 0.3em;
  border-radius: 3px;
}
pre {
  background: #f5f5f3;
  padding: 0.7em 0.9em;
  border-radius: 4px;
  border: 1px solid #e3e3df;
  overflow-x: auto;
  font-size: 0.88em;
  line-height: 1.42;
  page-break-inside: avoid;
  margin: 0.6em 0;
}
pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.7em 0;
  font-size: 0.93em;
  page-break-inside: avoid;
}
th {
  background: #f5f5f3;
  text-align: left;
  font-weight: 700;
  padding: 6px 8px;
  border-bottom: 1.5px solid #111;
  border-top: 1px solid #ccc;
}
td {
  padding: 5px 8px;
  border-bottom: 1px solid #e3e3df;
  vertical-align: top;
}
tr:last-child td {
  border-bottom: 1px solid #ccc;
}
hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 2em 0;
}
ul, ol {
  padding-left: 1.4em;
  margin: 0.4em 0;
}
li {
  margin: 0.18em 0;
}
.title-block {
  margin-bottom: 2em;
}
.title-block .subtitle {
  font-size: 12pt;
  color: #555;
  margin-top: -0.3em;
}
.title-block .meta {
  font-size: 9.5pt;
  color: #777;
  margin-top: 0.6em;
}
/* Accent color — green per CLAUDE.md (#A7FB90 mapped to a print-friendly tone) */
a {
  color: #2c5f1e;
  text-decoration: none;
  border-bottom: 1px dotted #2c5f1e;
}
EOF
)

# Build the HTML.
pandoc "$SRC_MD" \
  --from markdown \
  --to html5 \
  --standalone \
  --metadata title="Hearst Yield Vault — Stratégie complète" \
  --metadata-file=/dev/null \
  -V lang=fr \
  --output "$TMP_HTML"

# Inject the CSS into the HTML head.
python3 - "$TMP_HTML" "$CSS" <<'PY'
import sys
from pathlib import Path
html_path = Path(sys.argv[1])
css = sys.argv[2]
html = html_path.read_text()
inject = f"<style>{css}</style>"
if "</head>" in html:
    html = html.replace("</head>", inject + "</head>", 1)
else:
    html = inject + html
html_path.write_text(html)
PY

# Convert to PDF via Chrome headless.
"$CHROME" \
  --headless \
  --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf-no-header \
  --print-to-pdf="$OUT_PDF" \
  --no-sandbox \
  "file://$TMP_HTML" 2>/dev/null

rm -f "$TMP_HTML"

if [[ -f "$OUT_PDF" ]]; then
  size=$(du -h "$OUT_PDF" | cut -f1)
  echo "Built: $OUT_PDF ($size)"
else
  echo "PDF generation failed" >&2
  exit 1
fi
