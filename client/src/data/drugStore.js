import {
  turkishLower,
  searchFold,
  flexibleIncludes,
  flexibleEquals,
  isValidIngredient,
  cleanCategories,
} from './turkishText.js';

import { bucketOf } from './buckets.js';

// Eski import yolları bozulmasın diye yeniden dışa aktarılır.
export { turkishLower, searchFold, flexibleIncludes, flexibleEquals, isValidIngredient, cleanCategories };

const DATA_BASE = `${import.meta.env.BASE_URL || '/'}data`.replace(/\/+$/, '');

let drugs = [];
let drugsById = new Map();
let drugsByNameLower = new Map();
let cachedStats = null;
let loadPromise = null;

// Veri dosyaları içerik-hash'li adlarla yayınlanır (uzun süreli CDN cache için);
// mantıksal ad → gerçek dosya adı çözümü manifest üzerinden yapılır.
let manifestPromise = null;

export function loadManifest() {
  if (manifestPromise) return manifestPromise;
  manifestPromise = fetch(`${DATA_BASE}/manifest.json`, { cache: 'no-cache' })
    .then((r) => {
      if (r.ok) return r.json();
      if (r.status === 404) return null; // manifest'siz eski dağıtım: hash'siz adlara düş (kalıcı)
      // Sunucu hatası geçici olabilir: cache'leme, sonraki çağrı yeniden denesin.
      manifestPromise = null;
      return null;
    })
    .catch(() => {
      // Ağ hatası geçicidir: null'u KALICI cache'lemek uygulamayı sayfa
      // yenilenene dek kilitler (hash'li dosyalar 404 verir). Sıfırla.
      manifestPromise = null;
      return null;
    });
  return manifestPromise;
}

// Manifest yoksa (eski dağıtım / dev ortamı) hash'siz ada geri düşer.
export async function dataUrl(logicalName) {
  const manifest = await loadManifest();
  const name = manifest?.files?.[logicalName] || logicalName;
  return `${DATA_BASE}/${name}`;
}

// drugs-index.json kısaltılmış alan adlarını kullanıyor (5+ MB tasarrufu için).
// Tüketici bileşenler hâlâ orijinal alan adlarını bekliyor → genişletip döndür.
function expand(entry) {
  const cats = entry.c || [];
  return {
    ID: entry.i,
    Product_Name: entry.n,
    Active_Ingredient: entry.a || '',
    ATC_code: entry.t || '0',
    barcode: entry.b || null,
    Category_1: cats[0] || '',
    Category_2: cats[1] || '',
    Category_3: cats[2] || '',
    Category_4: cats[3] || '',
    Category_5: cats[4] || '',
    Form: entry.f || null,
    _hasDescription: !!entry.h,
    // Takviye edici gıda alanları (build enjeksiyonu; ilaç kayıtlarında yok)
    isSupplement: !!entry.s,
    supplementBrand: entry.sb || null,
    supplementSource: entry.ss || null,
    supplementApproval: entry.st || null,
  };
}

export function loadDrugs() {
  if (loadPromise) return loadPromise;
  loadPromise = dataUrl('drugs-index.json')
    .then((url) => fetch(url))
    .then((r) => {
      if (!r.ok) throw new Error(`drugs-index.json ${r.status}`);
      return r.json();
    })
    .then((entries) => {
      drugs = entries.map(expand);
      drugsById = new Map();
      drugsByNameLower = new Map();
      for (const d of drugs) {
        // Arama alanları bir kez normalize edilir; searchDrugs her tuş vuruşunda
        // 20 bin kayıt × regex çalıştırmak yerine düz string karşılaştırması yapar.
        d._nameL = searchFold(d.Product_Name);
        d._ingL = d.Active_Ingredient ? searchFold(d.Active_Ingredient) : '';
        // Hastalık aramasının kategori katmanı için fold edilmiş kategoriler
        d._catsL = [d.Category_1, d.Category_2, d.Category_3, d.Category_4, d.Category_5]
          .filter((c) => c && c.trim())
          .map((c) => searchFold(c));
        drugsById.set(d.ID, d);
        drugsByNameLower.set(d._nameL, d);
      }
      cachedStats = computeStats();
      return drugs;
    })
    .catch((err) => {
      // Geçici hata memoize edilmesin; "Tekrar dene" gerçekten yeniden denesin.
      loadPromise = null;
      throw err;
    });
  return loadPromise;
}

export function getDrugs() {
  return drugs;
}

// Test kancası: fetch olmadan ilaç listesi enjekte etmek için.
// Kayıtlar genişletilmiş şemada verilir (Product_Name, Active_Ingredient, ...).
export function setDrugsForTest(entries) {
  drugs = entries.map((d) => ({ ...d }));
  drugsById = new Map();
  drugsByNameLower = new Map();
  for (const d of drugs) {
    d._nameL = searchFold(d.Product_Name);
    d._ingL = d.Active_Ingredient ? searchFold(d.Active_Ingredient) : '';
    d._catsL = [d.Category_1, d.Category_2, d.Category_3, d.Category_4, d.Category_5]
      .filter((c) => c && c.trim())
      .map((c) => searchFold(c));
    drugsById.set(d.ID, d);
    drugsByNameLower.set(d._nameL, d);
  }
  cachedStats = computeStats();
  loadPromise = Promise.resolve(drugs);
}

function computeStats() {
  const ingredients = new Set();
  const atcCodes = new Set();
  for (const d of drugs) {
    if (d.Active_Ingredient && d.Active_Ingredient.trim()) {
      ingredients.add(turkishLower(d.Active_Ingredient.trim()));
    }
    if (d.ATC_code && d.ATC_code !== '0') atcCodes.add(d.ATC_code.trim());
  }
  return {
    totalDrugs: drugs.length,
    uniqueIngredients: ingredients.size,
    uniqueAtcCodes: atcCodes.size,
  };
}

export async function getStats() {
  await loadDrugs();
  if (!cachedStats) cachedStats = computeStats();
  return { ...cachedStats };
}

export function getDrugByName(name) {
  // YALNIZ tam eşleşme: substring fallback "NUROFEN" gibi kısa bir adı
  // bambaşka bir ürüne çözüp analizi sessizce yanlış ilaç üzerinden
  // yürütebilir. Kısmi arama searchDrugs'un işidir.
  if (!name) return null;
  return drugsByNameLower.get(searchFold(name)) || null;
}

export function getDrugById(id) {
  return drugsById.get(String(id)) || null;
}

export function cleanDrugResponse(drug) {
  const ingredient = isValidIngredient(drug.Active_Ingredient)
    ? drug.Active_Ingredient.trim()
    : null;
  const atcCode = drug.ATC_code && drug.ATC_code !== '0' ? drug.ATC_code.trim() : null;
  return {
    id: drug.ID,
    name: drug.Product_Name,
    activeIngredient: ingredient,
    atcCode,
    barcode: drug.barcode || null,
    categories: cleanCategories(drug),
    hasDescription: !!drug._hasDescription,
    isSupplement: !!drug.isSupplement,
    supplementBrand: drug.supplementBrand || null,
    supplementSource: drug.supplementSource || null,
    supplementApproval: drug.supplementApproval || null,
  };
}

export function searchDrugs(query, { limit = 25 } = {}) {
  if (!query) return [];
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Sadece rakamsa barkod araması (kutu üzerindeki 8-13 haneli barkod)
  if (/^\d{6,}$/.test(trimmed)) {
    const matches = [];
    for (const d of drugs) {
      if (d.barcode && d.barcode.includes(trimmed)) {
        matches.push(cleanDrugResponse(d));
        if (matches.length >= limit) break;
      }
    }
    return matches;
  }

  const q = searchFold(trimmed);

  // "takviye" sorgusu takviye kataloğunu listeler: ürün adlarında "takviye"
  // geçmediğinden normal ad/etken araması bu kataloğu bulamazdı. Kalan
  // karakterler marka filtresi olur ("takviye omega" → omega içerenler).
  if (q.startsWith('takviye') || 'takviye edici gida'.startsWith(q)) {
    // Kısmi yazımda ("takvi", "takviye edic") filtre yok — tüm katalog listelenir.
    // Yalnız tam "takviye" sonrası kalan kelimeler filtre olur; regex eşleşmezse
    // rest'i q'da bırakmak sonsuz özyineleme yapar (searchFold stack overflow'u).
    const rest = q.startsWith('takviye')
      ? q.replace(/^takviye( edici)?( gida\w*)?/, '').trim()
      : '';
    const matches = [];
    for (const d of drugs) {
      if (!d.isSupplement) continue;
      if (rest && !d._nameL.includes(rest) && !d._ingL.includes(rest)) continue;
      matches.push(cleanDrugResponse(d));
      if (matches.length >= limit) break;
    }
    if (matches.length > 0) return matches;
    // Takviye eşleşmesi yoksa: filtre kelimesiyle normal arama ("takviye parol"
    // → parol araması), filtre de yoksa tam sorguyla devam (adı "takvi..." olan ilaç).
    if (rest) return searchDrugs(rest, { limit });
  }

  // Çok kelimeli sorguda tokenlar bitişik olmak zorunda değildir:
  // "parol tablet" → her token adın herhangi bir yerinde geçsin yeter.
  const tokens = q.split(/\s+/).filter(Boolean);
  const multiToken = tokens.length > 1;
  const matchesAllTokens = (haystack) =>
    haystack ? tokens.every((t) => haystack.includes(t)) : false;

  const exact = [];
  const startsWith = [];
  const contains = [];
  const ingredient = [];
  const seen = new Set();

  for (const drug of drugs) {
    const nameL = drug._nameL;
    if (nameL === q) {
      exact.push(drug);
      seen.add(drug.ID);
    } else if (nameL.startsWith(q)) {
      startsWith.push(drug);
      seen.add(drug.ID);
    } else if (multiToken ? matchesAllTokens(nameL) : nameL.includes(q)) {
      contains.push(drug);
      seen.add(drug.ID);
    }
  }

  // İsim eşleşmesi azsa etken maddede de ara
  const nameTotal = exact.length + startsWith.length + contains.length;
  if (nameTotal < limit) {
    for (const drug of drugs) {
      if (seen.has(drug.ID)) continue;
      if (multiToken ? matchesAllTokens(drug._ingL) : drug._ingL && drug._ingL.includes(q)) {
        ingredient.push(drug);
        seen.add(drug.ID);
        if (nameTotal + ingredient.length >= limit) break;
      }
    }
  }

  return [...exact, ...startsWith, ...contains, ...ingredient]
    .slice(0, limit)
    .map(cleanDrugResponse);
}

// Prospektüsler 64 hash-bucket'a bölünmüş durumda; bir ilaç kartı açıldığında
// 46 MB'lık tek dosya yerine yalnızca ilgili ~180 KB'lık bucket indirilir.
const descBucketPromises = new Map();

function loadDescBucket(bucket) {
  const key = String(bucket).padStart(2, '0');
  let promise = descBucketPromises.get(key);
  if (promise) return promise;
  promise = dataUrl(`drugs-desc-${key}.json`)
    .then((url) => fetch(url))
    .then((r) => {
      if (!r.ok) throw new Error(`drugs-desc-${key}.json ${r.status}`);
      return r.json();
    })
    .catch((err) => {
      // Başarısız bucket cache'lenmesin; sonraki deneme yeniden indirsin.
      descBucketPromises.delete(key);
      throw err;
    });
  descBucketPromises.set(key, promise);
  return promise;
}

export async function getDescription(id) {
  const map = await loadDescBucket(bucketOf(id));
  return map[String(id)] || null;
}
