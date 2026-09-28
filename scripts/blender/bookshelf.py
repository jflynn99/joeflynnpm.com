"""Render a bookshelf of Joe's actual books with Blender.

Reads content/books/*.mdx, picks five-star reads grouped into shelves by
genre, and builds the scene entirely in code. The look lives in STYLES:
every material, light and camera choice reads from the chosen preset, so
a new look is a new dict entry, not a new scene.

Usage (needs Python 3.11 with Blender as a module: `pip install bpy==4.5.14`):

    python scripts/blender/bookshelf.py --style noir --out /tmp/noir.png
    python scripts/blender/bookshelf.py --style warm --samples 32 --scale 50

--style all renders every preset. --blend also saves the .blend next to
the image so it can be opened and tweaked in the Blender GUI.
"""

import argparse
import math
import random
import re
import sys
from pathlib import Path

import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BOOKS_DIR = ROOT / "content" / "books"
PUBLIC = ROOT / "public"
FONT = ROOT / "assets" / "fonts" / "Inter-Bold.ttf"

# Shelves, top to bottom. Each takes the most recent five-star reads whose
# first genre is in its list.
SHELVES = [
    ("Fiction", ["Sci-Fi", "Fantasy", "Literary Fiction", "Classics", "Horror", "Crime & Thriller"]),
    ("History & ideas", ["History", "Historical Fiction", "Politics & Economics", "Biography & Memoir", "True Crime"]),
    ("Science & mind", ["Science", "Philosophy", "Psychology", "AI & Tech", "Business & Product", "Health & Habits", "Parenting"]),
]

# Site tokens (globals.css, --hue 70) resolved to sRGB, same as app/og/route.tsx.
SITE_BG = "#141210"
SITE_CARD = "#1f1c19"
SITE_ACCENT = "#f5a524"

STYLES = {
    # Photoreal study: walnut, cream plaster, warm lamp light.
    "warm": dict(
        wall="#d9cbb4", wall_rough=0.9,
        wood="#5a3a22", wood_dark="#3a2414", wood_grain=True, wood_rough=0.45,
        book_sat=1.0, book_val=1.0, book_rough=0.55, text=True,
        key=dict(color="#ffd9a8", energy=450, size=1.2, loc=(-1.4, -2.2, 2.6)),
        fill=dict(color="#cfe0ff", energy=120, size=3.0, loc=(2.2, -2.5, 1.2)),
        strip=None, world="#2a2420", world_strength=0.4,
        lens=40, props=True,
    ),
    # Site-native: near-black shelf that disappears into the page background,
    # amber LED strip under each shelf as the only real light.
    "noir": dict(
        wall=SITE_BG, wall_rough=0.95,
        wood=SITE_CARD, wood_dark=SITE_CARD, wood_grain=False, wood_rough=0.35,
        book_sat=0.85, book_val=0.8, book_rough=0.5, text=True,
        key=dict(color="#fff1dc", energy=120, size=2.5, loc=(-0.8, -2.6, 1.9)),
        fill=None,
        strip=dict(color=SITE_ACCENT, strength=40.0),
        world=SITE_BG, world_strength=0.15,
        lens=40, props=False,
    ),
    # Stylised clay: flat pastel colours, soft even light, no text.
    "clay": dict(
        wall="#efe6da", wall_rough=1.0,
        wood="#e2cfb4", wood_dark="#e2cfb4", wood_grain=False, wood_rough=1.0,
        book_sat=0.9, book_val=1.0, book_mix=0.3, book_rough=1.0, text=False,
        key=dict(color="#ffffff", energy=500, size=4.0, loc=(-1.0, -3.0, 3.0)),
        fill=dict(color="#fff3e6", energy=200, size=4.0, loc=(2.0, -3.0, 0.5)),
        strip=None, world="#f5efe7", world_strength=0.8,
        lens=40, props=True,
    ),
}

SHELF_W = 1.35      # inner width, metres
SHELF_GAP = 0.34    # vertical spacing between shelf boards
BOARD_T = 0.025
DEPTH = 0.26


# ---------------------------------------------------------------- data

def read_books():
    books = []
    for f in sorted(BOOKS_DIR.glob("*.mdx")):
        fm = f.read_text().split("---")[1]
        def field(k):
            m = re.search(rf'^{k}:\s*"?(.*?)"?\s*$', fm, re.M)
            return m.group(1) if m else ""
        genres = re.findall(r'"([^"]+)"', field("genres"))
        cover = field("coverImage")
        if not cover or not (PUBLIC / cover.lstrip("/")).exists():
            continue
        books.append(dict(
            title=re.sub(r"\s*\(.*?\)\s*$", "", field("title")),
            author=field("author"),
            rating=int(field("rating") or 0),
            date=field("dateRead"),
            genre=genres[0] if genres else "",
            cover=PUBLIC / cover.lstrip("/"),
        ))
    return books


def pick_shelves(books):
    fives = sorted((b for b in books if b["rating"] == 5), key=lambda b: b["date"], reverse=True)
    return [(name, [b for b in fives if b["genre"] in genres]) for name, genres in SHELVES]


# ---------------------------------------------------------------- colour

def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def to_linear(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def lin(h):
    return (*to_linear(hex_rgb(h)), 1.0)


def cover_colour(img):
    """Most common colour on the cover, ignoring near-white/near-black."""
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    rgb = px.reshape(-1, 4)[:, :3]
    lum = rgb.mean(axis=1)
    rgb = rgb[(lum > 0.08) & (lum < 0.92)] if ((lum > 0.08) & (lum < 0.92)).sum() > 500 else rgb
    q = (rgb * 7.99).astype(int)
    keys = q[:, 0] * 64 + q[:, 1] * 8 + q[:, 2]
    top = np.bincount(keys).argmax()
    return tuple(rgb[keys == top].mean(axis=0))  # sRGB-encoded


def adjust(rgb, sat, val, mix=0.0):
    """Scale saturation/value, then blend towards white by `mix`."""
    import colorsys
    h, s, v = colorsys.rgb_to_hsv(*rgb)
    r = colorsys.hsv_to_rgb(h, min(1, s * sat), min(1, v * val))
    return tuple(c * (1 - mix) + mix for c in r)


# ---------------------------------------------------------------- materials

def mat_flat(name, colour, rough=0.5, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = colour
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metallic
    return m


def mat_wood(s):
    m = mat_flat("wood", lin(s["wood"]), s["wood_rough"])
    if not s["wood_grain"]:
        return m
    nt = m.node_tree
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 18.0, 1.0)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 3.0
    wave.inputs["Distortion"].default_value = 6.0
    wave.inputs["Detail"].default_value = 4.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = lin(s["wood_dark"])
    ramp.color_ramp.elements[1].color = lin(s["wood"])
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def mat_image(name, img, rough=0.4):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    p = nt.nodes["Principled BSDF"]
    p.inputs["Roughness"].default_value = rough
    nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    return m


def mat_emit(name, colour, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = colour
    e.inputs["Strength"].default_value = strength
    nt.links.new(e.outputs["Emission"], nt.nodes["Material Output"].inputs["Surface"])
    return m


# ---------------------------------------------------------------- geometry

def box(name, size, loc, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    bev = o.modifiers.new("bevel", "BEVEL")
    bev.width = min(size) * 0.08
    bev.segments = 2
    o.data.materials.append(mat)
    return o


def spine_text(book, x, z, thick, height, colour, font):
    curve = bpy.data.curves.new(f"t_{book['title'][:20]}", "FONT")
    curve.font = font
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    size = min(thick * 0.42, 0.018)
    max_chars = int(height * 0.82 / (size * 0.62))
    title = book["title"].upper()
    curve.body = title if len(title) <= max_chars else title[: max_chars - 1].rstrip() + "…"
    curve.size = size
    o = bpy.data.objects.new(curve.name, curve)
    bpy.context.collection.objects.link(o)
    # Face the camera (-Y) and read top-to-bottom, as English spines do.
    o.rotation_euler = (math.radians(90), math.radians(90), 0)
    o.location = (x, -DEPTH / 2 + 0.01 - 0.0012, z)
    o.data.materials.append(mat_flat("ink", colour, 0.6))
    return o


def build_shelf_row(books, y_base, s, rng, font, stats):
    x = -SHELF_W / 2 + 0.02
    face_out = books[0]
    rest = books[1:]
    end = SHELF_W / 2 - 0.02

    # Face-out favourite: real cover on the front.
    img = bpy.data.images.load(str(face_out["cover"]), check_existing=True)
    cw, ch = img.size
    fh = 0.235
    fw = fh * cw / ch
    fx = end - fw / 2 - 0.02
    box("faceout", (fw, 0.02, fh), (fx, -DEPTH / 2 + 0.06, y_base + fh / 2), mat_flat("fo_edge", (0.9, 0.88, 0.84, 1), 0.7),
        rot=(math.radians(-8), 0, 0))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(fx, -DEPTH / 2 + 0.06 - 0.0115, y_base + fh / 2 - 0.002),
                                     rotation=(math.radians(90 - 8), 0, 0))
    plane = bpy.context.object
    plane.scale = (fw * 0.995, fh * 0.995, 1)
    plane.data.materials.append(mat_image("fo_cover", img, 0.35))
    end = fx - fw / 2 - 0.035

    for b in rest:
        thick = rng.uniform(0.024, 0.042)
        if x + thick > end:
            break
        height = rng.uniform(0.18, 0.245)
        depth = rng.uniform(0.15, 0.19)
        img = bpy.data.images.load(str(b["cover"]), check_existing=True)
        rgb = adjust(cover_colour(img), s["book_sat"], s["book_val"], s.get("book_mix", 0.0))
        colour = (*to_linear(rgb), 1)
        lean = 0.0
        box(f"book_{b['title'][:20]}", (thick, depth, height), (x + thick / 2, -DEPTH / 2 + depth / 2 + 0.01, y_base + height / 2),
            mat_flat("spine", colour, s["book_rough"]), rot=(0, lean, 0))
        if s["text"]:
            lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
            ink = (0.92, 0.9, 0.86, 1) if lum < 0.5 else (0.03, 0.03, 0.03, 1)
            spine_text(b, x + thick / 2, y_base + height / 2, thick, height, ink, font)
        x += thick + rng.uniform(0.0005, 0.003)
        stats["spines"] += 1
    stats["faceout"].append(face_out["title"])

    # A leaning book or small prop in the gap, if there's room.
    if s["props"] and end - x > 0.09:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.07, location=((x + end) / 2, 0, y_base + 0.035))
        bpy.context.object.data.materials.append(mat_flat("pot", lin("#b8643c"), 0.8))
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.05, location=((x + end) / 2, 0, y_base + 0.1))
        bpy.ops.object.shade_smooth()
        bpy.context.object.data.materials.append(mat_flat("leaf", lin("#4f7a3a"), 0.7))


def build(style, seed=7):
    s = STYLES[style]
    rng = random.Random(seed)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    font = bpy.data.fonts.load(str(FONT))
    stats = dict(spines=0, faceout=[])

    wood = mat_wood(s)
    rows = pick_shelves(read_books())
    n = len(rows)
    total_h = n * SHELF_GAP + BOARD_T

    # Carcass: back panel, sides, boards.
    box("back", (SHELF_W + 0.05, 0.02, total_h), (0, DEPTH / 2, total_h / 2), wood)
    for sx in (-1, 1):
        box(f"side{sx}", (BOARD_T, DEPTH, total_h + 0.02), (sx * (SHELF_W / 2 + BOARD_T / 2), 0, total_h / 2), wood)
    for i in range(n + 1):
        box(f"board{i}", (SHELF_W, DEPTH, BOARD_T), (0, 0, i * SHELF_GAP + BOARD_T / 2), wood)

    # Wall and floor.
    wall = mat_flat("wall", lin(s["wall"]), s["wall_rough"])
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, DEPTH / 2 + 0.02, 1.5), rotation=(math.radians(90), 0, 0))
    bpy.context.object.data.materials.append(wall)
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, -0.001))
    bpy.context.object.data.materials.append(wall)

    for i, (_, books) in enumerate(rows):
        shelf_top = (n - i - 1) * SHELF_GAP + BOARD_T
        build_shelf_row(books, shelf_top, s, rng, font, stats)
        if s["strip"]:
            # LED strip tucked under the board above, towards the front.
            z = shelf_top + SHELF_GAP - BOARD_T - 0.004
            box(f"strip{i}", (SHELF_W - 0.04, 0.008, 0.004), (0, -DEPTH / 2 + 0.02, z),
                mat_emit("led", lin(s["strip"]["color"]), s["strip"]["strength"]))

    # Lights.
    for key in ("key", "fill"):
        L = s[key]
        if not L:
            continue
        bpy.ops.object.light_add(type="AREA", location=L["loc"])
        lo = bpy.context.object
        lo.data.energy = L["energy"]
        lo.data.size = L["size"]
        lo.data.color = hex_rgb(L["color"])
        target = (0, 0, total_h / 2)
        d = [t - l for t, l in zip(target, L["loc"])]
        lo.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)

    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = lin(s["world"])
    world.node_tree.nodes["Background"].inputs[1].default_value = s["world_strength"]
    bpy.context.scene.world = world

    # Camera: slightly left and below eye-line of the middle shelf, so the
    # face-out covers on the right read clearly.
    bpy.ops.object.camera_add(location=(-0.25, -2.35, total_h / 2 + 0.08), rotation=(math.radians(88), 0, math.radians(-5)))
    cam = bpy.context.object
    cam.data.lens = s["lens"]
    bpy.context.scene.camera = cam
    return stats


def render(out, samples, scale, blend):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1600, 900
    sc.render.resolution_percentage = scale
    sc.view_settings.view_transform = "AgX"
    sc.render.filepath = str(out)
    if blend:
        bpy.ops.wm.save_as_mainfile(filepath=str(Path(out).with_suffix(".blend")))
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--style", default="noir", choices=[*STYLES, "all"])
    ap.add_argument("--out", default="bookshelf-{style}.png")
    ap.add_argument("--samples", type=int, default=96)
    ap.add_argument("--scale", type=int, default=100, help="resolution percentage")
    ap.add_argument("--blend", action="store_true")
    a = ap.parse_args(argv)
    for style in (STYLES if a.style == "all" else [a.style]):
        stats = build(style)
        out = Path(a.out.format(style=style)).resolve()
        render(out, a.samples, a.scale, a.blend)
        print(f"{style}: {stats['spines']} spines, face-out: {', '.join(stats['faceout'])} -> {out}")


if __name__ == "__main__":
    main()
