// Reçete tipi kürasyon linti: data/prescription-types.json şemasını doğrular ve
// kaç molekülün gerçekten veri setindeki ürünlere eşleştiğini raporlar.
// Amaç: yanlış tip/eksik source erken yakalansın; ölü (hiç ürüne değmeyen) kayıt
// görünsün. Build ile aynı getComponents boru hattını kullanır.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getComponents, buildSynonymLookup } from '../client/src/data/ingredientMatcher.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data');

const VALID = new Set(['kirmizi', 'yesil', 'turuncu', 'mor']);

const rx = JSON.parse(readFileSync(join(SRC, 'prescription-types.json'), 'utf-8'));
const components = rx.components || {};

let errors = 0;
for (const [comp, o] of Object.entries(components)) {
  if (!o || !VALID.has(o.type)) {
    console.error(`  HATA: geçersiz tip '${o && o.type}' (${comp})`);
    errors++;
  }
  if (!o || !o.source || !String(o.source).trim()) {
    console.error(`  HATA: source zorunlu (${comp})`);
    errors++;
  }
}
if (errors > 0) {
  console.error(`Reçete linti BAŞARISIZ (${errors} hata).`);
  process.exit(1);
}

// Kapsam: her bileşen anahtarı gerçekten bir ürüne değiyor mu?
const drugs = JSON.parse(readFileSync(join(SRC, 'ilaclar-dataset.json'), 'utf-8'))[2].data;
let synonyms = {};
try { synonyms = JSON.parse(readFileSync(join(SRC, 'ingredient-synonyms.json'), 'utf-8')); } catch { /* opsiyonel */ }
const synonymLookup = buildSynonymLookup(synonyms);

const hitCount = new Map(); // comp -> ürün sayısı
const productType = new Map(); // tip -> ürün sayısı (en kısıtlayıcı)
const PRIORITY = { kirmizi: 0, yesil: 1, turuncu: 2, mor: 3 };
for (const d of drugs) {
  let best = null;
  for (const comp of getComponents(d.Active_Ingredient, synonymLookup)) {
    const t = components[comp]?.type;
    if (!t) continue;
    hitCount.set(comp, (hitCount.get(comp) || 0) + 1);
    if (best === null || PRIORITY[t] < PRIORITY[best]) best = t;
  }
  if (best) productType.set(best, (productType.get(best) || 0) + 1);
}

console.log(`Reçete kaydı: ${Object.keys(components).length} molekül`);
for (const t of ['kirmizi', 'yesil', 'turuncu', 'mor']) {
  if (productType.get(t)) console.log(`  ${t}: ${productType.get(t)} ürün`);
}
const dead = Object.keys(components).filter((c) => !hitCount.has(c));
if (dead.length) {
  console.log(`Uyarı: veri setinde hiç ürüne değmeyen ${dead.length} molekül (ileride ürün gelebilir): ${dead.join(', ')}`);
}
console.log('Reçete linti geçti.');
