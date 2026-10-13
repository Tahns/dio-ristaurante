// Contrôle qualité du site généré (site/). Échoue si une page est cassée.
// node scripts/check.mjs   (après node build.mjs)
import fs from "node:fs";
import path from "node:path";

const ROOT = "site";
const errors = [];
const warnings = [];

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "admin") walk(p); }
    else if (e.name.endsWith(".html")) htmlFiles.push(p);
  }
})(ROOT);

const exists = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const p = path.join(ROOT, clean);
  return fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, "index.html")));
};

const titles = new Map();
for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file);
  const html = fs.readFileSync(file, "utf8");

  if (/\{\{[^}]*\}\}/.test(html)) errors.push(`${rel} : balise de gabarit non remplacée`);

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
  if (!title) errors.push(`${rel} : <title> manquant`);
  else if (titles.has(title)) errors.push(`${rel} : titre identique à ${titles.get(title)}`);
  else titles.set(title, rel);

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  if (desc.length < 50) errors.push(`${rel} : meta description absente ou trop courte`);
  else if (desc.length > 200) warnings.push(`${rel} : meta description longue (${desc.length} caractères)`);

  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) errors.push(`${rel} : ${h1} balises H1 (1 attendue)`);

  for (const [, attr, url] of html.matchAll(/\s(href|src)="(\/[^"]*)"/g)) {
    if (!exists(url)) errors.push(`${rel} : lien interne cassé ${attr}="${url}"`);
  }

  for (const [img] of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(img)) errors.push(`${rel} : image sans attribut alt ${img.slice(0, 80)}`);
  }

  if (html.includes('class="todo"')) warnings.push(`${rel} : champs « [à compléter] » encore présents`);
}

if (/class="tag-example"/.test(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"))) warnings.push("Avis d'exemple encore affichés sur l'accueil : à remplacer par les vrais avis Google");

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} erreur(s) sur ${htmlFiles.length} pages.`);
  process.exit(1);
}
console.log(`✓ ${htmlFiles.length} pages vérifiées : liens internes, titres, descriptions, H1, images.`);
