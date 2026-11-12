"""Download the two variable fonts used by the launcher (OFL) and write fonts.css."""
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "src" / "renderer" / "src" / "assets" / "fonts"
CSS = ROOT / "src" / "renderer" / "src" / "styles" / "fonts.css"

URL = (
    "https://fonts.googleapis.com/css2?"
    "family=Inter:wght@100..900&family=Space+Grotesk:wght@300..700&display=swap"
)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}

request = urllib.request.Request(URL, headers=HEADERS)
styles = urllib.request.urlopen(request, timeout=30).read().decode("utf-8")

blocks = re.findall(r"/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}", styles, re.S)
wanted = {"latin", "cyrillic"}
faces = []

TARGET.mkdir(parents=True, exist_ok=True)
for subset, body in blocks:
    if subset not in wanted:
        continue
    family = re.search(r"font-family: '([^']+)'", body).group(1)
    weight = re.search(r"font-weight: ([^;]+);", body).group(1).strip()
    url = re.search(r"src: url\(([^)]+)\)", body).group(1)
    unicode_range = re.search(r"unicode-range: ([^;]+);", body).group(1).strip()
    name = f"{family.lower().replace(' ', '-')}-{subset}.woff2"
    target = TARGET / name
    if not target.exists():
        with urllib.request.urlopen(url, timeout=60) as response:
            target.write_bytes(response.read())
        print(f"downloaded {name} ({target.stat().st_size} bytes)")
    faces.append((family, weight, name, unicode_range))

lines = ["/* Inter and Space Grotesk, SIL Open Font License 1.1. */", ""]
for family, weight, name, unicode_range in faces:
    lines.extend(
        [
            "@font-face {",
            f"  font-family: '{family}';",
            "  font-style: normal;",
            f"  font-weight: {weight};",
            "  font-display: swap;",
            f"  src: url('../assets/fonts/{name}') format('woff2');",
            f"  unicode-range: {unicode_range};",
            "}",
            "",
        ]
    )

CSS.write_text("\n".join(lines), encoding="utf-8")
print(f"wrote {CSS.relative_to(ROOT)} with {len(faces)} faces")


