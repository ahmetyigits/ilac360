import { getDrugByName, getDrugById, dataUrl } from './drugStore.js';
import { isValidIngredient, searchFold } from './turkishText.js';
import {
  getComponents,
  normalizeRuleIngredient,
  buildSynonymLookup,
} from './ingredientMatcher.js';
import { detectForm, isLowSystemicForm } from './formDetect.js';
import {
  CATEGORY_INTERACTIONS,
  getCategory,
  getAllCategories,
  checkCategoryInteraction,
} from './categoryRules.js';

let knownInteractions = [];
let compiledRules = [];
let synonymLookup = new Map();
// Kanonik bileşen → ATC (build'de üretilir). Kombinasyon ürünlerinde
// bileşenlerin gerçek farmakolojik sınıflarını türetmek için kullanılır.
let componentAtcMap = {};
// Yalnızca ortak-etken-madde (doz aşımı) kontrolünden hariç tutulan yardımcı
// bileşenler (kafein, lidokain...). Kural eşleştirmesini etkilemez.
let adjuvantSet = new Set();
// Bileşen → {classes:[...], qt:'known'|'possible'} — SNRI/serotonerjik sınıf
// etiketleri ve additive-QT modeli için (data/component-classes.json).
let componentClassMap = new Map();
let loadPromise = null;

function buildComponentClassMap(raw) {
  const map = new Map();
  for (const [name, meta] of Object.entries(raw?.components || {})) {
    const normalized = normalizeRuleIngredient(name, synonymLookup);
    if (normalized) map.set(normalized, meta);
  }
  return map;
}

function buildAdjuvantSet(raw) {
  const set = new Set();
  for (const name of raw?.adjuvants || []) {
    const normalized = normalizeRuleIngredient(name, synonymLookup);
    if (normalized) set.add(normalized);
  }
  return set;
}

// Kural taraflarını da ilaç tarafıyla aynı boru hattından geçirip önceden derle:
// eşleştirme, kanonik bileşen adları üzerinde TAM eşitlikle yapılır.
function compileRules(rules) {
  const compiled = [];
  for (const rule of rules) {
    const a = normalizeRuleIngredient(rule.ingredientA, synonymLookup);
    const b = normalizeRuleIngredient(rule.ingredientB, synonymLookup);
    if (!a || !b) continue;
    compiled.push({ ...rule, _a: a, _b: b });
  }
  return compiled;
}

export function loadInteractions() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    dataUrl('interactions.json')
      .then((url) => fetch(url))
      .then((r) => {
        if (!r.ok) throw new Error(`interactions.json ${r.status}`);
        return r.json();
      }),
    // Sinonim tablosu opsiyonel: yüklenemezse tam-ad eşleşmesiyle devam edilir.
    dataUrl('ingredient-synonyms.json')
      .then((url) => fetch(url))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
    dataUrl('component-atc.json')
      .then((url) => fetch(url))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
    dataUrl('adjuvant-components.json')
      .then((url) => fetch(url))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
    dataUrl('component-classes.json')
      .then((url) => fetch(url))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
  ]).then(([rules, synonyms, compAtc, adjuvants, compClasses]) => {
    synonymLookup = buildSynonymLookup(synonyms);
    componentAtcMap = compAtc || {};
    adjuvantSet = buildAdjuvantSet(adjuvants);
    componentClassMap = buildComponentClassMap(compClasses);
    knownInteractions = rules;
    compiledRules = compileRules(rules);
    return knownInteractions;
  }).catch((err) => {
    // Geçici hata memoize edilmesin; "Tekrar dene" gerçekten yeniden denesin.
    loadPromise = null;
    throw err;
  });
  return loadPromise;
}

// Eşdeğer ilaç hesaplaması motorla aynı sinonim tablosunu kullanır.
export function getSynonymLookup() {
  return synonymLookup;
}

// Test kancası: fetch olmadan kural/sinonim enjekte etmek için.
export function setInteractionsForTest(rules, synonyms = {}, compAtc = {}, adjuvants = {}, compClasses = {}) {
  synonymLookup = buildSynonymLookup(synonyms);
  componentAtcMap = compAtc || {};
  adjuvantSet = buildAdjuvantSet(adjuvants);
  componentClassMap = buildComponentClassMap(compClasses);
  knownInteractions = rules;
  compiledRules = compileRules(rules);
  loadPromise = Promise.resolve(knownInteractions);
}

const getAtcGroup = (a) => (a && a.length >= 4 ? a.substring(0, 4) : null);

function checkKnownInteraction(componentsA, componentsB) {
  if (componentsA.size === 0 || componentsB.size === 0) return null;
  for (const rule of compiledRules) {
    if (
      (componentsA.has(rule._a) && componentsB.has(rule._b)) ||
      (componentsA.has(rule._b) && componentsB.has(rule._a))
    ) {
      return rule;
    }
  }
  return null;
}

// ATC sınıf haritası ve sınıf kuralları categoryRules.js'te yaşar (saf modül;
// lint/coverage scriptleri de import eder).
export function getRuleCount() {
  return knownInteractions.length + CATEGORY_INTERACTIONS.length;
}

const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4, info: 5, safe: 6 };

// Girdi: {id, name} nesneleri (tercih edilen — 135 üründe ürün adı çakışması
// olduğundan yalnızca ada güvenilmez) veya geriye dönük uyumluluk için ad stringleri.
export function analyzeInteractions(drugRefs) {
  const results = [];
  const unknownDrugs = [];

  // Aynı ilacın iki kez analize girmesi sahte "aynı etkin madde — doz aşımı"
  // (critical) üretir ve QT ajan sayacını şişirir; id'ye (yoksa fold'lanmış
  // ada) göre teklenir.
  const seenRefs = new Set();
  const uniqueRefs = drugRefs.filter((ref) => {
    const id = typeof ref === 'object' && ref !== null ? ref.id : null;
    const name = typeof ref === 'object' && ref !== null ? ref.name : ref;
    const key = id != null ? `id:${id}` : `ad:${searchFold(name || '')}`;
    if (seenRefs.has(key)) return false;
    seenRefs.add(key);
    return true;
  });

  const drugData = uniqueRefs.map((ref) => {
    const id = typeof ref === 'object' && ref !== null ? ref.id : null;
    const name = typeof ref === 'object' && ref !== null ? ref.name : ref;
    // id verildiyse ada DÜŞÜLMEZ: bayat bir ?d= linkindeki geçersiz id,
    // ad benzerliğiyle yanlış ürüne çözülüp sessizce yanlış analiz üretmesin.
    const drug = id != null ? getDrugById(id) : getDrugByName(name);
    if (!drug) unknownDrugs.push(name);
    const components = drug ? getComponents(drug.Active_Ingredient, synonymLookup) : [];

    // Farmasötik form: index'ten (build hesaplar); yoksa addan türet.
    // Topikal/oftalmik formlarda sistemik emilim sınırlıdır.
    const form = drug ? (drug.Form ?? detectForm(drug._nameL || '', drug.ATC_code)) : null;
    const lowSystemic = isLowSystemicForm(form);

    // Sınıflar ürünün kendi ATC'sinden + bileşenlerin bilinen ATC'lerinden
    // türetilir ("flurbiprofen+tiyokolşikosid" → NSAID). Topikal/oftalmik
    // formlarda bileşen-ATC enjeksiyonu AKTİF sınıflara katılmaz (diklofenak
    // JEL'in sistemik NSAID sayılıp warfarin'le kritik vermesini engeller);
    // yine de "bastırılmış" küme ayrıca tutulur ki eşleşme tamamen sessizce
    // yutulmasın, düşük seviyeli bilgilendirmeye düşürülebilsin.
    const ownCats = new Set(drug ? getAllCategories(drug.ATC_code) : []);
    const componentCats = new Set();
    for (const comp of components) {
      const compAtc = componentAtcMap[comp];
      if (!compAtc) continue;
      for (const cat of getAllCategories(compAtc)) componentCats.add(cat);
    }
    // component-classes.json etiketleri: SNRI gibi ATC'den türetilemeyen
    // sınıflar + QT uzatma durumu ('known' > 'possible').
    let qtLevel = null;
    for (const comp of components) {
      const meta = componentClassMap.get(comp);
      if (!meta) continue;
      for (const cls of meta.classes || []) componentCats.add(cls);
      if (meta.qt === 'known') qtLevel = 'known';
      else if (meta.qt === 'possible' && qtLevel !== 'known') qtLevel = 'possible';
    }

    const activeCats = new Set(ownCats);
    if (!lowSystemic) {
      for (const cat of componentCats) activeCats.add(cat);
    }
    const fullCats = new Set([...ownCats, ...componentCats]);

    return {
      name: name || drug?.Product_Name,
      drug,
      form,
      lowSystemic,
      // Topikal/oftalmik formda QT katkısı sayılmaz
      qtLevel: lowSystemic ? null : qtLevel,
      components: new Set(components),
      atcCode: drug?.ATC_code || null,
      categories: [...activeCats],
      fullCategories: [...fullCats],
      primaryCategory: drug ? getCategory(drug.ATC_code) : null,
      atcGroup: drug ? getAtcGroup(drug.ATC_code) : null,
    };
  });

  // Additive-QT modeli: analizdeki QT uzatan ajan sayısı — ≥3 ajanda çift
  // bazlı uyarılar bir seviye yükselir (toplam yük artar).
  const qtAgentCount = drugData.filter((d) => d.qtLevel).length;

  for (let i = 0; i < drugData.length; i++) {
    for (let j = i + 1; j < drugData.length; j++) {
      const a = drugData[i];
      const b = drugData[j];
      if (!a.drug || !b.drug) continue;

      const bothHaveComponents = a.components.size > 0 && b.components.size > 0;
      const anyLowSystemic = a.lowSystemic || b.lowSystemic;
      // Yalnızca adjuvan (kafein, lidokain...) paylaşan çiftler: doz aşımı
      // uyarısı üretmez; hiçbir güçlü kural da tetiklenmezse en sonda düşük
      // seviyeli bir bilgilendirme eklenir.
      let adjuvantOnlyShared = null;

      // Ortak etken madde: kanonik bileşen kümeleri üzerinden tam eşitlik.
      if (bothHaveComponents) {
        const shared = [...a.components].filter((c) => b.components.has(c));
        const meaningful = shared.filter((c) => !adjuvantSet.has(c));
        if (meaningful.length > 0) {
          const identical =
            shared.length === a.components.size && shared.length === b.components.size;
          if (anyLowSystemic) {
            // Taraflardan biri topikal/oftalmik: toplam sistemik doz riski düşük.
            results.push({
              drug1: a.name,
              drug2: b.name,
              id1: a.drug.ID,
              id2: b.drug.ID,
              risk: 'medium',
              message: `Her iki üründe ortak etkin madde var (${meaningful.join(', ')}), ancak ${a.lowSystemic && b.lowSystemic ? 'ikisi de' : 'biri'} topikal/lokal formdadır. Toplam sistemik doz riski düşüktür; yine de aynı bölgeye birlikte uygulamaktan kaçının.`,
              details: `${a.drug.Active_Ingredient.trim()} ↔ ${b.drug.Active_Ingredient.trim()}`,
            });
          } else {
            results.push({
              drug1: a.name,
              drug2: b.name,
              id1: a.drug.ID,
              id2: b.drug.ID,
              risk: identical ? 'critical' : 'high',
              message: identical
                ? `Her iki ilaç da aynı etkin maddeyi (${a.drug.Active_Ingredient.trim()}) içermektedir. Doz aşımı riski!`
                : `İlaçlar ortak etkin madde içermektedir (${meaningful.join(', ')}). Doz aşımı riski olabilir.`,
              details: identical
                ? 'Aynı etkin maddeyi içeren ilaçların birlikte kullanımı doz aşımına neden olabilir.'
                : `${a.drug.Active_Ingredient.trim()} ↔ ${b.drug.Active_Ingredient.trim()}`,
            });
          }
          continue;
        }
        if (shared.length > 0) {
          // Yalnızca adjuvan paylaşımı: güçlü kontrollere DÜŞMEYE devam et.
          adjuvantOnlyShared = shared;
        }
      }

      if (bothHaveComponents) {
        const knownRule = checkKnownInteraction(a.components, b.components);
        if (knownRule) {
          results.push({
            drug1: a.name,
            drug2: b.name,
            id1: a.drug.ID,
            id2: b.drug.ID,
            risk: knownRule.risk || 'high',
            message: knownRule.message,
            details: knownRule.details || null,
            action: knownRule.action || null,
            ruleId: knownRule.id || null,
            evidence: knownRule.evidence || null,
            source: knownRule.source || null,
          });
          continue;
        }
      }

      if (a.categories.length > 0 && b.categories.length > 0) {
        const catRule = checkCategoryInteraction(a.categories, b.categories);
        if (catRule) {
          results.push({
            drug1: a.name,
            drug2: b.name,
            id1: a.drug.ID,
            id2: b.drug.ID,
            risk: catRule.risk,
            message: catRule.message,
            details: `${a.drug.Active_Ingredient?.trim() || 'Bilinmiyor'} (${catRule.matchedCat1}) ↔ ${b.drug.Active_Ingredient?.trim() || 'Bilinmiyor'} (${catRule.matchedCat2})`,
          });
          continue;
        }
      }

      // Additive-QT: her iki ilaç da QT uzatan ajan içeriyorsa (ve daha
      // spesifik bir kural yukarıda eşleşmediyse) toplam yük uyarısı üret.
      // Kaynaklar component-classes.json'da FDA/EMA etiketleriyle kayıtlıdır.
      if (a.qtLevel && b.qtLevel) {
        const bothKnown = a.qtLevel === 'known' && b.qtLevel === 'known';
        let risk = bothKnown ? 'high' : 'medium';
        if (qtAgentCount >= 3) risk = risk === 'high' ? 'critical' : 'high';
        results.push({
          drug1: a.name,
          drug2: b.name,
          id1: a.drug.ID,
          id2: b.drug.ID,
          risk,
          message: qtAgentCount >= 3
            ? `Listenizde QT aralığını uzatabilen ${qtAgentCount} ilaç var. Birlikte kullanım ciddi kalp ritim bozukluğu (Torsades de Pointes) riskini artırır.`
            : 'Her iki ilaç da QT aralığını uzatabilir. Birlikte kullanım kalp ritim bozukluğu riskini artırabilir; EKG takibi gerekebilir.',
          details: `${a.drug.Active_Ingredient?.trim() || '—'} (QT: ${a.qtLevel === 'known' ? 'bilinen' : 'olası'}) ↔ ${b.drug.Active_Ingredient?.trim() || '—'} (QT: ${b.qtLevel === 'known' ? 'bilinen' : 'olası'})`,
        });
        continue;
      }

      // Sınıf kuralı yalnız topikal tarafın BASTIRILMIŞ bileşen sınıfları
      // üzerinden eşleşiyorsa sessizce yutma: düşük seviyeli notla bildir.
      if (anyLowSystemic && a.fullCategories.length > 0 && b.fullCategories.length > 0) {
        const suppressedRule = checkCategoryInteraction(a.fullCategories, b.fullCategories);
        if (suppressedRule) {
          const topikalSide = a.lowSystemic ? a : b;
          results.push({
            drug1: a.name,
            drug2: b.name,
            id1: a.drug.ID,
            id2: b.drug.ID,
            risk: 'low',
            message: `${topikalSide.name} topikal/lokal (cilt-göz üzerine uygulanan) formdur; sistemik etkileşim riski düşüktür. Geniş yüzeye veya uzun süre uygulamada sınırlı emilim olabilir.`,
            details: `Sistemik formda geçerli olacak uyarı: ${suppressedRule.message}`,
          });
          continue;
        }
      }

      // Aynı ATC alt grubu bir etkileşim DEĞİLDİR; yalnızca bilgilendirme olarak
      // işaretlenir. (Daha genel 3 karakterlik terapötik grup karşılaştırması
      // aşırı alarm ürettiği için tamamen kaldırıldı.)
      if (a.atcGroup && b.atcGroup && a.atcGroup === b.atcGroup && a.atcCode !== b.atcCode) {
        results.push({
          drug1: a.name,
          drug2: b.name,
          id1: a.drug.ID,
          id2: b.drug.ID,
          risk: 'info',
          message: `Her iki ilaç da aynı farmakolojik alt gruba (${a.atcGroup}) aittir. Bu bir etkileşim değil, bilgilendirmedir.`,
          details: `${a.drug.Active_Ingredient?.trim() || 'Bilinmiyor'} ↔ ${b.drug.Active_Ingredient?.trim() || 'Bilinmiyor'}`,
        });
        continue;
      }

      if (adjuvantOnlyShared) {
        results.push({
          drug1: a.name,
          drug2: b.name,
          id1: a.drug.ID,
          id2: b.drug.ID,
          risk: 'low',
          message: `Ortak bileşen yalnızca yardımcı/destek maddesidir (${adjuvantOnlyShared.join(', ')}). Bu genellikle klinik olarak önemli bir doz aşımı riski oluşturmaz.`,
          details: `${a.drug.Active_Ingredient?.trim() || '—'} ↔ ${b.drug.Active_Ingredient?.trim() || '—'}`,
        });
        continue;
      }

      results.push({
        drug1: a.name,
        drug2: b.name,
        id1: a.drug.ID,
        id2: b.drug.ID,
        risk: 'unknown',
        message: 'Bu ilaç çifti için veritabanımızda bilinen bir etkileşim kuralı yok. Bu, etkileşim olmadığı anlamına gelmez; klinik değerlendirme önerilir.',
        details: null,
      });
    }
  }

  results.sort((a, b) => (RISK_ORDER[a.risk] ?? 7) - (RISK_ORDER[b.risk] ?? 7));

  return { interactions: results, unknownDrugs };
}

export function analyzeWithEnrichment(drugRefs) {
  const { interactions, unknownDrugs } = analyzeInteractions(drugRefs);
  // Ada göre değil, çift sonucundaki id'lere göre çözümle: 135 üründe ürün
  // adı çakıştığından ad haritası yanlış ATC/etken gösterebilir.
  const resolve = (id, name) =>
    (id != null ? getDrugById(id) : null) || getDrugByName(name);
  const enriched = interactions.map((interaction) => {
    const d1 = resolve(interaction.id1, interaction.drug1);
    const d2 = resolve(interaction.id2, interaction.drug2);
    return {
      ...interaction,
      ingredientA: d1 && isValidIngredient(d1.Active_Ingredient) ? d1.Active_Ingredient.trim() : null,
      ingredientB: d2 && isValidIngredient(d2.Active_Ingredient) ? d2.Active_Ingredient.trim() : null,
      atcA: d1?.ATC_code && d1.ATC_code !== '0' ? d1.ATC_code : null,
      atcB: d2?.ATC_code && d2.ATC_code !== '0' ? d2.ATC_code : null,
    };
  });
  return { interactions: enriched, unknownDrugs };
}
