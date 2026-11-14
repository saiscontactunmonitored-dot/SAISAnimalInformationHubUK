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
            if value and ("info-logo.png" in value or "animal-information-hub-logo-supplied.webp" in value):
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
    if parser.logo_refs == 0 and rel not in ("404.html", "accessibility/index.html"):
        errors.append(f"{rel}: no recognised Hub logo reference found")
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

    for asset in ("assets/css/site.css", "assets/css/redesign-2026.css", "assets/css/launch-polish.css",
                  "assets/site-shell.css", "assets/site-shell.js",
                  "info-logo.png", "icon.svg", "manifest.json"):
        if not (ROOT / asset).exists():
            errors.append(f"Offline app-shell asset is missing: {asset}")
        if "BASE + '" + asset + "'" not in worker:
            errors.append(f"Offline app shell does not precache asset: {asset}")

if worker_path.exists():
    if "sais-animal-hub-v39" not in worker:
        errors.append("Service worker cache must be v38 for the launch release")
    for image in sorted((ROOT / "assets" / "images").rglob("*")):
        if image.is_file() and image.suffix.lower() in (".webp", ".png", ".jpg", ".jpeg", ".svg"):
            relative = image.relative_to(ROOT).as_posix()
            if "BASE + '" + relative + "'" not in worker:
                errors.append("Published image is missing from offline precache: " + relative)
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



# SEO, canonical, social metadata, sitemap and crawler directives.
from html import unescape
import xml.etree.ElementTree as ET

SITE_BASE = "https://saiscontactunmonitored-dot.github.io/SAISAnimalInformationHubUK/"
def tag_attr(tag, name):
    match = re.search(r"\b" + re.escape(name) + r"\s*=\s*([\"'])(.*?)\1", tag, re.IGNORECASE | re.DOTALL)
    return unescape(match.group(2).strip()) if match else ""

def find_meta(source, key_name, key_value):
    for tag in re.findall(r"<meta\b[^>]*>", source, re.IGNORECASE):
        if tag_attr(tag, key_name).lower() == key_value.lower():
            return tag
    return ""

seo_titles = {}
seo_descriptions = {}
expected_sitemap_urls = set()

for page in html_files:
    rel = page.relative_to(ROOT).as_posix()
    source = page.read_text(encoding="utf-8")
    title_match = re.search(r"<title\b[^>]*>(.*?)</title>", source, re.IGNORECASE | re.DOTALL)
    title = re.sub(r"\s+", " ", unescape(title_match.group(1))).strip() if title_match else ""
    description_tag = find_meta(source, "name", "description")
    description = tag_attr(description_tag, "content")
    og_title = tag_attr(find_meta(source, "property", "og:title"), "content")
    og_description = tag_attr(find_meta(source, "property", "og:description"), "content")
    og_url = tag_attr(find_meta(source, "property", "og:url"), "content")

    if not title:
        errors.append(f"{rel}: missing SEO title")
    if not description:
        errors.append(f"{rel}: missing SEO meta description")
    if not og_title or not og_description or not og_url:
        errors.append(f"{rel}: incomplete Open Graph metadata")
    elif description and og_description != description:
        errors.append(f"{rel}: Open Graph description does not match SEO description")

    has_noindex = bool(re.search(r'<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex', source, re.IGNORECASE))
    is_nonindexable = rel in ("404.html", "offline.html") or has_noindex
    if is_nonindexable:
        if not re.search(r'<meta\b[^>]*name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', source, re.IGNORECASE):
            errors.append(f"{rel}: must be marked noindex")
        if re.search(r'<link\b[^>]*rel=["\']canonical["\']', source, re.IGNORECASE):
            errors.append(f"{rel}: non-indexable utility page should not declare a canonical URL")
        expected_url = SITE_BASE + rel
    else:
        if rel == "index.html":
            expected_url = SITE_BASE
        else:
            expected_url = SITE_BASE + rel.rsplit("/", 1)[0] + "/"
        canonical_tag = next((tag for tag in re.findall(r"<link\b[^>]*>", source, re.IGNORECASE)
                              if tag_attr(tag, "rel").lower() == "canonical"), "")
        if tag_attr(canonical_tag, "href") != expected_url:
            errors.append(f"{rel}: canonical URL missing or incorrect")
        expected_sitemap_urls.add(expected_url)
        if title:
            seo_titles.setdefault(title.casefold(), []).append(rel)
        if description:
            seo_descriptions.setdefault(description.casefold(), []).append(rel)

    if og_url != expected_url:
        errors.append(f"{rel}: Open Graph URL missing or incorrect")

for title, pages in seo_titles.items():
    if len(pages) > 1:
        errors.append("Duplicate SEO title across pages: " + ", ".join(pages))
for description, pages in seo_descriptions.items():
    if len(pages) > 1:
        errors.append("Duplicate SEO description across pages: " + ", ".join(pages))

sitemap_path = ROOT / "sitemap.xml"
robots_path = ROOT / "robots.txt"
if not sitemap_path.exists():
    errors.append("sitemap.xml is missing")
else:
    try:
        sitemap_root = ET.parse(sitemap_path).getroot()
        sitemap_urls = {node.text.strip() for node in sitemap_root.iter()
                        if node.tag.endswith("}loc") and node.text}
        if sitemap_urls != expected_sitemap_urls:
            missing = sorted(expected_sitemap_urls - sitemap_urls)
            extra_urls = sorted(sitemap_urls - expected_sitemap_urls)
            if missing:
                errors.append("Sitemap is missing pages: " + ", ".join(missing))
            if extra_urls:
                errors.append("Sitemap contains unexpected URLs: " + ", ".join(extra_urls))
    except Exception as exc:
        errors.append(f"sitemap.xml could not be parsed: {exc}")

if not robots_path.exists():
    errors.append("robots.txt is missing")
else:
    robots = robots_path.read_text(encoding="utf-8")
    if "User-agent: *" not in robots or "Allow: /" not in robots:
        errors.append("robots.txt must allow public crawling")
    if "Sitemap: " + SITE_BASE + "sitemap.xml" not in robots:
        errors.append("robots.txt sitemap directive is missing or incorrect")

print(f"Audited {len(html_files)} HTML pages")
print(f"Errors: {len(errors)} | Warnings: {len(warnings)}")
for item in errors:
    print("ERROR:", item)
for item in warnings:
    print("WARNING:", item)
sys.exit(1 if errors else 0)
