// Yeni TİTCK veri seti alımı — yarı-otomatik aylık yenileme aracı.
//
//   node scripts/ingest-dataset.mjs <yeni-export.json>                 → rapor
//   node scripts/ingest-dataset.mjs <yeni-export.json> --apply         → uygula
//   node scripts/ingest-dataset.mjs <yeni-export.json> --min-coverage 95
//
// Adımlar: (1) şema doğrulama, (2) mevcut veriyle diff raporu,
// (3) kural-kapsam deltası (eşik altı → exit 1), (4) --apply ile değiştir +
// build-data + smoke-test. İnsan raporu okuyup onaylamadan --apply ÇAĞRILMAZ.
// Aylık akış için: docs/data-refresh-runbook.md

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { searchFold } from '../client/src/data/turkishText.js';
import { computeCoverage } from './rules-coverage.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CURRENT = join(ROOT, 'data', 'ilaclar-dataset.json');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
const minIdx = args.findIndex((a) => a.startsWith('--min-coverage'));
const minCoverage = minIdx >= 0
  ? parseFloat(args[minIdx].includes('=') ? args[minIdx].split('=')[1] : args[minIdx + 1])
  : 95;

if (!file) {
  console.error('Kullanım: node scripts/ingest-dataset.mjs <yeni-export.json> [--apply] [--min-coverage 95]');
  process.exit(1);
}

// ---- 1) Şema doğrulama ----
function loadAndValidate(path, label) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    console.error(`${label}: JSON okunamadı/parse edilemedi: ${e.message}`);
    process.exit(1);
  }
  const shapeError = () => {
    console.error(
      `${label}: beklenmeyen şema. Beklenen: phpMyAdmin JSON export'u — ` +
      `üç elemanlı dizi, [2].type === 'table' ve [2].data ilaç kayıtları dizisi. ` +
      `TİTCK verisini aynı yöntemle (phpMyAdmin > Dışa Aktar > JSON) alın.`
    );
    process.exit(1);
  };
  if (!Array.isArray(raw) || !raw[2] || raw[2].type !== 'table' || !Array.isArray(raw[2].data)) shapeError();
  const drugs = raw[2].data;
  if (drugs.length < 1000) {
    console.error(`${label}: yalnızca ${drugs.length} kayıt var — export eksik görünüyor.`);
    process.exit(1);
  }
  // Örneklem üzerinde zorunlu alan kontrolü
  const sample = drugs.slice(0, 200);
  const missingId = sample.filter((d) => d.ID == null).length;
  const missingName = sample.filter((d) => !d.Product_Name).length;
  if (missingId > 0 || missingName > 0) {
    console.error(`${label}: örneklemde eksik zorunlu alan (ID: ${missingId}, Product_Name: ${missingName}).`);
    process.exit(1);
  }
  const ids = new Set();
  let dupIds = 0;
  for (const d of drugs) {
    const id = String(d.ID);
    if (ids.has(id)) dupIds++;
    ids.add(id);
  }
  if (dupIds > 0) {
    console.error(`${label}: ${dupIds} mükerrer ID — export bozuk olabilir.`);
    process.exit(1);
  }
  return drugs;
}

const newDrugs = loadAndValidate(file, 'YENİ export');
const oldDrugs = loadAndValidate(CURRENT, 'MEVCUT veri');
console.log(`Şema doğrulandı: yeni ${newDrugs.length} kayıt, mevcut ${oldDrugs.length} kayıt.\n`);

// ---- 2) Diff raporu (barkod anahtarlı; ID'ler exportlar arası değişebilir) ----
const keyOf = (d) => d.barcode || `name:${searchFold(d.Product_Name || '')}`;
const oldByKey = new Map(oldDrugs.map((d) => [keyOf(d), d]));
const newByKey = new Map(newDrugs.map((d) => [keyOf(d), d]));

const added = [];
const removed = [];
const changed = [];
for (const [key, nd] of newByKey) {
  const od = oldByKey.get(key);
  if (!od) {
    added.push(nd);
    continue;
  }
  const deltas = [];
  if ((od.Active_Ingredient || '') !== (nd.Active_Ingredient || '')) deltas.push('etken madde');
  if ((od.ATC_code || '') !== (nd.ATC_code || '')) deltas.push('ATC');
  const oldHasDesc = (od.Description || '').trim().length >= 50;
  const newHasDesc = (nd.Description || '').trim().length >= 50;
  if (oldHasDesc !== newHasDesc) deltas.push(newHasDesc ? 'prospektüs eklendi' : 'prospektüs kayboldu');
  if (deltas.length > 0) changed.push({ name: nd.Product_Name, deltas });
}
for (const [key, od] of oldByKey) {
  if (!newByKey.has(key)) removed.push(od);
}

console.log('=== DİFF RAPORU ===');
console.log(`Eklenen ürün   : ${added.length}`);
for (const d of added.slice(0, 15)) console.log(`  + ${d.Product_Name}`);
if (added.length > 15) console.log(`  ... ve ${added.length - 15} tane daha`);
console.log(`Çıkan ürün     : ${removed.length}`);
for (const d of removed.slice(0, 15)) console.log(`  - ${d.Product_Name}`);
if (removed.length > 15) console.log(`  ... ve ${removed.length - 15} tane daha`);
console.log(`Değişen ürün   : ${changed.length}`);
for (const c of changed.slice(0, 15)) console.log(`  ~ ${c.name} (${c.deltas.join(', ')})`);
if (changed.length > 15) console.log(`  ... ve ${changed.length - 15} tane daha`);

// ---- 3) Kural-kapsam deltası ----
const rules = JSON.parse(readFileSync(join(ROOT, 'data', 'interactions.json'), 'utf-8'));
const synonyms = JSON.parse(readFileSync(join(ROOT, 'data', 'ingredient-synonyms.json'), 'utf-8'));
const oldCov = computeCoverage(oldDrugs, rules, synonyms);
const newCov = computeCoverage(newDrugs, rules, synonyms);
console.log('\n=== KURAL KAPSAMI ===');
console.log(`Mevcut: %${oldCov.coveragePct.toFixed(1)} → Yeni: %${newCov.coveragePct.toFixed(1)}`);
const newlyUnmatched = [...newCov.unmatchedSides.keys()].filter((k) => !oldCov.unmatchedSides.has(k));
if (newlyUnmatched.length > 0) {
  console.log(`Yeni veriyle EŞLEŞMEYİ KAYBEDEN kural tarafları: ${newlyUnmatched.join(', ')}`);
  console.log('→ Yazım değiştiyse data/ingredient-synonyms.json güncellenmeli.');
}
if (newCov.coveragePct < minCoverage) {
  console.error(`\nKAPI BAŞARISIZ: yeni kapsam %${newCov.coveragePct.toFixed(1)} < eşik %${minCoverage}. --apply reddedildi.`);
  process.exit(1);
}

// ---- 4) Uygulama ----
if (!apply) {
  console.log('\nRapor tamam. Uygulamak için raporu inceledikten sonra --apply ile yeniden çalıştırın.');
  process.exit(0);
}

const backup = `${CURRENT}.onceki`;
copyFileSync(CURRENT, backup);
writeFileSync(CURRENT, readFileSync(file));
console.log(`\nVeri seti değiştirildi (yedek: ${backup}). build-data + smoke-test çalışıyor...`);
execSync('node scripts/build-data.mjs', { cwd: ROOT, stdio: 'inherit' });
execSync('node scripts/smoke-test.mjs', { cwd: ROOT, stdio: 'inherit' });
console.log('\nAlım tamamlandı. Değişiklikleri dalda commit edip PR açın; CI yeşilse yayınlayın.');
