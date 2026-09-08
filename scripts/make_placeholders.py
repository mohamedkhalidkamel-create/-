"""
Generates placeholder product photos so the demo store has something to show.
The shop owner will eventually replace these with real product photography,
keeping the same filename pattern: Product_Name_PriceEGP.jpg
"""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Category -> soft base color (kept muted / editorial, not neon)
CATEGORY_COLORS = {
    "1_skincare": (222, 214, 201),   # warm sand
    "2_makeup":   (196, 122, 138),   # dusty berry
    "3_haircare": (176, 163, 138),   # taupe
    "4_bodycare": (203, 195, 170),   # oat
    "5_fragrances": (163, 138, 148), # muted plum
    "6_tools":    (183, 183, 175),   # stone grey
    "7_offers":   (201, 162, 92),    # muted gold
}

TEXT_COLOR = (43, 33, 29)  # near-black espresso

PRODUCTS = [
    ("1_skincare/a_cleansers", "Garnier_Micellar_Water_150EGP.jpg"),
    ("1_skincare/b_moisturizers", "Cerave_Moisturizing_Cream_480EGP.jpg"),
    ("1_skincare/b_moisturizers", "Nivea_Soft_Cream_120EGP.jpg"),
    ("1_skincare/c_serums", "The_Ordinary_Niacinamide_350EGP.jpg"),
    ("1_skincare/d_sunscreen", "La_Roche_Posay_Anthelios_650EGP.jpg"),
    ("1_skincare/e_masks", "Freeman_Clay_Mask_180EGP.jpg"),
    ("1_skincare/f_eye_lip", "Vaseline_Lip_Therapy_90EGP.jpg"),

    ("2_makeup/a_face", "Maybelline_Fit_Me_Foundation_380EGP.jpg"),
    ("2_makeup/b_eyes", "Essence_Lash_Princess_Mascara_150EGP.jpg"),
    ("2_makeup/c_lips", "MAC_Matte_Lipstick_650EGP.jpg"),
    ("2_makeup/d_palettes", "Huda_Beauty_Eyeshadow_Palette_1200EGP.jpg"),

    ("3_haircare/a_basics", "Head_Shoulders_Shampoo_140EGP.jpg"),
    ("3_haircare/b_hydration", "Tresemme_Hair_Mask_220EGP.jpg"),
    ("3_haircare/c_styling", "Gatsby_Styling_Wax_160EGP.jpg"),

    ("4_bodycare/a_wash", "Dove_Body_Wash_130EGP.jpg"),
    ("4_bodycare/b_scrubs", "Tree_Hut_Sugar_Scrub_300EGP.jpg"),
    ("4_bodycare/c_moisturizers", "Nivea_Body_Lotion_140EGP.jpg"),

    ("5_fragrances/a_perfumes", "Zara_Femme_EDP_450EGP.jpg"),
    ("5_fragrances/b_mists", "Bath_Body_Works_Mist_280EGP.jpg"),
    ("5_fragrances/c_essential_oils", "Lavender_Essential_Oil_180EGP.jpg"),

    ("6_tools/a_brushes", "Makeup_Brush_Set_350EGP.jpg"),
    ("6_tools/b_skincare_tools", "Jade_Face_Roller_220EGP.jpg"),
    ("6_tools/c_hair_tools", "Hair_Straightener_Brush_500EGP.jpg"),

    ("7_offers/a_bundles", "Skincare_Starter_Bundle_899EGP.jpg"),
    ("7_offers/b_discounts", "Summer_Fragrance_Set_599EGP.jpg"),
]

def load_font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

def make_image(path, label, color):
    W = H = 700
    img = Image.new("RGB", (W, H), color)
    draw = ImageDraw.Draw(img)

    # soft inner card
    pad = 40
    draw.rectangle([pad, pad, W - pad, H - pad], outline=TEXT_COLOR, width=2)

    # simple mark: a circle to suggest a bottle/jar cap
    cx, cy, r = W // 2, H // 2 - 60, 70
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=TEXT_COLOR, width=3)

    name = label.rsplit("_", 1)[0].replace("_", " ")
    font = load_font(34, bold=True)

    # wrap text manually
    words = name.split(" ")
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) > W - 120:
            lines.append(cur)
            cur = w
        else:
            cur = test
    if cur:
        lines.append(cur)

    y = H // 2 + 40
    for line in lines:
        tw = draw.textlength(line, font=font)
        draw.text(((W - tw) / 2, y), line, fill=TEXT_COLOR, font=font)
        y += 42

    img.save(path, "JPEG", quality=85)

for folder, filename in PRODUCTS:
    color = CATEGORY_COLORS[folder.split("/")[0]]
    full_dir = os.path.join(ROOT, folder)
    os.makedirs(full_dir, exist_ok=True)
    make_image(os.path.join(full_dir, filename), filename, color)

print(f"Generated {len(PRODUCTS)} placeholder product photos.")
