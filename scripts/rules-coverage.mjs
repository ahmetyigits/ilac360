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

// Yeniden kullanılabilir çekirdek: ingest-dataset.mjs kapsam DELTASI için de çağırır.
export function computeCoverage(drugs, rules, synonyms) {
  const lookup = buildSynonymLookup(synonyms);
  const componentCounts = new Map();
  for (const d of drugs) {
    for (const c of getComponents(d.Active_Ingredient, lookup)) {
      componentCounts.set(c, (componentCounts.get(c) || 0) + 1);
    }
  }
  let bothMatched = 0;
  const unmatchedSides = new Map();
  for (const rule of rules) {
    const a = normalizeRuleIngredient(rule.ingredientA, lookup);
    const b = normalizeRuleIngredient(rule.ingredientB, lookup);
    const aOk = a && componentCounts.has(a);
    const bOk = b && componentCounts.has(b);
    if (aOk && bOk) bothMatched++;
    if (!aOk) unmatchedSides.set(rule.ingredientA, (unmatchedSides.get(rule.ingredientA) || 0) + 1);
    if (!bOk) unmatchedSides.set(rule.ingredientB, (unmatchedSides.get(rule.ingredientB) || 0) + 1);
  }
  return {
    coveragePct: (bothMatched / rules.length) * 100,
    bothMatched,
    componentCount: componentCounts.size,
    unmatchedSides,
    lookup,
  };
}

// Aşağısı CLI raporu: yalnız doğrudan çalıştırıldığında koşar
// (ingest-dataset.mjs computeCoverage'ı import ederken rapor basılmaz).
import { pathToFileURL } from 'url';
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (!isMain) {
  // modül olarak import edildi — CLI kısmına girme
} else {
  runCli();
}

function runCli() {
const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'ilaclar-dataset.json'), 'utf-8'));
// Takviye kataloğu da aramada kalıcı olarak yer alır (build'de id 9000001+ ile
// enjekte edilir); bu yüzden yalnız takviyede geçen maddeler (ör. sarı kantaron)
// de kapsam havuzuna girmeli. ingredients alanı Active_Ingredient'e eşlenir.
const supplements = JSON.parse(readFileSync(join(ROOT, 'data', 'supplement-products.json'), 'utf-8'));
const supplementDrugs = (supplements.products || []).map((p) => ({ Active_Ingredient: p.ingredients }));
const drugs = raw[2].data.concat(supplementDrugs);
const rules = JSON.parse(readFileSync(join(ROOT, 'data', 'interactions.json'), 'utf-8'));
const synonyms = JSON.parse(readFileSync(join(ROOT, 'data', 'ingredient-synonyms.json'), 'utf-8'));
const { coveragePct, bothMatched, componentCount, unmatchedSides, lookup } = computeCoverage(drugs, rules, synonyms);
const componentCounts = { size: componentCount };
console.log(`Toplam çift kuralı        : ${rules.length}`);
console.log(`İki tarafı da eşleşen     : ${bothMatched} (%${coveragePct.toFixed(1)})`);
console.log(`Veri setindeki kanonik bileşen sayısı: ${componentCounts.size}`);

// İzin listesi: piyasada bilinçli olarak olmayan maddeler kapıyı düşürmez.
let allowlist = new Set();
try {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'coverage-allowlist.json'), 'utf-8'));
  allowlist = new Set((raw.allowed || []).map((n) => normalizeRuleIngredient(n, lookup)).filter(Boolean));
} catch {
  // allowlist yoksa boş kabul edilir
}

const unexpectedUnmatched = [];
if (unmatchedSides.size > 0) {
  console.log(`\nVeri setinde karşılığı BULUNAMAYAN kural tarafları (${unmatchedSides.size}):`);
  const sorted = [...unmatchedSides.entries()].sort((x, y) => y[1] - x[1]);
  for (const [name, count] of sorted) {
    const normalized = normalizeRuleIngredient(name, lookup);
    const allowed = normalized && allowlist.has(normalized);
    console.log(`  - "${name}" (${count} kuralda)${allowed ? ' [izin listesinde]' : ''}`);
    if (!allowed) unexpectedUnmatched.push(name);
  }
  console.log('\nBu maddeler ya piyasada yok (izin listesine ekleyin) ya da yazım farkı var (sinonim ekleyin).');
}

// --- CI kapısı: --min <yüzde> ---
const minArg = process.argv.find((a) => a.startsWith('--min'));
if (minArg) {
  const threshold = parseFloat(minArg.includes('=') ? minArg.split('=')[1] : process.argv[process.argv.indexOf(minArg) + 1]);
  let failed = false;
  if (Number.isFinite(threshold) && coveragePct < threshold) {
    console.error(`\nKAPI BAŞARISIZ: kapsam %${coveragePct.toFixed(1)} < eşik %${threshold}`);
    failed = true;
  }
  if (unexpectedUnmatched.length > 0) {
    console.error(`\nKAPI BAŞARISIZ: izin listesinde olmayan eşleşmemiş taraflar: ${unexpectedUnmatched.join(', ')}`);
    failed = true;
  }
  if (failed) process.exit(1);
  console.log(`\nKapsam kapısı geçti (%${coveragePct.toFixed(1)} ≥ %${threshold}).`);
}
}
