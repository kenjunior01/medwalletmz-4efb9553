#!/usr/bin/env python3
"""
Gera todos os ícones necessários para PWA + Android + iOS a partir do SVG master.

Uso:
    python3 scripts/generate_icons.py

Outputs:
    public/icon-512.png          (PWA any 512x512)
    public/icon-192.png          (PWA any 192x192)
    public/icon-maskable-512.png (PWA maskable 512x512 — com padding 20%)
    public/icon-maskable-192.png (PWA maskable 192x192)
    public/favicon.png           (1024x1024 — alta resolução)
    public/apple-touch-icon.png  (180x180 — iOS)
    public/og-image.png          (1200x630 — Open Graph)

    android/app/src/main/res/mipmap-*/ic_launcher.png
    android/app/src/main/res/mipmap-*/ic_launcher_round.png
    android/app/src/main/res/mipmap-*/ic_launcher_foreground.png
"""
import os
import cairosvg
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SVG_PATH = ROOT / "public" / "icon.svg"

# ---------------------------------------------------------------------------
# 1. Renderizar SVG master em alta resolução (1024x1024)
# ---------------------------------------------------------------------------
MASTER_SIZE = 1024
master_png = ROOT / "scripts" / "_icon_master.png"
cairosvg.svg2png(url=str(SVG_PATH), write_to=str(master_png), output_width=MASTER_SIZE, output_height=MASTER_SIZE)
print(f"[OK] Master render: {master_png}")

# ---------------------------------------------------------------------------
# 2. Versões PWA — sem padding (purpose=any)
# ---------------------------------------------------------------------------
def render_simple(out_path: Path, size: int):
    cairosvg.svg2png(url=str(SVG_PATH), write_to=str(out_path), output_width=size, output_height=size)
    print(f"[OK] PWA any: {out_path.relative_to(ROOT)} ({size}x{size})")

render_simple(ROOT / "public" / "icon-512.png", 512)
render_simple(ROOT / "public" / "icon-192.png", 192)
render_simple(ROOT / "public" / "favicon.png", 1024)
render_simple(ROOT / "public" / "apple-touch-icon.png", 180)

# ---------------------------------------------------------------------------
# 3. Versões PWA maskable — com padding 20% (área segura)
#    Maskable icons precisam de padding para que o OS possa cortar em várias formas
# ---------------------------------------------------------------------------
def render_maskable(out_path: Path, size: int, padding_pct: float = 0.2):
    """Renderiza o ícone dentro de uma canvas maior com padding."""
    inner_size = int(size * (1 - 2 * padding_pct))
    inner_png = ROOT / "scripts" / f"_inner_{inner_size}.png"
    cairosvg.svg2png(url=str(SVG_PATH), write_to=str(inner_png), output_width=inner_size, output_height=inner_size)

    # Abrir inner e compor sobre canvas grande com fundo emerald
    inner = Image.open(inner_png).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), (4, 120, 87, 255))  # #047857 emerald-700
    offset = ((size - inner_size) // 2, (size - inner_size) // 2)
    canvas.alpha_composite(inner, offset)
    canvas.save(out_path, "PNG")
    print(f"[OK] PWA maskable: {out_path.relative_to(ROOT)} ({size}x{size})")

render_maskable(ROOT / "public" / "icon-maskable-512.png", 512)
render_maskable(ROOT / "public" / "icon-maskable-192.png", 192)

# ---------------------------------------------------------------------------
# 4. Open Graph image (1200x630)
# ---------------------------------------------------------------------------
def render_og_image(out_path: Path):
    # Canvas 1200x630 com fundo emerald
    canvas = Image.new("RGB", (1200, 630), (4, 120, 87))

    # Renderizar ícone grande (320x320) no centro-esquerda
    icon_png = ROOT / "scripts" / "_og_icon.png"
    cairosvg.svg2png(url=str(SVG_PATH), write_to=str(icon_png), output_width=320, output_height=320)
    icon = Image.open(icon_png).convert("RGBA")

    # Sombra do ícone (mesmo tamanho do ícone)
    shadow = Image.new("RGBA", icon.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rectangle((0, 0, icon.size[0]-1, icon.size[1]-1), fill=(0, 0, 0, 60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))

    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.alpha_composite(shadow, (140, 175))
    canvas_rgba.alpha_composite(icon, (140, 155))

    # Converter de volta para RGB (OG image não precisa de alpha)
    canvas_rgba.convert("RGB").save(out_path, "PNG", optimize=True)
    print(f"[OK] Open Graph: {out_path.relative_to(ROOT)} (1200x630)")

render_og_image(ROOT / "public" / "og-image.png")

# ---------------------------------------------------------------------------
# 5. Ícones Android (mipmap-*)
#    ic_launcher.png — quadrado
#    ic_launcher_round.png — circular (máscara aplicada pelo Android)
#    ic_launcher_foreground.png — foreground do adaptive icon (108dp = 432px em xxxhdpi)
# ---------------------------------------------------------------------------
ANDROID_DENSITIES = {
    "mipmap-mdpi":    48,    # 1x
    "mipmap-hdpi":    72,    # 1.5x
    "mipmap-xhdpi":   96,    # 2x
    "mipmap-xxhdpi":  144,   # 3x
    "mipmap-xxxhdpi": 192,   # 4x
}

ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"

# Adaptive icon foreground sizes (Android usa 108dp, com 72dp safe zone)
# Cada densidade: 108 * density_multiplier
ANDROID_FG_DENSITIES = {
    "mipmap-mdpi":    108,
    "mipmap-hdpi":    162,
    "mipmap-xhdpi":   216,
    "mipmap-xxhdpi":  324,
    "mipmap-xxxhdpi": 432,
}

for density, size in ANDROID_DENSITIES.items():
    out_dir = ANDROID_RES / density
    out_dir.mkdir(parents=True, exist_ok=True)

    # ic_launcher.png — quadrado
    launcher_path = out_dir / "ic_launcher.png"
    cairosvg.svg2png(url=str(SVG_PATH), write_to=str(launcher_path), output_width=size, output_height=size)

    # ic_launcher_round.png — máscara circular aplicada
    round_path = out_dir / "ic_launcher_round.png"
    img = Image.open(launcher_path).convert("RGBA")
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, img.size[0]-1, img.size[1]-1), fill=255)
    img.putalpha(mask)
    img.save(round_path, "PNG")

    print(f"[OK] Android {density}: launcher {size}x{size}")

# Adaptive icon foreground (sem fundo — apenas o desenho centralizado)
for density, size in ANDROID_FG_DENSITIES.items():
    out_dir = ANDROID_RES / density
    out_dir.mkdir(parents=True, exist_ok=True)

    # Renderizar foreground em canvas vazio (72dp safe zone = 66.6% do tamanho)
    fg_size = size
    inner_size = int(size * 0.66)  # 66.6% centralizado
    inner_png = ROOT / "scripts" / f"_fg_inner_{inner_size}.png"
    cairosvg.svg2png(url=str(SVG_PATH), write_to=str(inner_png), output_width=inner_size, output_height=inner_size)

    inner = Image.open(inner_png).convert("RGBA")
    canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))  # transparente
    offset = ((fg_size - inner_size) // 2, (fg_size - inner_size) // 2)
    canvas.alpha_composite(inner, offset)
    canvas.save(out_dir / "ic_launcher_foreground.png", "PNG")

    print(f"[OK] Android {density}: foreground {fg_size}x{fg_size}")

# ---------------------------------------------------------------------------
# 6. Splash screen drawable (background color sólido com logo centrado)
# ---------------------------------------------------------------------------
SPLASH_SIZES = {
    "drawable-land-hdpi":   (640, 320),
    "drawable-land-mdpi":   (480, 240),
    "drawable-land-xhdpi":  (960, 480),
    "drawable-land-xxhdpi": (1440, 720),
    "drawable-land-xxxhdpi":(1920, 960),
    "drawable-port-hdpi":   (320, 640),
    "drawable-port-mdpi":   (240, 480),
    "drawable-port-xhdpi":  (480, 960),
    "drawable-port-xxhdpi": (720, 1440),
    "drawable-port-xxxhdpi":(960, 1920),
}

for folder, (w, h) in SPLASH_SIZES.items():
    out_dir = ANDROID_RES / folder
    out_dir.mkdir(parents=True, exist_ok=True)

    # Canvas verde sólido
    canvas = Image.new("RGBA", (w, h), (4, 120, 87, 255))

    # Logo no centro (40% da menor dimensão)
    logo_size = int(min(w, h) * 0.4)
    logo_png = ROOT / "scripts" / f"_splash_logo_{logo_size}.png"
    cairosvg.svg2png(url=str(SVG_PATH), write_to=str(logo_png), output_width=logo_size, output_height=logo_size)
    logo = Image.open(logo_png).convert("RGBA")

    offset = ((w - logo_size) // 2, (h - logo_size) // 2)
    canvas.alpha_composite(logo, offset)
    canvas.convert("RGB").save(out_dir / "splash.png", "PNG")

    print(f"[OK] Splash {folder}: {w}x{h}")

# ---------------------------------------------------------------------------
# 7. Limpeza dos PNGs temporários
# ---------------------------------------------------------------------------
import glob
for tmp in glob.glob(str(ROOT / "scripts" / "_*.png")):
    os.remove(tmp)
print("\n[OK] Limpeza concluída")
print("\nTodos os ícones gerados com sucesso!")
