const DATA_BASE = `${import.meta.env.BASE_URL || '/'}data`.replace(/\/+$/, '');

let drugs = [];
let drugsById = new Map();
let drugsByNameLower = new Map();
let cachedStats = null;
let loadPromise = null;

let descriptions = null;
let descriptionsPromise = null;

export function turkishLower(str) {
  return String(str)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ş/g, 'ş')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü')
    .replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .toLowerCase();
}

export function flexibleIncludes(haystack, needle) {
  if (!haystack || !needle) return false;
  const h1 = turkishLower(haystack);
  const n1 = turkishLower(needle);
  if (h1.includes(n1)) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function flexibleEquals(a, b) {
  if (turkishLower(a) === turkishLower(b)) return true;
  return String(a).toLowerCase() === String(b).toLowerCase();
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
    _hasDescription: !!entry.h,
  };
}

export function loadDrugs() {
  if (loadPromise) return loadPromise;
  loadPromise = fetch(`${DATA_BASE}/drugs-index.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`drugs-index.json ${r.status}`);
      return r.json();
    })
    .then((entries) => {
      drugs = entries.map(expand);
      drugsById = new Map();
      drugsByNameLower = new Map();
      for (const d of drugs) {
        drugsById.set(d.ID, d);
        drugsByNameLower.set(turkishLower(d.Product_Name), d);
      }
      cachedStats = computeStats();
      return drugs;
    });
  return loadPromise;
}

export function getDrugs() {
  return drugs;
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
  if (!name) return null;
  const exact = drugsByNameLower.get(turkishLower(name));
  if (exact) return exact;
  for (const d of drugs) {
    if (flexibleIncludes(d.Product_Name, name)) return d;
  }
  return null;
}

export function getDrugById(id) {
  return drugsById.get(String(id)) || null;
}

const INVALID_INGREDIENTS = new Set([
  'etken maddesi bilgisi bulunamadı.',
  'etken maddesi bilgisi bulunamadı',
  'other cold preparations',
  'bilinmiyor',
  '-',
  '—',
]);

export function isValidIngredient(ingredient) {
  if (!ingredient || !ingredient.trim()) return false;
  return !INVALID_INGREDIENTS.has(ingredient.trim().toLowerCase());
}

export function cleanCategories(drug) {
  return [drug.Category_1, drug.Category_2, drug.Category_3, drug.Category_4, drug.Category_5]
    .map((c) => c?.trim())
    .filter((c) => c && c.length > 0 && c !== 'Yok');
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

  const q = turkishLower(trimmed);
  const exact = [];
  const startsWith = [];
  const contains = [];
  const ingredient = [];
  const seen = new Set();

  for (const drug of drugs) {
    const nameL = turkishLower(drug.Product_Name);
    if (nameL === q) {
      exact.push(drug);
      seen.add(drug.ID);
    } else if (nameL.startsWith(q)) {
      startsWith.push(drug);
      seen.add(drug.ID);
    } else if (nameL.includes(q)) {
      contains.push(drug);
      seen.add(drug.ID);
    }
  }

  // İsim eşleşmesi azsa etken maddede de ara
  const nameTotal = exact.length + startsWith.length + contains.length;
  if (nameTotal < limit) {
    for (const drug of drugs) {
      if (seen.has(drug.ID)) continue;
      if (drug.Active_Ingredient && turkishLower(drug.Active_Ingredient).includes(q)) {
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

// Açıklamalar dosyası ~45 MB — sadece DrugCard açıldığında veya
// hastalığa göre arama prospektüs taramasına düştüğünde indirilir.
export function loadDescriptions() {
  if (descriptionsPromise) return descriptionsPromise;
  descriptionsPromise = fetch(`${DATA_BASE}/drugs-descriptions.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`drugs-descriptions.json ${r.status}`);
      return r.json();
    })
    .then((map) => {
      descriptions = map;
      return descriptions;
    });
  return descriptionsPromise;
}

export function getDescriptionSync(id) {
  if (!descriptions) return undefined;
  return descriptions[String(id)] || null;
}

export async function getDescription(id) {
  await loadDescriptions();
  return descriptions[String(id)] || null;
}

export function descriptionsLoaded() {
  return descriptions !== null;
}
