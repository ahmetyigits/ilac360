// Reads source data from /data and emits minimized JSON to /client/public/data:
//   - drugs-index.json         slim records (id, name, ingredient, atc, barcode, categories, hasDescription)
//   - drugs-descriptions.json  id -> leaflet text (only drugs with usable descriptions)
//   - interactions.json        copied verbatim
//   - condition-mapping.json   copied verbatim

import { readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'data');
const OUT = join(ROOT, 'client', 'public', 'data');

const INVALID_INGREDIENTS = new Set([
  'etken maddesi bilgisi bulunamadı.',
  'etken maddesi bilgisi bulunamadı',
  'other cold preparations',
  'bilinmiyor',
  '-',
  '—',
]);

const INVALID_DESCRIPTION_MARKERS = [
  'ikinci siteye ait içerik bulunamadı',
  'içerik bulunamadı',
  'bilgi bulunamadı',
];

function isValidIngredient(s) {
  if (!s || !s.trim()) return false;
  return !INVALID_INGREDIENTS.has(s.trim().toLowerCase());
}

function isValidDescription(d) {
  if (!d || typeof d !== 'string') return false;
  const trimmed = d.trim();
  if (trimmed.length < 50) return false;
  const lower = trimmed.toLowerCase();
  for (const marker of INVALID_DESCRIPTION_MARKERS) {
    if (lower.includes(marker)) return false;
  }
  return true;
}

function cleanCategories(d) {
  return [d.Category_1, d.Category_2, d.Category_3, d.Category_4, d.Category_5]
    .map(c => c?.trim())
    .filter(c => c && c.length > 0 && c !== 'Yok');
}

const raw = JSON.parse(readFileSync(join(SRC, 'ilaclar-dataset.json'), 'utf-8'));
const drugs = raw[2].data;

// 1. geçiş: etkin madde → en sık görülen ATC kodu eşlemesini kur.
// Kaynak veride 4940 ilaçta ATC eksik; çoğunda etkin madde dolu ve aynı etkin
// maddenin ATC'si başka kayıtlarda biliniyor. 2. geçişte bu eksikleri dolduruyoruz.
const atcCountsByIngredient = new Map();
for (const d of drugs) {
  if (!isValidIngredient(d.Active_Ingredient)) continue;
  if (!d.ATC_code || d.ATC_code === '0') continue;
  const key = d.Active_Ingredient.trim().toLowerCase();
  const atc = d.ATC_code.trim();
  let counts = atcCountsByIngredient.get(key);
  if (!counts) {
    counts = new Map();
    atcCountsByIngredient.set(key, counts);
  }
  counts.set(atc, (counts.get(atc) || 0) + 1);
}
const ingredientToAtc = new Map();
for (const [ing, counts] of atcCountsByIngredient) {
  let bestAtc = null, bestCount = -1;
  for (const [atc, count] of counts) {
    if (count > bestCount) { bestAtc = atc; bestCount = count; }
  }
  if (bestAtc) ingredientToAtc.set(ing, bestAtc);
}

const index = [];
const descriptions = {};
let atcBackfilled = 0;

for (const d of drugs) {
  const ingredient = isValidIngredient(d.Active_Ingredient) ? d.Active_Ingredient.trim() : null;
  let atc = d.ATC_code && d.ATC_code !== '0' ? d.ATC_code.trim() : null;
  if (!atc && ingredient) {
    const inferred = ingredientToAtc.get(ingredient.toLowerCase());
    if (inferred) {
      atc = inferred;
      atcBackfilled++;
    }
  }
  const desc = isValidDescription(d.Description) ? d.Description.trim() : null;
  const id = String(d.ID);

  index.push({
    i: id,
    n: d.Product_Name,
    a: ingredient,
    t: atc,
    b: d.barcode || null,
    c: cleanCategories(d),
    h: !!desc,
  });

  if (desc) descriptions[id] = desc;
}

writeFileSync(join(OUT, 'drugs-index.json'), JSON.stringify(index));
writeFileSync(join(OUT, 'drugs-descriptions.json'), JSON.stringify(descriptions));

// Copy interaction rules + condition mapping verbatim (already small)
const interactions = JSON.parse(readFileSync(join(SRC, 'interactions.json'), 'utf-8'));
writeFileSync(join(OUT, 'interactions.json'), JSON.stringify(interactions));

const conditions = JSON.parse(readFileSync(join(SRC, 'condition-mapping.json'), 'utf-8'));
writeFileSync(join(OUT, 'condition-mapping.json'), JSON.stringify(conditions));

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(2) + ' MB';
const kb = (p) => (statSync(p).size / 1024).toFixed(1) + ' KB';
console.log('drugs-index.json        ', mb(join(OUT, 'drugs-index.json')), '(' + index.length + ' drugs, ATC backfilled: ' + atcBackfilled + ')');
console.log('drugs-descriptions.json ', mb(join(OUT, 'drugs-descriptions.json')), '(' + Object.keys(descriptions).length + ' descriptions)');
console.log('interactions.json       ', kb(join(OUT, 'interactions.json')), '(' + interactions.length + ' rules)');
console.log('condition-mapping.json  ', kb(join(OUT, 'condition-mapping.json')), '(' + conditions.length + ' conditions)');
