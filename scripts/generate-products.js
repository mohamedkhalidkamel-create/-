#!/usr/bin/env node
/**
 * generate-products.js
 * ---------------------
 * Static websites can't ask a browser to "list the files in this folder" —
 * browsers are deliberately blocked from reading a server's file system.
 * So instead of Vanilla JS scanning folders live, this small Node script
 * does that scan ONCE, on your computer, and writes the result to
 * products.json. The website's own JS (js/main.js) simply reads that file.
 *
 * Workflow for adding/removing products:
 *   1. Drop or delete image files inside the numbered category folders,
 *      following the naming convention: Product_Name_PriceEGP.jpg
 *   2. Run:  node scripts/generate-products.js
 *   3. Re-upload / redeploy the updated products.json along with the images.
 *
 * No database, no build tooling beyond plain Node.js.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// Main category folders -> Arabic display name
const CATEGORY_LABELS = {
  "1_skincare": "العناية بالبشرة",
  "2_makeup": "المكياج",
  "3_haircare": "العناية بالشعر",
  "4_bodycare": "العناية بالجسم",
  "5_fragrances": "العطور",
  "6_tools": "الأدوات والإكسسوارات",
  "7_offers": "العروض والباقات",
};

// Subcategory folders -> Arabic display name (extend freely)
const SUBCATEGORY_LABELS = {
  a_cleansers: "منظفات وغسول",
  b_moisturizers: "مرطبات وزيوت",
  c_serums: "سيروم ومعالجات",
  d_sunscreen: "واقيات الشمس",
  e_masks: "أقنعة وماسكات",
  f_eye_lip: "العناية بالعين والشفاة",

  a_face: "الوجه",
  b_eyes: "العيون",
  c_lips: "الشفاه",
  d_palettes: "مجموعات وباليتات",

  a_basics: "الأساسيات",
  b_hydration: "العناية والترطيب",
  c_styling: "التصفيف والمعالجة",

  a_wash: "صابون وغسول الجسم",
  b_scrubs: "مقشرات الجسم",
  c_moisturizers: "ترطيب الجسم",

  a_perfumes: "عطور",
  b_mists: "معطرات الجسم والشعر",
  c_essential_oils: "زيوت عطرية",

  a_brushes: "فرش وإسفنجات",
  b_skincare_tools: "أدوات البشرة",
  c_hair_tools: "أدوات الشعر",

  a_bundles: "مجموعات العناية",
  b_discounts: "تخفيضات خاصة",
};

function parseFilename(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const match = base.match(/^(.*)_(\d+(?:\.\d+)?)EGP$/i);
  if (!match) return null;
  const rawName = match[1].replace(/_/g, " ").trim();
  const price = parseFloat(match[2]);
  return { name: rawName, price };
}

function scan() {
  const products = [];
  const mainFolders = Object.keys(CATEGORY_LABELS);

  for (const mainFolder of mainFolders) {
    const mainPath = path.join(ROOT, mainFolder);
    if (!fs.existsSync(mainPath)) continue;

    const subFolders = fs
      .readdirSync(mainPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const subFolder of subFolders) {
      const subPath = path.join(mainPath, subFolder);
      const files = fs.readdirSync(subPath);

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!IMAGE_EXTENSIONS.includes(ext)) continue;

        const parsed = parseFilename(file);
        if (!parsed) {
          console.warn(`  ! Skipped "${file}" — doesn't match Name_PriceEGP${ext}`);
          continue;
        }

        products.push({
          id: `${mainFolder}/${subFolder}/${file}`,
          name: parsed.name,
          price: parsed.price,
          image: `${mainFolder}/${subFolder}/${file}`,
          category: mainFolder,
          categoryLabel: CATEGORY_LABELS[mainFolder] || mainFolder,
          subcategory: subFolder,
          subcategoryLabel: SUBCATEGORY_LABELS[subFolder] || subFolder,
        });
      }
    }
  }
  return products;
}

const products = scan();
const outPath = path.join(ROOT, "products.json");
fs.writeFileSync(outPath, JSON.stringify(products, null, 2), "utf-8");
console.log(`\n✓ Wrote ${products.length} products to products.json`);
