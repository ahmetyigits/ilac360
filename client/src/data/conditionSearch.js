import {
  turkishLower,
  flexibleIncludes,
  getDrugs,
  cleanDrugResponse,
  loadDescriptions,
  getDescriptionSync,
} from './drugStore.js';

const DATA_BASE = `${import.meta.env.BASE_URL || '/'}data`.replace(/\/+$/, '');

let conditions = [];
let cachedResults = new Map();
let loadPromise = null;

export function loadConditions() {
  if (loadPromise) return loadPromise;
  loadPromise = fetch(`${DATA_BASE}/condition-mapping.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`condition-mapping.json ${r.status}`);
      return r.json();
    })
    .then((list) => {
      conditions = list;
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

function extractUsageSection(description) {
  if (!description) return null;
  const lower = turkishLower(description);
  const startMarkers = [
    'ne için kullanılır', 'nedir ve ne için kullanılır', 'endikasyonlar', 'endikedir',
    'endikasyon', 'kullanım alanı', 'kullanım alanları', 'kullanıldığı durumlar',
    'kullanılır', 'tedavisinde', 'tedavisi için', 'etkilidir', 'neyi tedavi eder',
    'terapötik endikasyon',
  ];
  const endMarkers = [
    'kullanmadan önce', 'nasıl kullanılır', 'kullanırken dikkat', 'kullanmayınız',
    'yan etki', 'olası yan etki', 'istenmeyen etki', 'doz aşımı', 'saklama koşul',
    'içeri̇k', 'içerik', 'kontrendikasyon', 'uyarı',
  ];
  let startIdx = -1;
  for (const marker of startMarkers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1) { startIdx = idx; break; }
  }
  if (startIdx === -1) return null;
  let endIdx = description.length;
  for (const marker of endMarkers) {
    const idx = lower.indexOf(marker, startIdx + 20);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }
  return description.substring(startIdx, endIdx);
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

function buildFullResultList(matchedCondition, drugs, descriptionsAvailable) {
  const seen = new Set();
  const allItems = [];
  const conditionIngredients = matchedCondition.ingredients || [];

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
          _isSingle: !(drug.Active_Ingredient || '').match(/[,+\/]/),
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

    if (!matched && descriptionsAvailable) {
      const desc = getDescriptionSync(drug.ID);
      if (desc) {
        const usageSection = extractUsageSection(desc);
        if (usageSection) {
          for (const keyword of matchedCondition.keywords) {
            if (flexibleIncludes(usageSection, keyword)) {
              seen.add(drug.ID);
              allItems.push({
                ...cleanDrugResponse(drug),
                matchReason: `Prospektüste belirtilmiş — ${keyword}`,
                matchSource: 'description',
                _source: 'description',
                _isOral: isOralSystemic(drug.Product_Name),
                _isTopical: isTopicalForm(drug.Product_Name),
                _isSingle: true,
              });
              matched = true;
              break;
            }
          }
        }
      }
    }

    if (!matched && descriptionsAvailable) {
      const desc = getDescriptionSync(drug.ID);
      if (desc && desc.length > 50) {
        for (const keyword of matchedCondition.keywords) {
          if (keyword.length < 4) continue;
          if (flexibleIncludes(desc, keyword)) {
            seen.add(drug.ID);
            allItems.push({
              ...cleanDrugResponse(drug),
              matchReason: `Prospektüste geçiyor — ${keyword}`,
              matchSource: 'description-full',
              _source: 'description-full',
              _isOral: isOralSystemic(drug.Product_Name),
              _isTopical: isTopicalForm(drug.Product_Name),
              _isSingle: true,
            });
            break;
          }
        }
      }
    }
  }

  allItems.sort((a, b) => sortScore(b) - sortScore(a));

  const priorityBrands = matchedCondition.priorityBrands || [];
  if (priorityBrands.length > 0) {
    const priorityFromDataset = [];
    const priorityIds = new Set();

    for (const brand of priorityBrands) {
      const brandLower = turkishLower(brand);
      let bestMatch = null;
      for (const drug of drugs) {
        if (priorityIds.has(drug.ID)) continue;
        if (!turkishLower(drug.Product_Name).startsWith(brandLower)) continue;
        const nameLower = turkishLower(drug.Product_Name);
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

function cleanItem({ _source, _isOral, _isTopical, _isSingle, ...rest }) {
  return rest;
}

export async function searchByCondition(query, { page = 1, limit = 25 } = {}) {
  if (!query || query.length < 2) {
    return { condition: null, drugs: [], totalFound: 0, page, totalPages: 0, query };
  }

  const drugs = getDrugs();
  const matchedCondition = findMatchingCondition(query);

  if (matchedCondition) {
    await loadDescriptions().catch(() => {});

    const cacheKey = matchedCondition.id;
    let fullList = cachedResults.get(cacheKey);
    if (!fullList) {
      fullList = buildFullResultList(matchedCondition, drugs, true);
      cachedResults.set(cacheKey, fullList);
      if (cachedResults.size > 50) {
        const firstKey = cachedResults.keys().next().value;
        cachedResults.delete(firstKey);
      }
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

  // Fallback: direct usage-section search across all drugs.
  await loadDescriptions().catch(() => {});
  const fallbackResults = [];
  for (const drug of drugs) {
    const desc = getDescriptionSync(drug.ID);
    const usageSection = extractUsageSection(desc);
    if (!usageSection) continue;
    if (flexibleIncludes(usageSection, query)) {
      fallbackResults.push({
        ...cleanDrugResponse(drug),
        matchReason: 'Prospektüste belirtilmiş',
        matchSource: 'description',
      });
    }
  }

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
