"""Generate the launcher icon set from the same voxel mark as the site."""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
RES = ROOT / "resources"
ICONS = BUILD / "icons"


def rounded(size: int, radius_ratio: float = 0.22) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    pad = max(1, size // 64)
    draw.rounded_rectangle(
        (pad, pad, size - pad, size - pad),
        radius=int(size * radius_ratio),
        fill=(6, 10, 16, 255),
        outline=(20, 40, 32, 255),
        width=max(1, size // 128),
    )
    # soft mint glow behind the cube
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse(
        (size * 0.16, size * 0.12, size * 0.84, size * 0.8),
        fill=(94, 230, 168, 40),
    )
    image = Image.alpha_composite(image, glow)
    return image


def cube(image: Image.Image, scale: float = 1.0) -> None:
    size = image.size[0]
    draw = ImageDraw.Draw(image)
    cx, cy = size / 2, size / 2
    w = size * 0.34 * scale
    h = size * 0.2 * scale
    depth = size * 0.28 * scale

    top = (cx, cy - h - depth * 0.35)
    left_top = (cx - w, cy - depth * 0.35)
    right_top = (cx + w, cy - depth * 0.35)
    middle = (cx, cy + h - depth * 0.35)
    bottom_mid = (cx, cy + h + depth)
    bottom_left = (cx - w, cy + depth)
    bottom_right = (cx + w, cy + depth)

    draw.polygon([top, right_top, middle, left_top], fill=(94, 230, 168, 255))
    draw.polygon([left_top, middle, bottom_mid, bottom_left], fill=(42, 127, 92, 255))
    draw.polygon([right_top, middle, bottom_mid, bottom_right], fill=(58, 92, 168, 255))
    draw.line([left_top, middle, right_top], fill=(169, 255, 218, 150), width=max(1, int(size * 0.006)))
    draw.line([middle, bottom_mid], fill=(169, 255, 218, 80), width=max(1, int(size * 0.004)))


def make_icon(size: int) -> Image.Image:
    image = rounded(size)
    cube(image, scale=1.0)
    return image


def main() -> None:
    for folder in (BUILD, RES, ICONS):
        folder.mkdir(parents=True, exist_ok=True)

    base = make_icon(1024)
    base.save(BUILD / "icon.png")
    base.resize((512, 512), Image.LANCZOS).save(RES / "icon.png")

    for size in (16, 24, 32, 48, 64, 128, 256, 512):
        make_icon(size).save(ICONS / f"{size}x{size}.png")

    make_icon(256).save(
        BUILD / "icon.ico",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    tray = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    cube(tray, scale=0.82)
    tray.save(RES / "tray.png")

    # macOS icon is optional; electron-builder accepts a png fallback in dev.
    base.resize((512, 512), Image.LANCZOS).save(BUILD / "icon-512.png")
    print("icons written")


if __name__ == "__main__":
    main()
