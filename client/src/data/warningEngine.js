// Tekil ilaç statik uyarıları (alerji / besin / takviye / gebelik / araç / yaş).
// Etkileşim motorundan bağımsızdır: bir ilaç TEK BAŞINA seçildiğinde bile
// İlaç Detayı panelinde gösterilecek, ürün etiketlerinden derlenmiş kürasyonlu
// uyarıları eşler (data/drug-warnings.json).
//
// Eşleşme mantığı SAF modülde yaşar (warningMatcher.js — Node scriptleri de
// kullanır); bu dosya yalnız veri yükleme ve durum yönetimidir.

import { dataUrl } from './drugStore.js';
import { buildSynonymLookup } from './ingredientMatcher.js';
import { compileWarnings, matchWarnings } from './warningMatcher.js';

let compiled = { byComponent: new Map(), byAtcPrefix: [], count: 0 };
// Sinonim tablosu interactionEngine ile aynı dosyadan gelir; ikinci fetch
// tarayıcı cache'inden döner ve modüller birbirinden bağımsız kalır.
let synonymLookup = new Map();
let loadPromise = null;

export function loadWarnings() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    dataUrl('drug-warnings.json')
      .then((url) => fetch(url))
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    dataUrl('ingredient-synonyms.json')
      .then((url) => fetch(url))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
  ]).then(([warnings, synonyms]) => {
    synonymLookup = buildSynonymLookup(synonyms);
    compiled = compileWarnings(Array.isArray(warnings) ? warnings : [], synonymLookup);
    return compiled.count;
  }).catch((err) => {
    // Geçici hata memoize edilmesin; sonraki çağrı yeniden denesin.
    loadPromise = null;
    throw err;
  });
  return loadPromise;
}

// Test kancası: fetch olmadan uyarı/sinonim enjekte etmek için.
export function setWarningsForTest(warnings, synonyms = {}) {
  synonymLookup = buildSynonymLookup(synonyms);
  compiled = compileWarnings(warnings, synonymLookup);
  loadPromise = Promise.resolve(compiled.count);
}

export function getWarningRuleCount() {
  return compiled.count;
}

export function getWarningsForDrug(drug) {
  return matchWarnings(compiled, drug, synonymLookup);
}
