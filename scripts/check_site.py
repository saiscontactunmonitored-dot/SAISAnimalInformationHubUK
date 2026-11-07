from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urlparse, unquote
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PREFIX = "/SAISAnimalInformationHubUK/"
errors = []
warnings = []

# These are unfinished editorial labels, not ordinary input placeholders or CSS class names.
UNFINISHED_MARKERS = re.compile(
    r"photo to be added|reserved space for|coming soon|under construction|"
    r"lorem ipsum|TODO|FIXME|PHOTO SPACE|photo space|reserved image space|insert (?:an? )?(?:image|photo|text|content) here",
    re.IGNORECASE,
)
OLD_CONTRIBUTOR_NAME = re.compile(
    r"small\s*(?:&|and|&amp;)\s*mighty(?:\s+pet)?(?:\s+training)?",
    re.IGNORECASE,
)

class AuditParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.resources = []
        self.icons = 0
        self.og_images = 0
        self.shell_scripts = 0
        self.logo_refs = 0
        self.main_count = 0
        self.images_without_alt = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            if a["id"] in self.ids:
                errors.append(f"duplicate id #{a['id']}")
            self.ids.add(a["id"])
        if tag == "main":
            self.main_count += 1
        if tag == "img" and "alt" not in a:
            self.images_without_alt += 1
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
            if not value or value.startswith(("#", "http:", "https:", "mailto:", "tel:", "javascript:", "data:", "//")):
                continue
            if key == "href":
                self.links.append(value)
            elif key == "src":
                self.resources.append(value)

def resolve_local(page, value, rel, kind):
    path_part = unquote(urlparse(value).path)
    if not path_part:
        return
    if path_part.startswith(PREFIX):
        target = ROOT / path_part[len(PREFIX):]
    elif path_part.startswith("/"):
        errors.append(f"{rel}: root-relative {kind} outside project prefix: {value}")
        return
    else:
        target = (page.parent / path_part).resolve()
    if target.is_dir():
        target = target / "index.html"
    if not target.exists():
        errors.append(f"{rel}: missing local {kind}: {value}")

html_files = sorted(ROOT.rglob("*.html"))
if not html_files:
    errors.append("No HTML pages found")

for page in html_files:
    parser = AuditParser()
    try:
        source = page.read_text(encoding="utf-8")
        parser.feed(source)
    except Exception as exc:
        errors.append(f"{page.relative_to(ROOT)}: HTML parse error: {exc}")
        continue

    rel = page.relative_to(ROOT)
    if not re.search(r"<html\b[^>]*\blang=[\"']", source, re.IGNORECASE):
        errors.append(f"{rel}: missing document language")
    if not re.search(r"<title\b[^>]*>\s*[^<]+\s*</title>", source, re.IGNORECASE):
        errors.append(f"{rel}: missing or empty page title")
    h1_count = len(re.findall(r"<h1\b", source, re.IGNORECASE))
    if h1_count != 1:
        errors.append(f"{rel}: expected exactly one h1 heading, found {h1_count}")
    for name, count in (("shared navigation script", parser.shell_scripts),
                        ("favicon", parser.icons),
                        ("social sharing image", parser.og_images)):
        if count != 1:
            errors.append(f"{rel}: expected exactly one {name}, found {count}")
    if parser.logo_refs == 0:
        errors.append(f"{rel}: no info-logo.png reference found")
    if parser.main_count != 1 and page.name != "offline.html":
        errors.append(f"{rel}: expected exactly one main landmark, found {parser.main_count}")
    if parser.images_without_alt:
        warnings.append(f"{rel}: {parser.images_without_alt} image(s) missing an alt attribute")

    for href in parser.links:
        resolve_local(page, href, rel, "link")
    for src in parser.resources:
        resolve_local(page, src, rel, "asset")

    old_contributor = OLD_CONTRIBUTOR_NAME.search(source)
    if old_contributor:
        errors.append(f"{rel}: outdated contributor name remains: {old_contributor.group(0)}")

    marker = UNFINISHED_MARKERS.search(source)
    if marker:
        errors.append(f"{rel}: unfinished page marker found: {marker.group(0)}")


# Progressive Web App and offline-copy checks.
manifest_path = ROOT / "manifest.json"
worker_path = ROOT / "sw.js"
shell_script_path = ROOT / "assets" / "site-shell.js"
if not manifest_path.exists():
    errors.append("PWA manifest.json is missing")
else:
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for key in ("name", "short_name", "start_url", "scope", "display", "icons"):
            if not manifest.get(key):
                errors.append(f"PWA manifest is missing required field: {key}")
        if not str(manifest.get("start_url", "")).startswith(PREFIX) or not str(manifest.get("scope", "")).startswith(PREFIX):
            errors.append("PWA start_url and scope must stay inside the GitHub Pages project path")
        for icon in manifest.get("icons", []):
            icon_path = str(icon.get("src", "")).replace(PREFIX, "", 1).lstrip("/")
            if not icon_path or not (ROOT / icon_path).exists():
                errors.append(f"PWA manifest icon is missing: {icon.get('src', '')}")
    except Exception as exc:
        errors.append(f"PWA manifest JSON could not be read: {exc}")

if not worker_path.exists():
    errors.append("PWA service worker sw.js is missing")
else:
    worker = worker_path.read_text(encoding="utf-8")
    if "cache.addAll(APP_SHELL)" not in worker:
        errors.append("Service worker does not precache the app shell")
    if "BASE + 'offline.html'" not in worker:
        errors.append("Service worker has no offline-page fallback")
    if "sais-animal-hub-v" not in worker:
        errors.append("Service worker cache version is missing")

    # Every published page except the custom 404 response should be available in the offline shell.
    for page in html_files:
        rel = page.relative_to(ROOT).as_posix()
        if rel == "404.html":
            continue
        if rel == "index.html":
            expected = "BASE"
        elif rel == "offline.html":
            expected = "BASE + 'offline.html'"
        else:
            expected = "BASE + '" + rel.rsplit("/", 1)[0] + "/'"
        if expected not in worker:
            errors.append(f"Offline app shell does not precache page: {rel}")

    for asset in ("assets/css/site.css", "assets/css/redesign-2026.css",
                  "assets/site-shell.css", "assets/site-shell.js",
                  "info-logo.png", "icon.svg", "manifest.json"):
        if not (ROOT / asset).exists():
            errors.append(f"Offline app-shell asset is missing: {asset}")
        if "BASE + '" + asset + "'" not in worker:
            errors.append(f"Offline app shell does not precache asset: {asset}")

if not shell_script_path.exists():
    errors.append("Shared site shell script is missing")
else:
    shell_script = shell_script_path.read_text(encoding="utf-8")
    for feature in ("beforeinstallprompt", "sais-install-prompt",
                    "sais-install-footer-trigger", "serviceWorker.register"):
        if feature not in shell_script:
            errors.append(f"Shared site shell is missing PWA feature: {feature}")

for page in html_files:
    rel = page.relative_to(ROOT).as_posix()
    if rel in ("404.html", "offline.html"):
        continue
    source = page.read_text(encoding="utf-8")
    if 'rel="manifest"' not in source and "rel='manifest'" not in source:
        errors.append(f"{rel}: missing PWA manifest link")
    if "serviceWorker.register" not in source:
        errors.append(f"{rel}: missing service worker registration")

print(f"Audited {len(html_files)} HTML pages")
print(f"Errors: {len(errors)} | Warnings: {len(warnings)}")
for item in errors:
    print("ERROR:", item)
for item in warnings:
    print("WARNING:", item)
sys.exit(1 if errors else 0)
