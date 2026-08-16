import {
  loadDrugs,
  loadManifest,
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
import { loadWarnings, getWarningsForDrug } from './warningEngine.js';
import { loadFoods, getFoodList as getFoodListLocal, getFoodsByKeys as getFoodsByKeysLocal, toBasketItem } from './foodStore.js';

let bootPromise = null;

export function bootData() {
  if (bootPromise) return bootPromise;
  bootPromise = Promise.all([loadDrugs(), loadInteractions(), loadConditions()])
    .catch((err) => {
      // Alt yükleyiciler başarılarını kendileri memoize eder; burada yalnız
      // başarısız birleşimi sıfırla ki "Tekrar dene" eksik olanı yeniden çeksin.
      bootPromise = null;
      throw err;
    });
  return bootPromise;
}

export async function searchDrugs(query) {
  await loadDrugs();
  return searchDrugsLocal(query);
}

// Besin/içecek katalogu — FoodPicker çipleri ve paylaşım linki çözümü.
export async function getFoodItems() {
  await loadFoods();
  return getFoodListLocal().map(toBasketItem);
}

export async function getFoodsByKeys(keys) {
  await loadFoods();
  const { foods, invalidKeys } = getFoodsByKeysLocal(keys);
  return { foods: foods.map(toBasketItem), invalidKeys };
}

export async function getDrugDetail(id) {
  // Uyarı seti başarısız yüklenirse detay ekranı engellenmez; uyarılar boş kalır.
  await Promise.all([loadDrugs(), loadWarnings().catch(() => {})]);
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
    warnings: getWarningsForDrug({
      activeIngredient: drug.Active_Ingredient,
      atcCode,
      form: drug.Form ?? null,
    }),
  };
}

// Yazdırılabilir rapor için: seçili ilaçların tekil uyarıları (id → uyarı listesi).
// Uyarısı olmayan ilaçlar sonuca girmez.
export async function getWarningsForDrugs(refs) {
  await Promise.all([loadDrugs(), loadWarnings().catch(() => {})]);
  const result = [];
  for (const ref of refs) {
    const drug = getDrugByIdLocal(ref.id);
    if (!drug) continue;
    const atcCode = drug.ATC_code && drug.ATC_code !== '0' ? drug.ATC_code.trim() : null;
    const warnings = getWarningsForDrug({
      activeIngredient: drug.Active_Ingredient,
      atcCode,
      form: drug.Form ?? null,
    });
    if (warnings.length > 0) {
      result.push({ id: drug.ID, name: drug.Product_Name, warnings });
    }
  }
  return result;
}

// Eşdeğer ilaçlar (aynı kanonik bileşen kümesi + aynı 7 haneli ATC).
export async function getEquivalents(id, opts) {
  await Promise.all([loadDrugs(), loadInteractions()]);
  const { getEquivalentDrugs } = await import('./equivalents.js');
  return getEquivalentDrugs(id, opts).map((drug) => ({
    id: drug.ID,
    name: drug.Product_Name,
    activeIngredient: isValidIngredient(drug.Active_Ingredient) ? drug.Active_Ingredient.trim() : null,
    atcCode: drug.ATC_code && drug.ATC_code !== '0' ? drug.ATC_code.trim() : null,
    barcode: drug.barcode || null,
    categories: cleanCategories(drug),
    hasDescription: !!drug._hasDescription,
  }));
}

// Kayıtlı/paylaşılan sepetin id'lerini güncel veriye çözer.
export async function getDrugsByIds(ids) {
  await loadDrugs();
  const drugs = [];
  const invalidIds = [];
  for (const id of ids) {
    const drug = getDrugByIdLocal(id);
    if (drug) {
      drugs.push({
        id: drug.ID,
        name: drug.Product_Name,
        activeIngredient: isValidIngredient(drug.Active_Ingredient) ? drug.Active_Ingredient.trim() : null,
        atcCode: drug.ATC_code && drug.ATC_code !== '0' ? drug.ATC_code.trim() : null,
        barcode: drug.barcode || null,
        categories: cleanCategories(drug),
        hasDescription: !!drug._hasDescription,
      });
    } else {
      invalidIds.push(id);
    }
  }
  return { drugs, invalidIds };
}

export async function getStats() {
  await Promise.all([loadDrugs(), loadInteractions()]);
  const stats = await getStatsLocal();
  const manifest = await loadManifest();
  return {
    ...stats,
    interactionRules: getRuleCount(),
    dataGeneratedAt: manifest?.generatedAt || null,
    conditionCount: manifest?.conditionCount || null,
    descriptionCount: manifest?.descriptionCount || null,
  };
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
