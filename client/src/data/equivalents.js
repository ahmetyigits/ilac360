// Eşdeğer ilaç grupları — MEVCUT veriden, ek indirme olmadan hesaplanır.
// Grup anahtarı: sıralı kanonik bileşen kümesi + 7 haneli ATC kodu.
// ("Amlodipin Besilat" ve "amlodipin" tuz ayıklama + sinonimlerle birleşir.)
//
// ÖNEMLİ: Bu, etkin madde + ATC eşleşmesine dayalı FARMASÖTİK bir gruplamadır;
// doz/form farkları olabilir ve resmî SGK eşdeğer listesi DEĞİLDİR. UI bu
// ibareyi her zaman gösterir.

import { getDrugs, getDrugById } from './drugStore.js';
import { getComponents } from './ingredientMatcher.js';
import { getSynonymLookup } from './interactionEngine.js';

let groupsByKey = null;
let keyById = null;

export function resetEquivalentsIndex() {
  groupsByKey = null;
  keyById = null;
}

function equivalenceKey(drug, synonymLookup) {
  const atc = drug.ATC_code && drug.ATC_code !== '0' ? drug.ATC_code.trim() : null;
  if (!atc || atc.length < 7) return null;
  const components = getComponents(drug.Active_Ingredient, synonymLookup);
  if (components.length === 0) return null;
  return `${[...components].sort().join('+')}|${atc}`;
}

function buildIndex() {
  const synonymLookup = getSynonymLookup();
  groupsByKey = new Map();
  keyById = new Map();
  for (const drug of getDrugs()) {
    const key = equivalenceKey(drug, synonymLookup);
    if (!key) continue;
    keyById.set(drug.ID, key);
    let group = groupsByKey.get(key);
    if (!group) {
      group = [];
      groupsByKey.set(key, group);
    }
    group.push(drug.ID);
  }
}

/**
 * Bir ilacın eşdeğerlerini (kendisi hariç) döndürür.
 * Çağırmadan önce loadDrugs() ve loadInteractions() tamamlanmış olmalıdır
 * (api.getEquivalents bunu garanti eder).
 */
export function getEquivalentIds(id, { limit = 12 } = {}) {
  if (!groupsByKey) buildIndex();
  const key = keyById.get(String(id));
  if (!key) return [];
  const group = groupsByKey.get(key) || [];
  return group.filter((gid) => gid !== String(id)).slice(0, limit);
}

export function getEquivalentDrugs(id, opts) {
  return getEquivalentIds(id, opts)
    .map((gid) => getDrugById(gid))
    .filter(Boolean);
}
