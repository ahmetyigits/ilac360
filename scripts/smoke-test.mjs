// Hafif Node smoke testi: üretilen public JSON dosyalarını tarayıcının
// kullanacağı şekilde (manifest üzerinden) yükler, arama ve veri bütünlüğünü
// spot-check eder. Başarısızlıkta sıfır olmayan çıkış koduyla biter (CI için).

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { turkishLower, flexibleIncludes, searchFold } from '../client/src/data/turkishText.js';
import { bucketOf } from '../client/src/data/buckets.js';
import { compileWarnings, matchWarnings } from '../client/src/data/warningMatcher.js';
import { buildSynonymLookup } from '../client/src/data/ingredientMatcher.js';
import { detectForm } from '../client/src/data/formDetect.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'client', 'public', 'data');

let failures = 0;
function assert(cond, label) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}`);
  }
}

// Manifest
const manifest = JSON.parse(readFileSync(join(DATA, 'manifest.json'), 'utf-8'));
console.log(`manifest: v${manifest.version}, üretim: ${manifest.generatedAt}`);
assert(manifest.files && Object.keys(manifest.files).length > 5, 'manifest dosya listesi dolu');
assert(manifest.drugCount > 20000, `ilaç sayısı > 20000 (${manifest.drugCount})`);
assert(manifest.usageSectionCount > 2700, `kullanım bölümü sayısı > 2700 (${manifest.usageSectionCount})`);

const file = (logical) => join(DATA, manifest.files[logical]);
for (const [logical, hashed] of Object.entries(manifest.files)) {
  if (!existsSync(join(DATA, hashed))) {
    failures++;
    console.error(`  ✗ manifest'te listelenen dosya eksik: ${logical} → ${hashed}`);
  }
}

const t0 = Date.now();
const index = JSON.parse(readFileSync(file('drugs-index.json'), 'utf-8'));
console.log(`drugs-index        : ${index.length} entries, ${Date.now() - t0}ms`);
assert(index.length === manifest.drugCount, 'index kaydı manifest ile tutarlı');

const interactions = JSON.parse(readFileSync(file('interactions.json'), 'utf-8'));
assert(interactions.length >= 30, `etkileşim kuralı >= 30 (${interactions.length})`);
assert(interactions.every((r) => r.ingredientA && r.ingredientB && r.risk && r.message), 'tüm kurallarda zorunlu alanlar var');

const conditions = JSON.parse(readFileSync(file('condition-mapping.json'), 'utf-8'));
assert(conditions.length >= 90, `durum sayısı >= 90 (${conditions.length})`);

// Bucket bütünlüğü: prospektüsü olan bir ilaç kendi bucket'ında bulunmalı
const withDesc = index.find((e) => e.h);
assert(!!withDesc, 'prospektüslü en az bir ilaç var');
if (withDesc) {
  const b = String(bucketOf(withDesc.i)).padStart(2, '0');
  const bucket = JSON.parse(readFileSync(file(`drugs-desc-${b}.json`), 'utf-8'));
  assert(typeof bucket[withDesc.i] === 'string' && bucket[withDesc.i].length > 50,
    `ilaç ${withDesc.i} kendi bucket'ında (${b}) bulundu`);
}

// Kullanım bölümleri
const usage = JSON.parse(readFileSync(file('usage-sections.json'), 'utf-8'));
assert(Object.keys(usage).length === manifest.usageSectionCount, 'usage-sections manifest ile tutarlı');

// Durum eşleşmeleri
const descMatches = JSON.parse(readFileSync(file('condition-desc-matches.json'), 'utf-8'));
assert(Object.keys(descMatches).length === conditions.length, 'condition-desc-matches tüm durumları kapsıyor');

// Arama spot-check
const matches = [];
for (const e of index) {
  if (flexibleIncludes(e.n, 'parol')) matches.push(e);
  if (matches.length >= 5) break;
}
assert(matches.length > 0, `"parol" araması sonuç veriyor (${matches.length})`);
for (const m of matches) console.log(`    - ${m.n}  [${m.a || '?'}]  atc=${m.t || '-'}`);

const parol = index.find((e) => turkishLower(e.n).startsWith('parol'));
// "ASPIRIN" kaynakta Latin büyük I ile yazılı; uygulamadaki arama gibi
// ı/i katlaması yapan flexibleIncludes ile bakılır (searchFold regresyon testi).
const aspirin = index.find((e) => flexibleIncludes(e.n, 'aspirin'));
assert(!!parol, `PAROL bulundu: ${parol?.n}`);
assert(!!aspirin, `ASPIRIN bulundu: ${aspirin?.n}`);

// Kategori tekilleştirme regresyonu
const dupCats = index.filter((e) => e.c && new Set(e.c).size !== e.c.length);
assert(dupCats.length === 0, `hiçbir kayıtta yinelenen kategori yok (${dupCats.length})`);

const mig = conditions.find((c) => c.id === 'bas-agrisi');
assert((mig?.ingredients?.length || 0) > 0, `bas-agrisi durumunda ${mig?.ingredients?.length} etken madde var`);

// Tekil ilaç uyarıları: manifest + motorla birebir aynı eşleşme hattıyla spot-check
assert(!!manifest.files['drug-warnings.json'], "manifest'te drug-warnings.json var");
assert(manifest.warningRuleCount >= 50, `uyarı kaydı >= 50 (${manifest.warningRuleCount})`);
const drugWarnings = JSON.parse(readFileSync(file('drug-warnings.json'), 'utf-8'));
assert(drugWarnings.length === manifest.warningRuleCount, 'drug-warnings manifest ile tutarlı');
const warnSynonyms = JSON.parse(readFileSync(file('ingredient-synonyms.json'), 'utf-8'));
const warnLookup = buildSynonymLookup(warnSynonyms);
const warnCompiled = compileWarnings(drugWarnings, warnLookup);
const warningsFor = (entry) => matchWarnings(warnCompiled, {
  activeIngredient: entry.a,
  atcCode: entry.t,
  form: entry.f ?? detectForm(searchFold(entry.n), entry.t),
}, warnLookup);

const j01c = index.find((e) => e.t && e.t.startsWith('J01C'));
assert(!!j01c && warningsFor(j01c).some((w) => w.type === 'allergy'),
  `J01C ürünü penisilin alerji uyarısı alıyor (${j01c?.n})`);
const warfarinEntry = index.find((e) => e.a && flexibleIncludes(e.a, 'varfarin') || e.a && flexibleIncludes(e.a, 'warfarin'));
assert(!!warfarinEntry && warningsFor(warfarinEntry).some((w) => w.type === 'food'),
  `warfarin ürünü besin (K vitamini) uyarısı alıyor (${warfarinEntry?.n})`);
const topikal = index.find((e) => e.f === 'topikal' && e.t && e.t.startsWith('M02AA'));
if (topikal) {
  // Topikale özgü kayıtlar (W-0222 NSAİİ alerji, systemicOnly=false) görünebilir;
  // sistemik uyarılar (araç/besin, M01A sınıf alerjisi W-0004) görünmemeli.
  const wl = warningsFor(topikal);
  assert(!wl.some((w) => w.type === 'driving' || w.type === 'food' || w.id === 'W-0004'),
    `topikal ürün sistemik uyarı ALMIYOR (${topikal.n})`);
}

if (failures > 0) {
  console.error(`\nSMOKE TEST BAŞARISIZ: ${failures} kontrol geçemedi.`);
  process.exit(1);
}
console.log('\nSmoke test geçti.');
