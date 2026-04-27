import {
  loadDrugs,
  searchDrugs as searchDrugsLocal,
  getDrugById as getDrugByIdLocal,
  getStats as getStatsLocal,
  getDescription,
  isValidIngredient,
  cleanCategories,
} from './drugStore.js';
import {
  loadInteractions,
  analyzeWithEnrichment,
  getRuleCount,
} from './interactionEngine.js';
import {
  loadConditions,
  getConditionList as getConditionListLocal,
  searchByCondition as searchByConditionLocal,
} from './conditionSearch.js';

let bootPromise = null;

export function bootData() {
  if (bootPromise) return bootPromise;
  bootPromise = Promise.all([loadDrugs(), loadInteractions(), loadConditions()]);
  return bootPromise;
}

export async function searchDrugs(query) {
  await loadDrugs();
  return searchDrugsLocal(query);
}

export async function getDrugDetail(id) {
  await loadDrugs();
  const drug = getDrugByIdLocal(id);
  if (!drug) return null;

  const ingredient = isValidIngredient(drug.Active_Ingredient)
    ? drug.Active_Ingredient.trim()
    : null;
  const atcCode = drug.ATC_code && drug.ATC_code !== '0' ? drug.ATC_code.trim() : null;

  let description = null;
  if (drug._hasDescription) {
    const raw = await getDescription(id);
    if (raw && raw.trim().length > 0 && !raw.includes('İkinci siteye ait içerik bulunamadı')) {
      description = raw.trim();
    }
  }

  return {
    id: drug.ID,
    name: drug.Product_Name,
    activeIngredient: ingredient,
    atcCode,
    barcode: drug.barcode || null,
    categories: cleanCategories(drug),
    description,
  };
}

export async function getStats() {
  await Promise.all([loadDrugs(), loadInteractions()]);
  const stats = await getStatsLocal();
  return { ...stats, interactionRules: getRuleCount() };
}

export async function analyzeInteractions(drugNames) {
  await Promise.all([loadDrugs(), loadInteractions()]);
  return analyzeWithEnrichment(drugNames);
}

export async function getConditionList() {
  await loadConditions();
  return getConditionListLocal();
}

export async function searchCondition(query, opts) {
  await Promise.all([loadDrugs(), loadConditions()]);
  return searchByConditionLocal(query, opts);
}
