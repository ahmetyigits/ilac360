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
  searchFold,
  isValidIngredient,
  isValidDescription,
  cleanCategories,
  extractUsageSection,
  flexibleIncludes,
} from '../client/src/data/turkishText.js';
import { BUCKET_COUNT, bucketOf } from '../client/src/data/buckets.js';
import { getComponents, buildSynonymLookup } from '../client/src/data/ingredientMatcher.js';
import { detectForm } from '../client/src/data/formDetect.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'data');
const OUT = join(ROOT, 'client', 'public', 'data');

const raw = JSON.parse(readFileSync(join(SRC, 'ilaclar-dataset.json'), 'utf-8'));
const drugs = raw[2].data;

// Manuel kürasyon ön-geçişi: kaynak veride etken maddesi VE ATC'si olmayan
// ürünler (soğuk algılığı kombinasyonları, LOXIBIN vb.) her sorguda sessizce
// "bilinmiyor"a düşer. Bu küçük dosya barkod anahtarıyla yalnız BOŞ/GEÇERSİZ
// alanları doldurur; kaynak alanı zorunludur. Backfill haritalarından ÖNCE
// uygulanır ki türetmeler de bu kayıtlardan beslensin.
let manualIngredientCount = 0;
try {
  const manual = JSON.parse(readFileSync(join(SRC, 'manual-ingredients.json'), 'utf-8'));
  const byBarcodeManual = new Map();
  for (const m of manual) {
    if (!m.source || !String(m.source).trim()) {
      console.error(`manual-ingredients: source zorunlu (${m.barcode} ${m.name || ''})`);
      process.exit(1);
    }
    byBarcodeManual.set(String(m.barcode).trim(), m);
  }
  for (const d of drugs) {
    const m = byBarcodeManual.get(String(d.barcode || '').trim());
    if (!m) continue;
    if (m.ingredient && !isValidIngredient(d.Active_Ingredient)) {
      d.Active_Ingredient = m.ingredient;
      manualIngredientCount++;
    }
    if (m.atc && (!d.ATC_code || d.ATC_code === '0')) {
      d.ATC_code = m.atc;
    }
  }
} catch (err) {
  if (err.code !== 'ENOENT') throw err; // dosya yoksa sessiz geç, bozuksa DUR
}

// Enteral/oral beslenme (FSMP) ürünleri — yanlış ilaç etken maddesi temizliği.
// WHO ATC V06 = "genel besinler" (enteral/oral beslenme, özel tıbbi amaçlı gıda).
// Kaynak veride bu ürünlerin Active_Ingredient alanına rastgele/alakasız ilaç
// adları sızmış (ör. ENSURE → "Teikoplanin", NUTRISON → "Levetirasetam"). Bunlar
// ilaç değildir; yanlış etken madde hem sahte eşdeğer grupları hem sahte etkileşim
// üretir (ürün, o ilacın sınıfı gibi işlem görür). V06* ürünlerinin ilaç etken
// maddesini nötrle → placeholder, isValidIngredient=false, componentKey null.
// Çıkarım haritalarından ÖNCE çalışır ki yanlış "madde→ATC" oyları da düşsün.
const NON_DRUG_ATC_PREFIXES = ['V06'];
const NEUTRAL_INGREDIENT = 'Etken maddesi bilgisi bulunamadı.';
let nutritionNeutralizedCount = 0;
for (const d of drugs) {
  const atc = (d.ATC_code || '').trim();
  if (NON_DRUG_ATC_PREFIXES.some((p) => atc.startsWith(p)) && isValidIngredient(d.Active_Ingredient)) {
    d.Active_Ingredient = NEUTRAL_INGREDIENT;
    nutritionNeutralizedCount++;
  }
}

// TİTCK KT ekleri (scripts/titck-sync.mjs + titck-merge-desc.mjs üretir):
// metinler TEKİL saklanır (titck-kt-texts.json, LFS), ürün eşlemesi barkod/ad
// anahtarlıdır (titck-kt-map.json). Kendi Description'ı olmayan ürünlere build
// sırasında bağlanır — kaynak veri seti şişirilmez.
let titckTexts = {};
let titckMap = {};
try {
  titckTexts = JSON.parse(readFileSync(join(SRC, 'titck-kt-texts.json'), 'utf-8'));
  titckMap = JSON.parse(readFileSync(join(SRC, 'titck-kt-map.json'), 'utf-8'));
} catch {
  // opsiyonel: dosyalar yoksa yalnız veri setindeki Description kullanılır
}
const titckKeyOf = (d) => d.barcode && String(d.barcode).trim()
  ? `b:${String(d.barcode).trim()}`
  : `n:${searchFold(d.Product_Name || '')}`;
let titckDescCount = 0;

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

// Ters yön: ATC → en sık görülen etken madde. 7 karakterlik tam ATC kodu
// maddeyi birebir tanımlar (N02BA01 = asetilsalisilik asit); etken maddesi
// eksik ~800 kayıt bu haritayla dolduruluyor.
const ingredientCountsByAtc = new Map();
for (const d of drugs) {
  if (!isValidIngredient(d.Active_Ingredient)) continue;
  if (!d.ATC_code || d.ATC_code === '0' || d.ATC_code.trim().length < 7) continue;
  const atc = d.ATC_code.trim();
  const ing = d.Active_Ingredient.trim();
  let counts = ingredientCountsByAtc.get(atc);
  if (!counts) {
    counts = new Map();
    ingredientCountsByAtc.set(atc, counts);
  }
  counts.set(ing, (counts.get(ing) || 0) + 1);
}
const atcToIngredient = new Map();
for (const [atc, counts] of ingredientCountsByAtc) {
  let best = null, bestCount = -1;
  for (const [ing, count] of counts) {
    if (count > bestCount) { best = ing; bestCount = count; }
  }
  if (best) atcToIngredient.set(atc, best);
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
let ingredientBackfilled = 0;
let descriptionCount = 0;

for (const d of drugs) {
  let ingredient = isValidIngredient(d.Active_Ingredient) ? d.Active_Ingredient.trim() : null;
  let atc = d.ATC_code && d.ATC_code !== '0' ? d.ATC_code.trim() : null;
  if (!atc && ingredient) {
    const inferred = ingredientToAtc.get(turkishLower(ingredient));
    if (inferred) {
      atc = inferred;
      atcBackfilled++;
    }
  }
  if (!ingredient && atc) {
    const inferred = atcToIngredient.get(atc);
    if (inferred) {
      ingredient = inferred;
      ingredientBackfilled++;
    }
  }
  let desc = isValidDescription(d.Description) ? d.Description.trim() : null;
  if (!desc) {
    const pdfKey = titckMap[titckKeyOf(d)];
    if (pdfKey && titckTexts[pdfKey]) {
      desc = titckTexts[pdfKey];
      titckDescCount++;
    }
  }
  const id = String(d.ID);

  index.push({
    i: id,
    n: d.Product_Name,
    a: ingredient,
    t: atc,
    b: d.barcode || null,
    c: cleanCategories(d),
    h: !!desc,
    // Farmasötik form ('topikal'/'oftalmik'/...) — motor sistemik uyarıları
    // düşük emilimli formlarda bastırmak için kullanır.
    f: detectForm(searchFold(d.Product_Name), atc),
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

// Kanonik bileşen → en sık ATC kodu. Motor bunu, kendi ATC'si sınıf haritasına
// düşmeyen kombinasyon ürünlerinde (ör. flurbiprofen+tiyokolşikosid → M03BX55)
// bileşenlerin gerçek sınıflarını (flurbiprofen → M01AE09 → NSAID) türetmek
// için kullanır.
const synonymLookup = buildSynonymLookup(synonyms);
// MONO-TERCİH: bileşenin TEK başına olduğu ürünlerdeki ATC, kombinasyon-baskın
// yanlış eşlemeyi önler. Örn. psödoefedrin çoğunlukla ibuprofen kombosunda
// (M01AE51) satılır; genel çoğunluk onu sahte NSAID yapıyordu — mono ürünlerin
// ATC'si (R01BA02) gerçek sınıfıdır.
const atcCountsByComponent = new Map();
for (const d of drugs) {
  if (!d.ATC_code || d.ATC_code === '0' || d.ATC_code.trim().length < 7) continue;
  const atc = d.ATC_code.trim();
  const comps = getComponents(d.Active_Ingredient, synonymLookup);
  const isMono = comps.length === 1;
  for (const comp of comps) {
    let counts = atcCountsByComponent.get(comp);
    if (!counts) {
      counts = new Map();
      atcCountsByComponent.set(comp, counts);
    }
    const c = counts.get(atc) || { n: 0, mono: 0 };
    c.n += 1;
    if (isMono) c.mono += 1;
    counts.set(atc, c);
  }
}
const componentAtc = {};
for (const [comp, counts] of atcCountsByComponent) {
  let best = null, bestMono = 0, bestN = -1;
  for (const [atc, { n, mono }] of counts) {
    // Önce mono çoğunluğu; hiç mono ürün yoksa genel çoğunluk.
    if (mono > bestMono || (mono === bestMono && n > bestN)) {
      best = atc; bestMono = mono; bestN = n;
    }
  }
  if (best) componentAtc[comp] = best;
}

// Elle geçersiz kılma: mono-tercih bile yanlış kalıyorsa (ör. eritromisinin
// mono ürünleri topikal D10AF02 baskın — makrolid kuralları için J01FA01
// gerekir). Kaynak alanı ZORUNLU; eksikse build durur.
let componentAtcOverrides = {};
try {
  componentAtcOverrides = JSON.parse(readFileSync(join(SRC, 'component-atc-overrides.json'), 'utf-8'));
} catch {
  // opsiyonel dosya
}
const ATC_RE = /^[A-Z]\d{2}[A-Z]{1,2}(\d{2})?$/;
let overrideCount = 0;
for (const [comp, o] of Object.entries(componentAtcOverrides)) {
  if (comp === 'note') continue;
  if (!o.atc || !ATC_RE.test(o.atc)) {
    console.error(`component-atc-overrides: geçersiz ATC '${o.atc}' (${comp})`);
    process.exit(1);
  }
  if (!o.source || !String(o.source).trim()) {
    console.error(`component-atc-overrides: source zorunlu (${comp})`);
    process.exit(1);
  }
  componentAtc[comp] = o.atc;
  overrideCount++;
}

// --- Takviye edici gıda enjeksiyonu ---
// Katalog kayıtları doğrudan INDEX'e eklenir (kaynak diziye değil: backfill/
// dupe geçişleri sentetik kayıtları görmemeli). Arama/sepet/motor/uyarılar
// bileşen tabanlı olduğundan otomatik çalışır. ID bloğu 9000001+ rakamsaldır —
// ?drug=/?d= paylaşım filtreleri (/^\d+$/) sentetik string ID'leri elerdi.
let supplementCount = 0;
try {
  const suppFile = JSON.parse(readFileSync(join(SRC, 'supplement-products.json'), 'utf-8'));
  const maxDatasetId = Math.max(...drugs.map((d) => Number(d.ID) || 0));
  if (maxDatasetId >= 9000001) {
    console.error(`supplement-products: dataset ID'leri 9000001 bloğuna taşmış (max ${maxDatasetId}) — id bloğunu kaydırın.`);
    process.exit(1);
  }
  for (const s of suppFile.products || []) {
    for (const field of ['id', 'name', 'ingredients', 'source', 'accessed']) {
      if (!s[field] || String(s[field]).trim() === '') {
        console.error(`supplement-products: zorunlu alan eksik: ${field} (${s.name || s.id})`);
        process.exit(1);
      }
    }
    if (!(Number(s.id) >= 9000001)) {
      console.error(`supplement-products: id 9000001+ rakamsal blokta olmalı (${s.id})`);
      process.exit(1);
    }
    index.push({
      i: String(s.id),
      n: s.name,
      a: s.ingredients,
      t: null,
      b: null,
      c: ['Takviye Edici Gıda', s.category].filter(Boolean),
      h: false,
      f: 'sistemik',
      s: true,
      sb: s.brand || null,
      ss: s.source,
      st: s.tobApproval || null,
    });
    supplementCount++;
  }
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
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
emit('component-atc.json', componentAtc);
let adjuvants = { adjuvants: [] };
try {
  adjuvants = JSON.parse(readFileSync(join(SRC, 'adjuvant-components.json'), 'utf-8'));
} catch {
  console.warn('adjuvant-components.json bulunamadı; adjuvan listesi boş.');
}
emit('adjuvant-components.json', adjuvants);
let componentClasses = { components: {} };
try {
  componentClasses = JSON.parse(readFileSync(join(SRC, 'component-classes.json'), 'utf-8'));
} catch {
  console.warn('component-classes.json bulunamadı; sınıf etiketleri boş.');
}
emit('component-classes.json', componentClasses);
// Tekil ilaç statik uyarıları (alerji/besin/gebelik/araç/yaş) — İlaç Detayı paneli
let drugWarnings = [];
try {
  drugWarnings = JSON.parse(readFileSync(join(SRC, 'drug-warnings.json'), 'utf-8'));
} catch {
  console.warn('drug-warnings.json bulunamadı; tekil ilaç uyarıları boş.');
}
emit('drug-warnings.json', drugWarnings);
// Besin/içecek katalogu — İlaç-Besin etkileşim sorgusu (FoodPicker çipleri)
let foodItemsData = [];
try {
  foodItemsData = JSON.parse(readFileSync(join(SRC, 'food-items.json'), 'utf-8'));
} catch {
  console.warn('food-items.json bulunamadı; besin sorgusu devre dışı.');
}
emit('food-items.json', foodItemsData);

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  // İnsan-okur veri sürümü: git tag (data-YYYY-MM) ve runbook ile hizalı
  dataVersion: new Date().toISOString().slice(0, 7),
  bucketCount: BUCKET_COUNT,
  drugCount: index.length,
  supplementCount,
  descriptionCount,
  usageSectionCount: Object.keys(usageSections).length,
  interactionRuleCount: interactions.length,
  warningRuleCount: drugWarnings.length,
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

console.log('drugs-index             ', mb(join(OUT, manifestFiles['drugs-index.json'])), `(${index.length} drugs, ATC backfilled: ${atcBackfilled}, ingredient backfilled: ${ingredientBackfilled}, manuel kürasyon: ${manualIngredientCount}, beslenme nötrlendi: ${nutritionNeutralizedCount})`);
console.log('component-atc           ', kb(join(OUT, manifestFiles['component-atc.json'])), `(${Object.keys(componentAtc).length} components, ${overrideCount} override)`);
console.log('takviye kataloğu        ', `${supplementCount} kayıt (index'e enjekte edildi)`);
console.log('desc buckets            ', `${BUCKET_COUNT} adet, toplam ${(totalBucket / 1024 / 1024).toFixed(2)} MB, en büyük ${(maxBucket / 1024).toFixed(0)} KB (${descriptionCount} descriptions, ${titckDescCount} tanesi TİTCK KT)`);
console.log('usage-sections          ', kb(join(OUT, manifestFiles['usage-sections.json'])), `(${Object.keys(usageSections).length} entries)`);
console.log('condition-desc-matches  ', kb(join(OUT, manifestFiles['condition-desc-matches.json'])), `(${conditions.length} conditions)`);
console.log('interactions            ', kb(join(OUT, manifestFiles['interactions.json'])), `(${interactions.length} rules)`);
console.log('drug-warnings           ', kb(join(OUT, manifestFiles['drug-warnings.json'])), `(${drugWarnings.length} warnings)`);
console.log('condition-mapping       ', kb(join(OUT, manifestFiles['condition-mapping.json'])), `(${conditions.length} conditions)`);
if (dupBarcodes.length || dupNames.length) {
  console.log(`UYARI: kaynak veride ${dupBarcodes.length} yinelenen barkod grubu, ${dupNames.length} yinelenen ürün adı grubu var (otomatik silinmedi).`);
}
