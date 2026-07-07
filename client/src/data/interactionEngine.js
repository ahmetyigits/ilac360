import { getDrugByName, dataUrl } from './drugStore.js';
import { isValidIngredient } from './turkishText.js';
import {
  getComponents,
  normalizeRuleIngredient,
  buildSynonymLookup,
} from './ingredientMatcher.js';

let knownInteractions = [];
let compiledRules = [];
let synonymLookup = new Map();
let loadPromise = null;

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
  ]).then(([rules, synonyms]) => {
    synonymLookup = buildSynonymLookup(synonyms);
    knownInteractions = rules;
    compiledRules = compileRules(rules);
    return knownInteractions;
  });
  return loadPromise;
}

// Test kancası: fetch olmadan kural/sinonim enjekte etmek için.
export function setInteractionsForTest(rules, synonyms = {}) {
  synonymLookup = buildSynonymLookup(synonyms);
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

const ATC_CATEGORY_MAP = [
  { prefix: 'M01A', category: 'NSAID' },
  { prefix: 'M02AA', category: 'NSAID_TOPICAL' },
  { prefix: 'N02BA', category: 'SALICYLATE' },
  { prefix: 'N02BE', category: 'ANILIDE_ANALGESIC' },
  { prefix: 'N02A', category: 'OPIOID' },
  { prefix: 'N02CC', category: 'TRIPTAN' },
  { prefix: 'B01AA', category: 'VITAMIN_K_ANTAGONIST' },
  { prefix: 'B01AB', category: 'HEPARIN' },
  { prefix: 'B01AC', category: 'ANTIPLATELET' },
  { prefix: 'B01AE', category: 'DIRECT_THROMBIN_INHIBITOR' },
  { prefix: 'B01AF', category: 'DIRECT_FACTOR_XA_INHIBITOR' },
  { prefix: 'C01A', category: 'CARDIAC_GLYCOSIDE' },
  { prefix: 'C01BD', category: 'ANTIARRHYTHMIC_III' },
  { prefix: 'C02', category: 'ANTIHYPERTENSIVE' },
  { prefix: 'C03A', category: 'THIAZIDE_DIURETIC' },
  { prefix: 'C03C', category: 'LOOP_DIURETIC' },
  { prefix: 'C03D', category: 'POTASSIUM_SPARING_DIURETIC' },
  { prefix: 'C07', category: 'BETA_BLOCKER' },
  { prefix: 'C08', category: 'CALCIUM_CHANNEL_BLOCKER' },
  { prefix: 'C09A', category: 'ACE_INHIBITOR' },
  { prefix: 'C09B', category: 'ACE_INHIBITOR_COMBO' },
  { prefix: 'C09C', category: 'ARB' },
  { prefix: 'C09D', category: 'ARB_COMBO' },
  { prefix: 'C10AA', category: 'STATIN' },
  { prefix: 'C10AB', category: 'FIBRATE' },
  { prefix: 'A10BA', category: 'BIGUANIDE' },
  { prefix: 'A10BB', category: 'SULFONYLUREA' },
  { prefix: 'A10BH', category: 'DPP4_INHIBITOR' },
  { prefix: 'A10BJ', category: 'GLP1_AGONIST' },
  { prefix: 'A10BK', category: 'SGLT2_INHIBITOR' },
  { prefix: 'A10A', category: 'INSULIN' },
  { prefix: 'A02BC', category: 'PPI' },
  { prefix: 'A02BA', category: 'H2_BLOCKER' },
  { prefix: 'A03', category: 'ANTISPASMODIC' },
  { prefix: 'N05A', category: 'ANTIPSYCHOTIC' },
  { prefix: 'N05BA', category: 'BENZODIAZEPINE' },
  { prefix: 'N05CD', category: 'BENZODIAZEPINE' },
  { prefix: 'N05CF', category: 'Z_DRUG' },
  { prefix: 'N06AB', category: 'SSRI' },
  { prefix: 'N06AX', category: 'OTHER_ANTIDEPRESSANT' },
  { prefix: 'N06AA', category: 'TCA' },
  { prefix: 'N06AF', category: 'MAOI' },
  { prefix: 'N06AG', category: 'MAOI_A' },
  { prefix: 'N03A', category: 'ANTIEPILEPTIC' },
  { prefix: 'J01MA', category: 'FLUOROQUINOLONE' },
  { prefix: 'J01FA', category: 'MACROLIDE' },
  { prefix: 'J01', category: 'ANTIBIOTIC' },
  { prefix: 'J02A', category: 'ANTIFUNGAL_SYSTEMIC' },
  { prefix: 'R03', category: 'RESPIRATORY' },
  { prefix: 'R06A', category: 'ANTIHISTAMINE' },
  { prefix: 'H02AB', category: 'CORTICOSTEROID' },
  { prefix: 'H03AA', category: 'THYROID_HORMONE' },
  { prefix: 'L04A', category: 'IMMUNOSUPPRESSANT' },
  { prefix: 'L01', category: 'ANTINEOPLASTIC' },
];

function getCategory(atcCode) {
  if (!atcCode || atcCode === '0') return null;
  for (const entry of ATC_CATEGORY_MAP) {
    if (atcCode.startsWith(entry.prefix)) return entry.category;
  }
  return null;
}

function getAllCategories(atcCode) {
  if (!atcCode || atcCode === '0') return [];
  const cats = [];
  for (const entry of ATC_CATEGORY_MAP) {
    if (atcCode.startsWith(entry.prefix)) cats.push(entry.category);
  }
  return cats;
}

const CATEGORY_INTERACTIONS = [
  { catA: 'NSAID', catB: 'NSAID', risk: 'high', message: 'İki NSAID birlikte kullanımı gastrointestinal kanama riskini önemli ölçüde artırır.' },
  { catA: 'NSAID', catB: 'ANTIPLATELET', risk: 'high', message: 'NSAID ve antiplatelet birlikte kullanımı kanama riskini artırır.' },
  { catA: 'NSAID', catB: 'VITAMIN_K_ANTAGONIST', risk: 'critical', message: 'NSAID ve warfarin/kumarin birlikte kullanımı ciddi kanama riskini çok artırır.' },
  { catA: 'NSAID', catB: 'HEPARIN', risk: 'high', message: 'NSAID ve heparin birlikte kullanımı kanama riskini artırır.' },
  { catA: 'NSAID', catB: 'DIRECT_THROMBIN_INHIBITOR', risk: 'high', message: 'NSAID ve direkt trombin inhibitörü birlikte kanama riskini artırır.' },
  { catA: 'NSAID', catB: 'DIRECT_FACTOR_XA_INHIBITOR', risk: 'high', message: 'NSAID ve direkt Faktör Xa inhibitörü birlikte kanama riskini artırır.' },
  { catA: 'NSAID', catB: 'ACE_INHIBITOR', risk: 'medium', message: 'NSAID, ACE inhibitörlerinin etkisini azaltabilir ve böbrek fonksiyonunu olumsuz etkileyebilir.' },
  { catA: 'NSAID', catB: 'ACE_INHIBITOR_COMBO', risk: 'medium', message: 'NSAID, ACE inhibitörlerinin etkisini azaltabilir ve böbrek fonksiyonunu olumsuz etkileyebilir.' },
  { catA: 'NSAID', catB: 'ARB', risk: 'medium', message: 'NSAID, ARB ilaçlarının etkisini azaltabilir ve böbrek fonksiyonunu olumsuz etkileyebilir.' },
  { catA: 'NSAID', catB: 'ARB_COMBO', risk: 'medium', message: 'NSAID, ARB ilaçlarının etkisini azaltabilir ve böbrek fonksiyonunu olumsuz etkileyebilir.' },
  { catA: 'NSAID', catB: 'LOOP_DIURETIC', risk: 'medium', message: 'NSAID diüretiklerin etkisini azaltabilir ve böbrek fonksiyonunu bozabilir.' },
  { catA: 'NSAID', catB: 'THIAZIDE_DIURETIC', risk: 'medium', message: 'NSAID diüretiklerin etkisini azaltabilir.' },
  { catA: 'NSAID', catB: 'SSRI', risk: 'medium', message: 'SSRI ve NSAID birlikte kullanımı gastrointestinal kanama riskini artırır.' },
  { catA: 'NSAID', catB: 'CORTICOSTEROID', risk: 'high', message: 'NSAID ve kortikosteroid birlikte kullanımı GI kanama ve ülser riskini ciddi şekilde artırır.' },
  { catA: 'NSAID', catB: 'BIGUANIDE', risk: 'medium', message: 'NSAID, metforminin böbrekten atılımını etkileyebilir.' },
  { catA: 'ANTIPLATELET', catB: 'VITAMIN_K_ANTAGONIST', risk: 'high', message: 'Antiplatelet ve vitamin K antagonisti birlikte ciddi kanama riskini artırır.' },
  { catA: 'ANTIPLATELET', catB: 'SSRI', risk: 'medium', message: 'SSRI ilaçlar antiplatelet etkiyi artırarak kanama riskini yükseltebilir.' },
  { catA: 'VITAMIN_K_ANTAGONIST', catB: 'MACROLIDE', risk: 'high', message: 'Makrolid antibiyotikler warfarinin etkisini artırarak kanama riskini yükseltir.' },
  { catA: 'VITAMIN_K_ANTAGONIST', catB: 'FLUOROQUINOLONE', risk: 'high', message: 'Fluorokinolonlar warfarinin etkisini artırarak kanama riskini yükseltir.' },
  { catA: 'VITAMIN_K_ANTAGONIST', catB: 'ANTIFUNGAL_SYSTEMIC', risk: 'high', message: 'Sistemik antifungaller warfarinin metabolizmasını inhibe ederek kanama riskini artırır.' },
  { catA: 'VITAMIN_K_ANTAGONIST', catB: 'STATIN', risk: 'medium', message: 'Bazı statinler warfarinin etkisini artırabilir. INR takibi önerilir.' },
  { catA: 'ANTIPLATELET', catB: 'PPI', risk: 'medium', message: 'Bazı PPI ilaçlar (özellikle omeprazol) klopidogrelin etkinliğini azaltabilir.' },
  { catA: 'ACE_INHIBITOR', catB: 'POTASSIUM_SPARING_DIURETIC', risk: 'high', message: 'ACE inhibitörü ve potasyum tutucu diüretik birlikte kullanımı hiperkalemi riskini artırır.' },
  { catA: 'ACE_INHIBITOR_COMBO', catB: 'POTASSIUM_SPARING_DIURETIC', risk: 'high', message: 'ACE inhibitörü ve potasyum tutucu diüretik birlikte kullanımı hiperkalemi riskini artırır.' },
  { catA: 'ARB', catB: 'POTASSIUM_SPARING_DIURETIC', risk: 'high', message: 'ARB ve potasyum tutucu diüretik birlikte kullanımı hiperkalemi riskini artırır.' },
  { catA: 'ARB_COMBO', catB: 'POTASSIUM_SPARING_DIURETIC', risk: 'high', message: 'ARB ve potasyum tutucu diüretik birlikte kullanımı hiperkalemi riskini artırır.' },
  { catA: 'ACE_INHIBITOR', catB: 'ARB', risk: 'high', message: 'ACE inhibitörü ve ARB birlikte kullanımı hiperkalemi, hipotansiyon ve böbrek yetmezliği riskini artırır.' },
  { catA: 'BETA_BLOCKER', catB: 'CALCIUM_CHANNEL_BLOCKER', risk: 'medium', message: 'Beta bloker ve kalsiyum kanal blokeri birlikte bradikardi ve hipotansiyon riskini artırabilir.' },
  { catA: 'BETA_BLOCKER', catB: 'BETA_BLOCKER', risk: 'high', message: 'İki beta bloker birlikte ciddi bradikardi ve hipotansiyon riskini artırır.' },
  { catA: 'CARDIAC_GLYCOSIDE', catB: 'LOOP_DIURETIC', risk: 'high', message: 'Diüretiklerin neden olduğu hipokalemi digoksin toksisitesini artırabilir.' },
  { catA: 'CARDIAC_GLYCOSIDE', catB: 'THIAZIDE_DIURETIC', risk: 'high', message: 'Diüretiklerin neden olduğu hipokalemi digoksin toksisitesini artırabilir.' },
  { catA: 'CARDIAC_GLYCOSIDE', catB: 'CALCIUM_CHANNEL_BLOCKER', risk: 'high', message: 'Bazı kalsiyum kanal blokerleri digoksin düzeylerini artırarak toksisiteye yol açabilir.' },
  { catA: 'CARDIAC_GLYCOSIDE', catB: 'ANTIARRHYTHMIC_III', risk: 'high', message: 'Amiodaron digoksin düzeylerini önemli ölçüde artırır.' },
  { catA: 'STATIN', catB: 'MACROLIDE', risk: 'high', message: 'Makrolid antibiyotikler statin düzeylerini artırarak rabdomiyoliz riskini yükseltir.' },
  { catA: 'STATIN', catB: 'ANTIFUNGAL_SYSTEMIC', risk: 'critical', message: 'Sistemik antifungaller statin metabolizmasını ciddi şekilde engeller. Rabdomiyoliz riski çok yüksektir.' },
  { catA: 'STATIN', catB: 'FIBRATE', risk: 'high', message: 'Statin ve fibrat birlikte kullanımı rabdomiyoliz riskini artırır.' },
  { catA: 'STATIN', catB: 'CALCIUM_CHANNEL_BLOCKER', risk: 'medium', message: 'Bazı kalsiyum kanal blokerleri statin düzeylerini artırabilir.' },
  { catA: 'SULFONYLUREA', catB: 'FLUOROQUINOLONE', risk: 'high', message: 'Fluorokinolonlar kan şekerini düşürerek hipoglisemi riskini artırabilir.' },
  { catA: 'SULFONYLUREA', catB: 'BETA_BLOCKER', risk: 'medium', message: 'Beta blokerler hipoglisemi belirtilerini maskeleyebilir.' },
  { catA: 'INSULIN', catB: 'BETA_BLOCKER', risk: 'medium', message: 'Beta blokerler hipoglisemi belirtilerini maskeleyebilir.' },
  { catA: 'INSULIN', catB: 'SULFONYLUREA', risk: 'high', message: 'İnsülin ve sülfonilüre birlikte ciddi hipoglisemi riskini artırır.' },
  { catA: 'BIGUANIDE', catB: 'LOOP_DIURETIC', risk: 'medium', message: 'Diüretikler böbrek fonksiyonunu etkileyerek metformin birikimi riskini artırabilir.' },
  { catA: 'SSRI', catB: 'MAOI', risk: 'critical', message: 'SSRI ve MAO inhibitörü birlikte kullanımı serotonin sendromuna neden olabilir. Kontrendikedir!' },
  { catA: 'SSRI', catB: 'MAOI_A', risk: 'critical', message: 'SSRI ve MAO-A inhibitörü birlikte kullanımı serotonin sendromu riskini taşır.' },
  { catA: 'SSRI', catB: 'TCA', risk: 'high', message: 'SSRI ve trisiklik antidepresan birlikte serotonerjik etkileri artırır ve TCA düzeylerini yükseltir.' },
  { catA: 'SSRI', catB: 'OPIOID', risk: 'medium', message: 'SSRI ve opioid (özellikle tramadol) birlikte serotonin sendromu riskini artırabilir.' },
  { catA: 'SSRI', catB: 'TRIPTAN', risk: 'high', message: 'SSRI ve triptan birlikte serotonin sendromu riskini artırır.' },
  { catA: 'TCA', catB: 'MAOI', risk: 'critical', message: 'TCA ve MAO inhibitörü birlikte kontrendikedir. Serotonin sendromu ve hipertansif kriz riski!' },
  { catA: 'BENZODIAZEPINE', catB: 'OPIOID', risk: 'critical', message: 'Benzodiazepin ve opioid birlikte kullanımı solunum depresyonu ve ölüm riskini ciddi şekilde artırır.' },
  { catA: 'BENZODIAZEPINE', catB: 'BENZODIAZEPINE', risk: 'high', message: 'İki benzodiazepin birlikte aşırı sedasyon ve solunum depresyonu riskini artırır.' },
  { catA: 'Z_DRUG', catB: 'BENZODIAZEPINE', risk: 'high', message: 'Z-ilacı ve benzodiazepin birlikte aşırı sedasyon riskini artırır.' },
  { catA: 'ANTIPSYCHOTIC', catB: 'ANTIPSYCHOTIC', risk: 'high', message: 'İki antipsikotik birlikte QT uzaması ve ekstrapiramidal yan etki riskini artırır.' },
  { catA: 'ANTIPSYCHOTIC', catB: 'OPIOID', risk: 'high', message: 'Antipsikotik ve opioid birlikte sedasyon ve solunum depresyonu riskini artırır.' },
  { catA: 'ANTIEPILEPTIC', catB: 'ANTIEPILEPTIC', risk: 'medium', message: 'İki antiepileptik birlikte kullanımda etkileşim ve düzey değişiklikleri olabilir. Dikkatli takip gerekir.' },
  { catA: 'ANTIEPILEPTIC', catB: 'ANTIPSYCHOTIC', risk: 'medium', message: 'Antiepileptikler antipsikotik düzeylerini etkileyebilir. Nöbet eşiği değişebilir.' },
  { catA: 'THYROID_HORMONE', catB: 'CALCIUM_CHANNEL_BLOCKER', risk: 'medium', message: 'Kalsiyum tuzları levotiroksin emilimini azaltabilir. Ayrı zamanlarda alınmalıdır.' },
  { catA: 'THYROID_HORMONE', catB: 'PPI', risk: 'medium', message: 'PPI ilaçlar levotiroksin emilimini azaltabilir.' },
  { catA: 'MACROLIDE', catB: 'ANTIARRHYTHMIC_III', risk: 'critical', message: 'Makrolid ve amiodaron birlikte QT uzaması ve ölümcül aritmi riskini ciddi şekilde artırır.' },
  { catA: 'MACROLIDE', catB: 'ANTIPSYCHOTIC', risk: 'high', message: 'Makrolid ve antipsikotik birlikte QT uzaması riskini artırır.' },
  { catA: 'FLUOROQUINOLONE', catB: 'ANTIARRHYTHMIC_III', risk: 'critical', message: 'Fluorokinolon ve amiodaron birlikte ciddi QT uzaması ve aritmi riski taşır.' },
  { catA: 'FLUOROQUINOLONE', catB: 'CORTICOSTEROID', risk: 'medium', message: 'Fluorokinolon ve kortikosteroid birlikte tendon rüptürü riskini artırır.' },
  { catA: 'CORTICOSTEROID', catB: 'ANTIPLATELET', risk: 'medium', message: 'Kortikosteroid ve antiplatelet birlikte GI kanama riskini artırabilir.' },
  { catA: 'CORTICOSTEROID', catB: 'SULFONYLUREA', risk: 'medium', message: 'Kortikosteroidler kan şekerini yükselterek diyabet tedavisinin etkinliğini azaltır.' },
  { catA: 'CORTICOSTEROID', catB: 'INSULIN', risk: 'medium', message: 'Kortikosteroidler kan şekerini yükselterek insülin ihtiyacını artırır.' },
  { catA: 'CORTICOSTEROID', catB: 'BIGUANIDE', risk: 'medium', message: 'Kortikosteroidler kan şekerini yükselterek diyabet tedavisinin etkinliğini azaltır.' },
];

function checkCategoryInteraction(cats1, cats2) {
  for (const cat1 of cats1) {
    for (const cat2 of cats2) {
      for (const rule of CATEGORY_INTERACTIONS) {
        if ((cat1 === rule.catA && cat2 === rule.catB) || (cat1 === rule.catB && cat2 === rule.catA)) {
          return { ...rule, matchedCat1: cat1, matchedCat2: cat2 };
        }
      }
    }
  }
  return null;
}

export function getRuleCount() {
  return knownInteractions.length + CATEGORY_INTERACTIONS.length;
}

const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4, info: 5, safe: 6 };

export function analyzeInteractions(drugNames) {
  const results = [];
  const unknownDrugs = [];
  const drugData = drugNames.map((name) => {
    const drug = getDrugByName(name);
    if (!drug) unknownDrugs.push(name);
    const components = drug ? getComponents(drug.Active_Ingredient, synonymLookup) : [];
    return {
      name,
      drug,
      components: new Set(components),
      atcCode: drug?.ATC_code || null,
      categories: drug ? getAllCategories(drug.ATC_code) : [],
      primaryCategory: drug ? getCategory(drug.ATC_code) : null,
      atcGroup: drug ? getAtcGroup(drug.ATC_code) : null,
    };
  });

  for (let i = 0; i < drugData.length; i++) {
    for (let j = i + 1; j < drugData.length; j++) {
      const a = drugData[i];
      const b = drugData[j];
      if (!a.drug || !b.drug) continue;

      const bothHaveComponents = a.components.size > 0 && b.components.size > 0;

      // Ortak etken madde: kanonik bileşen kümeleri üzerinden tam eşitlik.
      if (bothHaveComponents) {
        const shared = [...a.components].filter((c) => b.components.has(c));
        if (shared.length > 0) {
          const identical =
            shared.length === a.components.size && shared.length === b.components.size;
          results.push({
            drug1: a.name,
            drug2: b.name,
            risk: identical ? 'critical' : 'high',
            message: identical
              ? `Her iki ilaç da aynı etkin maddeyi (${a.drug.Active_Ingredient.trim()}) içermektedir. Doz aşımı riski!`
              : `İlaçlar ortak etkin madde içermektedir (${shared.join(', ')}). Doz aşımı riski olabilir.`,
            details: identical
              ? 'Aynı etkin maddeyi içeren ilaçların birlikte kullanımı doz aşımına neden olabilir.'
              : `${a.drug.Active_Ingredient.trim()} ↔ ${b.drug.Active_Ingredient.trim()}`,
          });
          continue;
        }
      }

      if (bothHaveComponents) {
        const knownRule = checkKnownInteraction(a.components, b.components);
        if (knownRule) {
          results.push({
            drug1: a.name,
            drug2: b.name,
            risk: knownRule.risk || 'high',
            message: knownRule.message,
            details: knownRule.details || null,
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
            risk: catRule.risk,
            message: catRule.message,
            details: `${a.drug.Active_Ingredient?.trim() || 'Bilinmiyor'} (${catRule.matchedCat1}) ↔ ${b.drug.Active_Ingredient?.trim() || 'Bilinmiyor'} (${catRule.matchedCat2})`,
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
          risk: 'info',
          message: `Her iki ilaç da aynı farmakolojik alt gruba (${a.atcGroup}) aittir. Bu bir etkileşim değil, bilgilendirmedir.`,
          details: `${a.drug.Active_Ingredient?.trim() || 'Bilinmiyor'} ↔ ${b.drug.Active_Ingredient?.trim() || 'Bilinmiyor'}`,
        });
        continue;
      }

      results.push({
        drug1: a.name,
        drug2: b.name,
        risk: 'unknown',
        message: 'Bu ilaç çifti için veritabanımızda bilinen bir etkileşim kuralı yok. Bu, etkileşim olmadığı anlamına gelmez; klinik değerlendirme önerilir.',
        details: null,
      });
    }
  }

  results.sort((a, b) => (RISK_ORDER[a.risk] ?? 7) - (RISK_ORDER[b.risk] ?? 7));

  return { interactions: results, unknownDrugs };
}

export function analyzeWithEnrichment(drugNames) {
  const { interactions, unknownDrugs } = analyzeInteractions(drugNames);
  const enriched = interactions.map((interaction) => {
    const d1 = getDrugByName(interaction.drug1);
    const d2 = getDrugByName(interaction.drug2);
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
