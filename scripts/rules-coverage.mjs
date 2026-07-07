// Kural kapsam raporu: interactions.json'daki her çift kuralının iki tarafının,
// veri setindeki GERÇEK etken madde bileşenleriyle (motorla birebir aynı
// normalizasyon hattından geçerek) eşleşip eşleşmediğini raporlar.
// Eşleşmeyen taraf = ya veri setinde olmayan bir madde (zararsız, ileriye dönük)
// ya da yazım farkı (sinonim eklenmeli). CI'da bilgi amaçlı çalışır.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getComponents,
  normalizeRuleIngredient,
  buildSynonymLookup,
} from '../client/src/data/ingredientMatcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'ilaclar-dataset.json'), 'utf-8'));
const drugs = raw[2].data;
const rules = JSON.parse(readFileSync(join(ROOT, 'data', 'interactions.json'), 'utf-8'));
const synonyms = JSON.parse(readFileSync(join(ROOT, 'data', 'ingredient-synonyms.json'), 'utf-8'));
const lookup = buildSynonymLookup(synonyms);

// Veri setindeki tüm kanonik bileşenler + kaç üründe geçtiği
const componentCounts = new Map();
for (const d of drugs) {
  for (const c of getComponents(d.Active_Ingredient, lookup)) {
    componentCounts.set(c, (componentCounts.get(c) || 0) + 1);
  }
}

let bothMatched = 0;
const unmatchedSides = new Map(); // taraf → kural sayısı
for (const rule of rules) {
  const a = normalizeRuleIngredient(rule.ingredientA, lookup);
  const b = normalizeRuleIngredient(rule.ingredientB, lookup);
  const aOk = a && componentCounts.has(a);
  const bOk = b && componentCounts.has(b);
  if (aOk && bOk) bothMatched++;
  if (!aOk) unmatchedSides.set(rule.ingredientA, (unmatchedSides.get(rule.ingredientA) || 0) + 1);
  if (!bOk) unmatchedSides.set(rule.ingredientB, (unmatchedSides.get(rule.ingredientB) || 0) + 1);
}

console.log(`Toplam çift kuralı        : ${rules.length}`);
console.log(`İki tarafı da eşleşen     : ${bothMatched} (%${((bothMatched / rules.length) * 100).toFixed(1)})`);
console.log(`Veri setindeki kanonik bileşen sayısı: ${componentCounts.size}`);

if (unmatchedSides.size > 0) {
  console.log(`\nVeri setinde karşılığı BULUNAMAYAN kural tarafları (${unmatchedSides.size}):`);
  const sorted = [...unmatchedSides.entries()].sort((x, y) => y[1] - x[1]);
  for (const [name, count] of sorted) {
    console.log(`  - "${name}" (${count} kuralda)`);
  }
  console.log('\nBu maddeler ya piyasada yok (zararsız) ya da yazım farkı var (sinonim ekleyin).');
}
