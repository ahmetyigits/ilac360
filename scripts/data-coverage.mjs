// Veri kapsam bekçisi: "sessiz boşluk" regresyonlarını yakalar. Sessiz ürün =
// ATC'si olmayan VE bileşenlerinden hiçbir kategori/sınıf türetilemeyen ürün —
// bu ürünler her ilaç×ilaç sorgusunda kategori emniyet ağının tamamen dışında
// kalır (yalnız ad-kuralı çalışır). Tebokan/deksketoprofen sınıfı açıkların
// kaynağı bu kümedir; sayı eşiği aşarsa build KIRILIR (ratchet: iyileştikçe
// eşik aşağı çekilmeli, asla yukarı esnetilmemeli).

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getComponents, buildSynonymLookup, normalizeRuleIngredient } from '../client/src/data/ingredientMatcher.js';
import { getAllCategories } from '../client/src/data/categoryRules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'client', 'public', 'data');

// Ratchet eşikleri (2026-08 denetim taban çizgisi: sessiz 1.028 → sözlük
// genişletmesi sonrası ölçülen değerin biraz üstü). Bunları YÜKSELTMEK yasak;
// yeni veri sessiz kümeyi büyütüyorsa sinonim/kürasyon eklenerek düzeltilir.
const SILENT_MAX = 760;
const BOTH_EMPTY_MAX = 0;
const MISSING_COMPONENT_MAX = 170;

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf-8'));
} catch {
  console.error('manifest.json yok — önce `npm run build:data` çalıştırın.');
  process.exit(1);
}
const file = (l) => JSON.parse(readFileSync(join(OUT, manifest.files[l]), 'utf-8'));
const index = file('drugs-index.json');
const componentAtc = file('component-atc.json');
const synonyms = file('ingredient-synonyms.json');
const lookup = buildSynonymLookup(synonyms);
// Sınıf anahtarları MOTORLA AYNI borudan normalize edilir (interactionEngine
// buildComponentClassMap deseni) — ham anahtar karşılaştırması "sarı kantaron"
// (ı) ile fold'lu kanonik "sari kantaron" (i) arasında sahte kaçak üretiyordu.
const componentClasses = {};
for (const [name, meta] of Object.entries(file('component-classes.json').components || {})) {
  const normalized = normalizeRuleIngredient(name, lookup);
  if (normalized) componentClasses[normalized] = meta;
}

let atcless = 0;
let silent = 0;
let bothEmpty = 0;
let supplementTotal = 0;
let supplementNoClass = 0;
const silentExamples = [];
const suppNoClassExamples = [];
const componentProductCount = new Map(); // kanonik bileşen → ürün sayısı (haritasızlar için)

for (const e of index) {
  const comps = getComponents(e.a, lookup);
  const derivable = comps.some((c) =>
    (componentAtc[c] && getAllCategories(componentAtc[c]).length > 0) ||
    (componentClasses[c]?.classes?.length > 0));
  if (e.s) {
    // Takviye kayıtları (build enjeksiyonu): ilaç sessiz-küme metriğine girmez —
    // etkileşim-anlamlı bileşeni olmayan takviye (propolis vb.) meşrudur ve
    // dürüstçe "bilinmiyor" kartı üretir. Yine de ayrı raporlanır.
    supplementTotal++;
    if (!derivable) {
      supplementNoClass++;
      if (suppNoClassExamples.length < 10) suppNoClassExamples.push(`${e.n} [${e.a}]`);
    }
    continue;
  }
  if (!e.t) {
    atcless++;
    if (!derivable) {
      silent++;
      if (silentExamples.length < 15) silentExamples.push(`${e.n} [${e.a || '—'}]`);
    }
  }
  if (!e.a && !e.t) bothEmpty++;
  for (const c of comps) {
    if (!componentAtc[c] && !componentClasses[c]) {
      componentProductCount.set(c, (componentProductCount.get(c) || 0) + 1);
    }
  }
}

const missingComponents = [...componentProductCount.entries()]
  .filter(([, n]) => n >= 3)
  .sort((a, b) => b[1] - a[1]);

console.log(`ATC'siz ürün                 : ${atcless}`);
console.log(`SESSİZ ürün (kategori yok)   : ${silent}  (eşik ${SILENT_MAX})`);
console.log(`Etken+ATC ikisi de boş       : ${bothEmpty}  (eşik ${BOTH_EMPTY_MAX})`);
console.log(`Haritasız bileşen (≥3 ürün)  : ${missingComponents.length}  (eşik ${MISSING_COMPONENT_MAX})`);
console.log(`Takviye kaydı                : ${supplementTotal} (sınıf türetilemeyen: ${supplementNoClass})`);
for (const s of suppNoClassExamples) console.log('    sınıfsız takviye:', s);
console.log('\nSessiz ürün örnekleri:');
for (const s of silentExamples) console.log('  -', s);
console.log('\nEn büyük haritasız bileşenler (sinonim/kürasyon adayı):');
for (const [c, n] of missingComponents.slice(0, 20)) console.log(`  ${String(n).padStart(4)}  ${c}`);

let fail = false;
if (silent > SILENT_MAX) { console.error(`\n✗ SESSİZ küme eşiği aşıldı: ${silent} > ${SILENT_MAX}`); fail = true; }
if (bothEmpty > BOTH_EMPTY_MAX) { console.error(`✗ Etken+ATC boş eşiği aşıldı: ${bothEmpty} > ${BOTH_EMPTY_MAX}`); fail = true; }
if (missingComponents.length > MISSING_COMPONENT_MAX) { console.error(`✗ Haritasız bileşen eşiği aşıldı: ${missingComponents.length} > ${MISSING_COMPONENT_MAX}`); fail = true; }
if (fail) process.exit(1);
console.log('\nVeri kapsam bekçisi geçti.');
