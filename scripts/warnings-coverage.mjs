// Tekil ilaç uyarı kapsam raporu: drug-warnings.json kayıtlarının veri setindeki
// GERÇEK ürünlerle (motorla birebir aynı eşleşme mantığıyla) kaç üründe uyarı
// ürettiğini raporlar. İki amaç:
//   1. Sinonim boşlukları: hiçbir ürünle eşleşmeyen kayıt/taraf görünür olur.
//   2. Aşırı geniş ATC prefix'leri: kayıt başına ürün sayısı beklenmedik
//      büyükse (ör. sedasyonsuz antihistaminikleri de kapsayan R06A) fark edilir.
// CI'da bilgi amaçlı çalışır (kapı değil).

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { compileWarnings, matchWarnings } from '../client/src/data/warningMatcher.js';
import { buildSynonymLookup } from '../client/src/data/ingredientMatcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Ham dataset DEĞİL, üretilmiş index okunur: build ATC/etken backfill'i ve form
// tespitini yapar; runtime da index'i kullanır. Ham veriyle ölçüm kapsamı
// olduğundan düşük gösterir (backfill'siz ATC'ler eşleşmez).
const OUT = join(ROOT, 'client', 'public', 'data');
let manifest;
try {
  manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf-8'));
} catch {
  console.error('client/public/data/manifest.json bulunamadı — önce `npm run build:data` çalıştırın.');
  process.exit(1);
}
const index = JSON.parse(readFileSync(join(OUT, manifest.files['drugs-index.json']), 'utf-8'));
const warnings = JSON.parse(readFileSync(join(ROOT, 'data', 'drug-warnings.json'), 'utf-8'));
const synonyms = JSON.parse(readFileSync(join(ROOT, 'data', 'ingredient-synonyms.json'), 'utf-8'));

const lookup = buildSynonymLookup(synonyms);
const compiled = compileWarnings(warnings, lookup);

const productsPerWarning = new Map(); // id → ürün sayısı
const perType = new Map();            // type → ≥1 uyarılı ürün sayısı
let covered = 0;

for (const d of index) {
  const matched = matchWarnings(compiled, {
    activeIngredient: d.a,
    atcCode: d.t,
    form: d.f,
  }, lookup);
  if (matched.length > 0) covered++;
  const types = new Set();
  for (const w of matched) {
    productsPerWarning.set(w.id, (productsPerWarning.get(w.id) || 0) + 1);
    types.add(w.type);
  }
  for (const t of types) perType.set(t, (perType.get(t) || 0) + 1);
}

console.log(`Toplam uyarı kaydı        : ${warnings.length}`);
console.log(`≥1 uyarısı olan ürün      : ${covered} / ${index.length} (%${((covered / index.length) * 100).toFixed(1)})`);
console.log('Tip bazında ürün kapsamı  :');
for (const [t, c] of [...perType.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  - ${t.padEnd(10)} ${c}`);
}

// Kayıt başına ürün sayısı — aşırı geniş / hiç eşleşmeyen kayıtları göster
const rows = warnings.map((w) => ({ id: w.id, type: w.type, title: w.title, n: productsPerWarning.get(w.id) || 0 }));
rows.sort((a, b) => b.n - a.n);
console.log('\nEn geniş kapsamlı 10 kayıt (aşırı genişlik kontrolü):');
for (const r of rows.slice(0, 10)) {
  console.log(`  ${r.id} [${r.type}] ${String(r.n).padStart(5)} ürün — ${r.title}`);
}

const unmatched = rows.filter((r) => r.n === 0);
if (unmatched.length > 0) {
  console.log(`\nHİÇBİR ürünle eşleşmeyen kayıtlar (${unmatched.length}) — sinonim boşluğu veya piyasada yok:`);
  for (const r of unmatched) console.log(`  - ${r.id} [${r.type}] ${r.title}`);
} else {
  console.log('\nTüm uyarı kayıtları en az bir ürünle eşleşiyor.');
}
