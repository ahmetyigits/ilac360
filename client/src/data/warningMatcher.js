// Tekil ilaç uyarılarının SAF eşleşme çekirdeği — Vite bağımlılığı YOKTUR;
// hem runtime motoru (warningEngine.js) hem Node scriptleri
// (scripts/warnings-coverage.mjs, lint) bu modülü kullanır.
//
// Eşleşme iki yoldan olur (OR):
//   - match.ingredients: kanonik bileşen TAM eşitliği (interaction kurallarıyla
//     aynı normalizasyon hattı — tuz soyma + sinonim çözümü)
//   - match.atcPrefixes: ATC koduna düz startsWith
// systemicOnly=true kayıtlar topikal/oftalmik formlarda bastırılır.

import { getComponents, normalizeRuleIngredient } from './ingredientMatcher.js';
import { isLowSystemicForm } from './formDetect.js';

// Panel içi sıralama: en kritik bağlamlar önce (gebelik, alerji, yaş),
// ardından her alımda uygulanacak pratik talimatlar (kullanım şekli),
// yaşam tarzı uyarıları sonra (araç, besin, takviye); 'general' (ani kesme,
// süre sınırı, takip gereksinimi gibi sınıf uyarıları) en sonda.
const TYPE_ORDER = { pregnancy: 0, lactation: 1, allergy: 2, age: 3, administration: 4, driving: 5, food: 6, supplement: 7, general: 8 };
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, info: 3 };

// Kayıt taraflarını ilaç tarafıyla aynı boru hattından geçirip önceden derle.
export function compileWarnings(warnings, synonymLookup) {
  const byComponent = new Map(); // kanonik bileşen → warning[]
  const byAtcPrefix = [];        // { prefix, warning }[]
  for (const w of warnings || []) {
    for (const ing of w.match?.ingredients || []) {
      const canonical = normalizeRuleIngredient(ing, synonymLookup);
      if (!canonical) continue;
      let list = byComponent.get(canonical);
      if (!list) {
        list = [];
        byComponent.set(canonical, list);
      }
      list.push(w);
    }
    for (const prefix of w.match?.atcPrefixes || []) {
      byAtcPrefix.push({ prefix, warning: w });
    }
  }
  return { byComponent, byAtcPrefix, count: (warnings || []).length };
}

// Kamuya dönük uyarı nesnesi: iç eşleşme alanları dışarı sızmaz.
function toPublic(w) {
  return {
    id: w.id,
    type: w.type,
    severity: w.severity,
    title: w.title,
    message: w.message,
    details: w.details || null,
    source: w.source,
  };
}

// Eşleşen HAM kayıtlar (tip+şiddet sıralı) — hem genel uyarı listesi hem
// besin filtresi bu çekirdeği kullanır.
function matchRaw(compiled, { activeIngredient, atcCode, form } = {}, synonymLookup) {
  const matched = new Map(); // id → warning (dedupe)

  for (const comp of getComponents(activeIngredient, synonymLookup)) {
    for (const w of compiled.byComponent.get(comp) || []) {
      matched.set(w.id, w);
    }
  }

  const atc = atcCode && atcCode !== '0' ? atcCode.trim() : null;
  if (atc) {
    for (const { prefix, warning } of compiled.byAtcPrefix) {
      if (atc.startsWith(prefix)) matched.set(warning.id, warning);
    }
  }

  // Topikal/oftalmik formda sistemik uyarılar geçerli değildir.
  // systemicOnly alanı zorunludur (lint doğrular); false olanlar her formda kalır.
  const lowSystemic = isLowSystemicForm(form);
  const list = [...matched.values()].filter((w) => !(lowSystemic && w.systemicOnly !== false));

  list.sort((a, b) => {
    const t = (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
    if (t !== 0) return t;
    return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
  });
  return list;
}

/**
 * @param {{byComponent: Map, byAtcPrefix: Array}} compiled  compileWarnings çıktısı
 * @param {{activeIngredient?: string|null, atcCode?: string|null, form?: string|null}} drug
 * @param {Map} synonymLookup
 * @returns {Array} tip (gebelik→takviye) + şiddet sırasına dizilmiş uyarılar
 */
export function matchWarnings(compiled, drug, synonymLookup) {
  return matchRaw(compiled, drug, synonymLookup).map(toPublic);
}

// Bir ilacın, verilen besin anahtarıyla (food-items.json `key`) etiketli
// uyarılarını döndürür — İlaç-Besin etkileşim sorgusunun çekirdeği.
// En şiddetli kayıt listenin başındadır (SEVERITY_ORDER food tipi içinde
// zaten uygulanır; farklı tipler — food/supplement — karışırsa da severity
// tek başına belirleyici olsun diye yeniden sıralanır).
export function matchFoodWarnings(compiled, foodKey, drug, synonymLookup) {
  const hits = matchRaw(compiled, drug, synonymLookup)
    .filter((w) => Array.isArray(w.foodKeys) && w.foodKeys.includes(foodKey));
  hits.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  return hits.map(toPublic);
}
