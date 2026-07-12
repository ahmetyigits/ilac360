import {
  getDrugs,
  getDrugById,
  cleanDrugResponse,
  dataUrl,
} from './drugStore.js';
import { searchFold } from './turkishText.js';

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
  }).catch((err) => {
    // Geçici hata memoize edilmesin; sonraki arama yeniden denesin.
    loadPromise = null;
    throw err;
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
  // searchFold: ilaç aramasıyla aynı ı/i katlaması — "KABIZLIK" da "kabızlık" da eşleşir.
  const normalizedQuery = searchFold(query).trim();
  let exact = null;
  let prefix = null;
  let substring = null;

  for (const condition of conditions) {
    for (const name of condition.names) {
      const n = searchFold(name).trim();
      if (n === normalizedQuery) { exact = condition; break; }
      if (!prefix && (n.startsWith(normalizedQuery) || normalizedQuery.startsWith(n))) prefix = condition;
      if (!substring && (n.includes(normalizedQuery) || normalizedQuery.includes(n))) substring = condition;
    }
    if (exact) break;
  }
  return exact || prefix || substring || null;
}

// Form kontrolleri fold edilmiş ürün adı (drug._nameL) üzerinde çalışır;
// 20 bin kayıtlık taramada ilaç başına yeniden normalizasyon YAPILMAZ.
// Not: listeler searchFold sonrası ı→i katlamasına göre yazılmıştır.
const TOPICAL_FORMS = ['krem', 'jel', 'merhem', 'pomad', 'losyon', 'şampuan', 'ovül', 'vajinal', 'rektal'];
const ORAL_FORMS = ['tablet', 'kapsül', 'kapsul', 'draje', 'şurup', 'surup', 'süspansiyon', 'suspansiyon', 'granül', 'efervesan', 'saşe', 'sase', 'ampul', 'flakon', 'enjeksiyon', 'kase', 'poşet', 'poset'];

function isTopicalFormL(nameL) {
  return TOPICAL_FORMS.some((form) => nameL.includes(form));
}

function isOralSystemicL(nameL) {
  return ORAL_FORMS.some((form) => nameL.includes(form));
}

function sortScore(item) {
  const sourceScore = { ingredient: 4, atc: 3, category: 2, description: 1, 'description-full': 0 }[item._source] || 0;
  const formScore = item._isOral ? 2 : item._isTopical ? 0 : 1;
  const singleScore = item._isSingle ? 1 : 0;
  return sourceScore * 100 + formScore * 10 + singleScore;
}

// 20 bin kayıtlık tarama: tüm fold'lar döngü DIŞINDA bir kez hesaplanır,
// ilaç başına yalnızca düz .includes/.startsWith çalışır ve döngü belirli
// aralıklarla olay döngüsüne dönerek ana thread'i kilitlemez.
const SCAN_CHUNK = 5000;

async function buildFullResultList(matchedCondition, drugs) {
  const seen = new Set();
  const allItems = [];
  const dm = descMatches[matchedCondition.id] || { usage: {}, full: {} };

  // Koşul tarafındaki hedefler bir kez normalize edilir
  const ingredientTargets = (matchedCondition.ingredients || []).map((t) => searchFold(t));
  const atcPrefixes = matchedCondition.atcPrefixes || [];
  const categoryTargets = (matchedCondition.categories || []).map((c) => searchFold(c));

  for (let i = 0; i < drugs.length; i++) {
    if (i > 0 && i % SCAN_CHUNK === 0) await new Promise((r) => setTimeout(r, 0));
    const drug = drugs[i];
    if (seen.has(drug.ID)) continue;
    const nameL = drug._nameL;
    let matched = false;

    if (ingredientTargets.length > 0 && drug._ingL) {
      for (const target of ingredientTargets) {
        if (drug._ingL.includes(target)) {
          seen.add(drug.ID);
          allItems.push({
            ...cleanDrugResponse(drug),
            matchReason: `Etken madde: ${drug.Active_Ingredient?.trim()}`,
            matchSource: 'ingredient',
            _source: 'ingredient',
            _isOral: isOralSystemicL(nameL),
            _isTopical: isTopicalFormL(nameL),
            _isSingle: !(drug.Active_Ingredient || '').match(/[,+/]/),
          });
          matched = true;
          break;
        }
      }
    }

    if (!matched && drug.ATC_code && drug.ATC_code !== '0') {
      const atcCode = drug.ATC_code.trim();
      for (const prefix of atcPrefixes) {
        if (atcCode.startsWith(prefix)) {
          seen.add(drug.ID);
          allItems.push({
            ...cleanDrugResponse(drug),
            matchReason: `ATC grubu (${prefix})`,
            matchSource: 'atc',
            _source: 'atc',
            _isOral: isOralSystemicL(nameL),
            _isTopical: isTopicalFormL(nameL),
            _isSingle: true,
          });
          matched = true;
          break;
        }
      }
    }

    if (!matched && drug._catsL && drug._catsL.length > 0) {
      outer: for (const cat of categoryTargets) {
        for (const dc of drug._catsL) {
          if (dc.includes(cat)) {
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
            break outer;
          }
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
        _isOral: isOralSystemicL(nameL),
        _isTopical: isTopicalFormL(nameL),
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
        _isOral: isOralSystemicL(nameL),
        _isTopical: isTopicalFormL(nameL),
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
        const nameLower = drug._nameL;
        if (!nameLower.startsWith(brandLower)) continue;
        if (nameLower.includes('tablet') || nameLower.includes('draje') || nameLower.includes('kapsül') || nameLower.includes('kapsul')) {
          bestMatch = drug;
          break;
        }
        if (!bestMatch && isOralSystemicL(nameLower)) bestMatch = drug;
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

  // Yükleme hatası "sonuç yok"la KARIŞTIRILMAZ: hata yukarı fırlar,
  // UI ayrı bir "veriler yüklenemedi — tekrar dene" paneli gösterir.
  const entries = await loadUsageSections();

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
      fullList = await buildFullResultList(matchedCondition, drugs);
      rememberResult(cacheKey, fullList);
    }

    const totalFound = fullList.length;
    const totalPages = Math.ceil(totalFound / limit);
    // Aralık dışı sayfa isteği son geçerli sayfaya sabitlenir
    page = Math.min(Math.max(1, page), Math.max(1, totalPages));
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
  page = Math.min(Math.max(1, page), Math.max(1, totalPages));
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
