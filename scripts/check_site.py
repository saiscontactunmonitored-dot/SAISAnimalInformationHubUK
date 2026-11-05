from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import sys

ROOT = Path(__file__).resolve().parents[1]
PREFIX = "/SAISAnimalInformationHubUK/"
errors = []
warnings = []

class AuditParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.icons = 0
        self.og_images = 0
        self.shell_scripts = 0
        self.logo_refs = 0
        self.main_count = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            if a["id"] in self.ids:
                errors.append(f"duplicate id #{a['id']}")
            self.ids.add(a["id"])
        if tag == "main":
            self.main_count += 1
        if tag == "link" and a.get("rel") == "icon":
            self.icons += 1
        if tag == "meta" and a.get("property") == "og:image":
            self.og_images += 1
        if tag == "script" and "site-shell.js" in a.get("src", ""):
            self.shell_scripts += 1
        for key in ("src", "href"):
            value = a.get(key, "")
            if value and "info-logo.png" in value:
                self.logo_refs += 1
            if key == "href" and value and not value.startswith(("#", "http:", "https:", "mailto:", "tel:", "javascript:", "data:")):
                self.links.append(value)

html_files = sorted(ROOT.rglob("*.html"))
if not html_files:
    errors.append("No HTML pages found")

for page in html_files:
    parser = AuditParser()
    try:
        parser.feed(page.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{page.relative_to(ROOT)}: HTML parse error: {exc}")
        continue
    rel = page.relative_to(ROOT)
    for name, count in (("shared navigation script", parser.shell_scripts), ("favicon", parser.icons), ("social sharing image", parser.og_images)):
        if count != 1:
            errors.append(f"{rel}: expected exactly one {name}, found {count}")
    if parser.logo_refs == 0:
        errors.append(f"{rel}: no info-logo.png reference found")
    if parser.main_count == 0 and page.name != "offline.html":
        warnings.append(f"{rel}: no main landmark found")
    for href in parser.links:
        path_part = unquote(urlparse(href).path)
        if not path_part:
            continue
        if path_part.startswith(PREFIX):
            target = ROOT / path_part[len(PREFIX):]
        elif path_part.startswith("/"):
            # Root-relative links outside the GitHub Pages project prefix are suspect.
            errors.append(f"{rel}: root-relative link outside project prefix: {href}")
            continue
        else:
            target = (page.parent / path_part).resolve()
        if target.is_dir():
            target = target / "index.html"
        if not target.exists():
            errors.append(f"{rel}: broken local link: {href}")

print(f"Audited {len(html_files)} HTML pages")
print(f"Errors: {len(errors)} | Warnings: {len(warnings)}")
for item in errors:
    print("ERROR:", item)
for item in warnings:
    print("WARNING:", item)
sys.exit(1 if errors else 0)
