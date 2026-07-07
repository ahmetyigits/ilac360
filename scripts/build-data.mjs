// Kaynak veriyi (/data) okuyup /client/public/data altına istemcinin kullandığı
// içerik-hash'li JSON dosyalarını üretir:
//   - manifest.json                    mantıksal ad → hash'li dosya adı + sürüm damgası (hash'siz tek dosya)
//   - drugs-index.<hash>.json          kısaltılmış kayıtlar (id, ad, etken madde, atc, barkod, kategoriler, h)
//   - drugs-desc-NN.<hash>.json        64 hash-bucket: id → prospektüs metni (kart açılınca tek bucket iner)
//   - usage-sections.<hash>.json       id → "ne için kullanılır" bölümü (fallback araması için, ~%2'lik boyut)
//   - condition-desc-matches.<hash>.json  durum id → prospektüs eşleşmeleri (build'de önceden hesaplanır)
//   - interactions.<hash>.json         etkileşim kuralları
//   - condition-mapping.<hash>.json    durum eşleme tablosu
//   - ingredient-synonyms.<hash>.json  etken madde sinonimleri
//
// Normalizasyon istemciyle AYNI modülden gelir (client/src/data/turkishText.js);
// build ile runtime'ın farklı lowercase davranışı kullanması veri hatası üretir.

import { readFileSync, writeFileSync, statSync, readdirSync, unlinkSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  turkishLower,
  isValidIngredient,
  isValidDescription,
  cleanCategories,
  extractUsageSection,
  flexibleIncludes,
} from '../client/src/data/turkishText.js';
import { BUCKET_COUNT, bucketOf } from '../client/src/data/buckets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'data');
const OUT = join(ROOT, 'client', 'public', 'data');

const raw = JSON.parse(readFileSync(join(SRC, 'ilaclar-dataset.json'), 'utf-8'));
const drugs = raw[2].data;

// 1. geçiş: etkin madde → en sık görülen ATC kodu eşlemesini kur.
// Kaynak veride 4940 ilaçta ATC eksik; çoğunda etkin madde dolu ve aynı etkin
// maddenin ATC'si başka kayıtlarda biliniyor. 2. geçişte bu eksikleri dolduruyoruz.
const atcCountsByIngredient = new Map();
for (const d of drugs) {
  if (!isValidIngredient(d.Active_Ingredient)) continue;
  if (!d.ATC_code || d.ATC_code === '0') continue;
  const key = turkishLower(d.Active_Ingredient.trim());
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

// Yinelenen kayıt raporu (otomatik silinmez; kaynak veri QA'sı için loglanır)
const byBarcode = new Map();
const byName = new Map();
for (const d of drugs) {
  if (d.barcode) byBarcode.set(d.barcode, (byBarcode.get(d.barcode) || 0) + 1);
  if (d.Product_Name) byName.set(d.Product_Name, (byName.get(d.Product_Name) || 0) + 1);
}
const dupBarcodes = [...byBarcode.entries()].filter(([, c]) => c > 1);
const dupNames = [...byName.entries()].filter(([, c]) => c > 1);

const index = [];
const buckets = Array.from({ length: BUCKET_COUNT }, () => ({}));
const usageSections = {};
let atcBackfilled = 0;
let descriptionCount = 0;

for (const d of drugs) {
  const ingredient = isValidIngredient(d.Active_Ingredient) ? d.Active_Ingredient.trim() : null;
  let atc = d.ATC_code && d.ATC_code !== '0' ? d.ATC_code.trim() : null;
  if (!atc && ingredient) {
    const inferred = ingredientToAtc.get(turkishLower(ingredient));
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

  if (desc) {
    buckets[bucketOf(id)][id] = desc;
    descriptionCount++;
    const usage = extractUsageSection(desc);
    if (usage) usageSections[id] = usage;
  }
}

// Durum → prospektüs eşleşmeleri build'de hesaplanır; istemci hiçbir durumda
// tam prospektüs setini indirmek zorunda kalmaz.
const conditions = JSON.parse(readFileSync(join(SRC, 'condition-mapping.json'), 'utf-8'));
const descById = new Map();
for (const bucket of buckets) {
  for (const [id, desc] of Object.entries(bucket)) descById.set(id, desc);
}
const conditionDescMatches = {};
for (const condition of conditions) {
  const usage = {};
  const full = {};
  for (const [id, desc] of descById) {
    const usageSection = usageSections[id];
    let matched = false;
    if (usageSection) {
      for (const keyword of condition.keywords || []) {
        if (flexibleIncludes(usageSection, keyword)) {
          usage[id] = keyword;
          matched = true;
          break;
        }
      }
    }
    if (!matched && desc.length > 50) {
      for (const keyword of condition.keywords || []) {
        if (keyword.length < 4) continue;
        if (flexibleIncludes(desc, keyword)) {
          full[id] = keyword;
          break;
        }
      }
    }
  }
  conditionDescMatches[condition.id] = { usage, full };
}

const interactions = JSON.parse(readFileSync(join(SRC, 'interactions.json'), 'utf-8'));
let synonyms = {};
try {
  synonyms = JSON.parse(readFileSync(join(SRC, 'ingredient-synonyms.json'), 'utf-8'));
} catch {
  console.warn('ingredient-synonyms.json bulunamadı; sinonimler boş bırakıldı.');
}

// --- İçerik-hash'li yazım + manifest ---
mkdirSync(OUT, { recursive: true });

// Önceki üretimden kalan dosyaları temizle (hash değişince eskiler birikmesin)
for (const f of readdirSync(OUT)) {
  if (f.endsWith('.json')) unlinkSync(join(OUT, f));
}

const manifestFiles = {};
function emit(logicalName, data) {
  const json = JSON.stringify(data);
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 8);
  const hashedName = logicalName.replace(/\.json$/, `.${hash}.json`);
  writeFileSync(join(OUT, hashedName), json);
  manifestFiles[logicalName] = hashedName;
  return hashedName;
}

emit('drugs-index.json', index);
for (let b = 0; b < BUCKET_COUNT; b++) {
  emit(`drugs-desc-${String(b).padStart(2, '0')}.json`, buckets[b]);
}
emit('usage-sections.json', usageSections);
emit('condition-desc-matches.json', conditionDescMatches);
emit('interactions.json', interactions);
emit('condition-mapping.json', conditions);
emit('ingredient-synonyms.json', synonyms);

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  bucketCount: BUCKET_COUNT,
  drugCount: index.length,
  descriptionCount,
  usageSectionCount: Object.keys(usageSections).length,
  interactionRuleCount: interactions.length,
  conditionCount: conditions.length,
  files: manifestFiles,
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

// --- Rapor ---
const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(2) + ' MB';
const kb = (p) => (statSync(p).size / 1024).toFixed(1) + ' KB';
const bucketSizes = manifestFiles && Object.entries(manifestFiles)
  .filter(([k]) => k.startsWith('drugs-desc-'))
  .map(([, v]) => statSync(join(OUT, v)).size);
const maxBucket = Math.max(...bucketSizes);
const totalBucket = bucketSizes.reduce((a, b) => a + b, 0);

console.log('drugs-index             ', mb(join(OUT, manifestFiles['drugs-index.json'])), `(${index.length} drugs, ATC backfilled: ${atcBackfilled})`);
console.log('desc buckets            ', `${BUCKET_COUNT} adet, toplam ${(totalBucket / 1024 / 1024).toFixed(2)} MB, en büyük ${(maxBucket / 1024).toFixed(0)} KB (${descriptionCount} descriptions)`);
console.log('usage-sections          ', kb(join(OUT, manifestFiles['usage-sections.json'])), `(${Object.keys(usageSections).length} entries)`);
console.log('condition-desc-matches  ', kb(join(OUT, manifestFiles['condition-desc-matches.json'])), `(${conditions.length} conditions)`);
console.log('interactions            ', kb(join(OUT, manifestFiles['interactions.json'])), `(${interactions.length} rules)`);
console.log('condition-mapping       ', kb(join(OUT, manifestFiles['condition-mapping.json'])), `(${conditions.length} conditions)`);
if (dupBarcodes.length || dupNames.length) {
  console.log(`UYARI: kaynak veride ${dupBarcodes.length} yinelenen barkod grubu, ${dupNames.length} yinelenen ürün adı grubu var (otomatik silinmedi).`);
}
