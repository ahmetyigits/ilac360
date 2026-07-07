import {
  getDrugs,
  getDrugById,
  cleanDrugResponse,
  dataUrl,
} from './drugStore.js';
import { turkishLower, searchFold, flexibleIncludes } from './turkishText.js';

let conditions = [];
// Durum id → { usage: {drugId: keyword}, full: {drugId: keyword} }
// Build sırasında hesaplanır; istemci prospektüs metinlerini indirmeden
// "prospektüste belirtilmiş" eşleşmelerini bilir.
let descMatches = {};
let cachedResults = new Map();
let loadPromise = null;

export function loadConditions() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    dataUrl('condition-mapping.json')
      .then((url) => fetch(url))
      .then((r) => {
        if (!r.ok) throw new Error(`condition-mapping.json ${r.status}`);
        return r.json();
      }),
    // Eşleşme dosyası opsiyonel: yoksa yalnızca prospektüs katmanı devre dışı kalır.
    dataUrl('condition-desc-matches.json')
      .then((url) => fetch(url))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
  ]).then(([list, matches]) => {
    conditions = list;
    descMatches = matches || {};
    return conditions;
  });
  return loadPromise;
}

export function getConditionList() {
  return conditions.map((c) => ({
    id: c.id,
    names: c.names,
    description: c.description,
  }));
}

function findMatchingCondition(query) {
  const normalizedQuery = turkishLower(query).trim();
  let exact = null;
  let prefix = null;
  let substring = null;

  for (const condition of conditions) {
    for (const name of condition.names) {
      const n = turkishLower(name).trim();
      if (n === normalizedQuery) { exact = condition; break; }
      if (!prefix && (n.startsWith(normalizedQuery) || normalizedQuery.startsWith(n))) prefix = condition;
      if (!substring && (n.includes(normalizedQuery) || normalizedQuery.includes(n))) substring = condition;
    }
    if (exact) break;
  }
  return exact || prefix || substring || null;
}

function ingredientMatches(drugIngredient, targetIngredients) {
  if (!drugIngredient) return null;
  const normalized = turkishLower(drugIngredient);
  for (const target of targetIngredients) {
    if (normalized.includes(turkishLower(target))) return target;
  }
  return null;
}

const TOPICAL_FORMS = ['krem', 'jel', 'merhem', 'pomad', 'losyon', 'şampuan', 'ovül', 'vajinal', 'rektal'];

function isTopicalForm(productName) {
  const lower = turkishLower(productName);
  return TOPICAL_FORMS.some((form) => lower.includes(form));
}

function isOralSystemic(productName) {
  const lower = turkishLower(productName);
  const oralForms = ['tablet', 'kapsül', 'kapsul', 'draje', 'şurup', 'surup', 'süspansiyon', 'suspansiyon', 'granül', 'efervesan', 'saşe', 'sase', 'ampul', 'flakon', 'enjeksiyon', 'kase', 'poşet', 'poset'];
  return oralForms.some((form) => lower.includes(form));
}

function sortScore(item) {
  const sourceScore = { ingredient: 4, atc: 3, category: 2, description: 1, 'description-full': 0 }[item._source] || 0;
  const formScore = item._isOral ? 2 : item._isTopical ? 0 : 1;
  const singleScore = item._isSingle ? 1 : 0;
  return sourceScore * 100 + formScore * 10 + singleScore;
}

function buildFullResultList(matchedCondition, drugs) {
  const seen = new Set();
  const allItems = [];
  const conditionIngredients = matchedCondition.ingredients || [];
  const dm = descMatches[matchedCondition.id] || { usage: {}, full: {} };

  for (const drug of drugs) {
    if (seen.has(drug.ID)) continue;
    let matched = false;

    if (!matched && conditionIngredients.length > 0) {
      const matchedIng = ingredientMatches(drug.Active_Ingredient, conditionIngredients);
      if (matchedIng) {
        seen.add(drug.ID);
        allItems.push({
          ...cleanDrugResponse(drug),
          matchReason: `Etken madde: ${drug.Active_Ingredient?.trim()}`,
          matchSource: 'ingredient',
          _source: 'ingredient',
          _isOral: isOralSystemic(drug.Product_Name),
          _isTopical: isTopicalForm(drug.Product_Name),
          _isSingle: !(drug.Active_Ingredient || '').match(/[,+/]/),
        });
        matched = true;
      }
    }

    if (!matched && drug.ATC_code && drug.ATC_code !== '0') {
      const atcCode = drug.ATC_code.trim();
      for (const prefix of matchedCondition.atcPrefixes) {
        if (atcCode.startsWith(prefix)) {
          seen.add(drug.ID);
          allItems.push({
            ...cleanDrugResponse(drug),
            matchReason: `ATC grubu (${prefix})`,
            matchSource: 'atc',
            _source: 'atc',
            _isOral: isOralSystemic(drug.Product_Name),
            _isTopical: isTopicalForm(drug.Product_Name),
            _isSingle: true,
          });
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      const drugCategories = [drug.Category_1, drug.Category_2, drug.Category_3, drug.Category_4, drug.Category_5]
        .filter((c) => c && c.trim());
      for (const cat of matchedCondition.categories) {
        if (drugCategories.some((dc) => flexibleIncludes(dc, cat))) {
          seen.add(drug.ID);
          allItems.push({
            ...cleanDrugResponse(drug),
            matchReason: 'Kategori eşleşmesi',
            matchSource: 'category',
            _source: 'category',
            _isOral: false,
            _isTopical: false,
            _isSingle: true,
          });
          matched = true;
          break;
        }
      }
    }

    // Prospektüs eşleşmeleri build'de hesaplandı; burada yalnızca lookup yapılır.
    if (!matched && dm.usage[drug.ID]) {
      seen.add(drug.ID);
      allItems.push({
        ...cleanDrugResponse(drug),
        matchReason: `Prospektüste belirtilmiş — ${dm.usage[drug.ID]}`,
        matchSource: 'description',
        _source: 'description',
        _isOral: isOralSystemic(drug.Product_Name),
        _isTopical: isTopicalForm(drug.Product_Name),
        _isSingle: true,
      });
      matched = true;
    }

    if (!matched && dm.full[drug.ID]) {
      seen.add(drug.ID);
      allItems.push({
        ...cleanDrugResponse(drug),
        matchReason: `Prospektüste geçiyor — ${dm.full[drug.ID]}`,
        matchSource: 'description-full',
        _source: 'description-full',
        _isOral: isOralSystemic(drug.Product_Name),
        _isTopical: isTopicalForm(drug.Product_Name),
        _isSingle: true,
      });
    }
  }

  allItems.sort((a, b) => sortScore(b) - sortScore(a));

  const priorityBrands = matchedCondition.priorityBrands || [];
  if (priorityBrands.length > 0) {
    const priorityFromDataset = [];
    const priorityIds = new Set();

    for (const brand of priorityBrands) {
      const brandLower = searchFold(brand);
      let bestMatch = null;
      for (const drug of drugs) {
        if (priorityIds.has(drug.ID)) continue;
        // _nameL loadDrugs'ta bir kez hesaplandı; regex tabanlı turkishLower'ı
        // marka × 20 bin ilaç döngüsünde yeniden çalıştırmaya gerek yok.
        const nameLower = drug._nameL;
        if (!nameLower.startsWith(brandLower)) continue;
        if (nameLower.includes('tablet') || nameLower.includes('draje') || nameLower.includes('kapsül') || nameLower.includes('kapsul')) {
          bestMatch = drug;
          break;
        }
        if (!bestMatch && isOralSystemic(drug.Product_Name)) bestMatch = drug;
      }
      if (bestMatch) {
        priorityIds.add(bestMatch.ID);
        priorityFromDataset.push({
          ...cleanDrugResponse(bestMatch),
          matchReason: `Etken madde: ${bestMatch.Active_Ingredient?.trim() || 'Bilinmiyor'}`,
          matchSource: 'ingredient',
          _source: 'ingredient',
          _isOral: true,
          _isTopical: false,
          _isSingle: true,
        });
      }
    }

    const rest = allItems.filter((d) => !priorityIds.has(d.id));
    return [...priorityFromDataset, ...rest];
  }

  return allItems;
}

function cleanItem(item) {
  const rest = { ...item };
  delete rest._source;
  delete rest._isOral;
  delete rest._isTopical;
  delete rest._isSingle;
  return rest;
}

function rememberResult(cacheKey, list) {
  cachedResults.set(cacheKey, list);
  if (cachedResults.size > 50) {
    const firstKey = cachedResults.keys().next().value;
    cachedResults.delete(firstKey);
  }
}

// Serbest metin fallback'i için "ne için kullanılır" bölümleri (~%2'lik dosya).
// Tam prospektüs seti (46 MB) hiçbir arama yolunda indirilmez.
let usageSectionsPromise = null;

function loadUsageSections() {
  if (usageSectionsPromise) return usageSectionsPromise;
  usageSectionsPromise = dataUrl('usage-sections.json')
    .then((url) => fetch(url))
    .then((r) => {
      if (!r.ok) throw new Error(`usage-sections.json ${r.status}`);
      return r.json();
    })
    .then((map) => Object.entries(map).map(([id, text]) => [id, searchFold(text)]))
    .catch((err) => {
      usageSectionsPromise = null;
      throw err;
    });
  return usageSectionsPromise;
}

async function fallbackSearch(query) {
  const cacheKey = `fallback:${searchFold(query).trim()}`;
  const cached = cachedResults.get(cacheKey);
  if (cached) return cached;

  let entries;
  try {
    entries = await loadUsageSections();
  } catch {
    return [];
  }

  const q = searchFold(query);
  const results = [];
  for (let i = 0; i < entries.length; i++) {
    // Uzun taramada ana thread'i kilitleme: 500 kayıtta bir olay döngüsüne dön.
    if (i > 0 && i % 500 === 0) await new Promise((r) => setTimeout(r, 0));
    const [id, foldedText] = entries[i];
    if (!foldedText.includes(q)) continue;
    const drug = getDrugById(id);
    if (!drug) continue;
    results.push({
      ...cleanDrugResponse(drug),
      matchReason: 'Prospektüste belirtilmiş',
      matchSource: 'description',
    });
  }

  rememberResult(cacheKey, results);
  return results;
}

export async function searchByCondition(query, { page = 1, limit = 25 } = {}) {
  if (!query || query.length < 2) {
    return { condition: null, drugs: [], totalFound: 0, page, totalPages: 0, query };
  }

  const drugs = getDrugs();
  const matchedCondition = findMatchingCondition(query);

  if (matchedCondition) {
    const cacheKey = matchedCondition.id;
    let fullList = cachedResults.get(cacheKey);
    if (!fullList) {
      fullList = buildFullResultList(matchedCondition, drugs);
      rememberResult(cacheKey, fullList);
    }

    const totalFound = fullList.length;
    const totalPages = Math.ceil(totalFound / limit);
    const start = (page - 1) * limit;
    const paged = fullList.slice(start, start + limit).map(cleanItem);

    return {
      condition: { id: matchedCondition.id, description: matchedCondition.description },
      drugs: paged,
      totalFound,
      page,
      totalPages,
      query,
    };
  }

  // Fallback: kullanım bölümü metinlerinde serbest arama.
  const fallbackResults = await fallbackSearch(query);

  const totalFound = fallbackResults.length;
  const totalPages = Math.ceil(totalFound / limit);
  const start = (page - 1) * limit;
  const paged = fallbackResults.slice(start, start + limit);

  return {
    condition: null,
    drugs: paged,
    totalFound,
    page,
    totalPages,
    query,
  };
}
