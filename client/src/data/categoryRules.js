// ATC sınıf haritası ve sınıf-düzeyi etkileşim kuralları — SAF modül.
// Vite/drugStore bağımlılığı YOKTUR: hem motor hem scripts/*.mjs (lint,
// coverage, CSV export) doğrudan import edebilir.

export const ATC_CATEGORY_MAP = [
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
  { prefix: 'L04AD', category: 'CALCINEURIN' },
  { prefix: 'L04A', category: 'IMMUNOSUPPRESSANT' },
  { prefix: 'L01', category: 'ANTINEOPLASTIC' },
  { prefix: 'C01DA', category: 'NITRATE' },
  { prefix: 'G04BE', category: 'PDE5_INHIBITOR' },
  { prefix: 'G04CA', category: 'ALPHA_BLOCKER' },
  { prefix: 'A12BA', category: 'POTASSIUM_SUPPLEMENT' },
  { prefix: 'A12A', category: 'CALCIUM_SUPPLEMENT' },
  { prefix: 'B03A', category: 'IRON_SUPPLEMENT' },
  { prefix: 'A02A', category: 'ANTACID' },
  { prefix: 'N02CA', category: 'ERGOT' },
  { prefix: 'N04BD', category: 'MAOI_B' },
  { prefix: 'R03DA', category: 'XANTHINE' },
  { prefix: 'J04AB', category: 'RIFAMYCIN' },
  { prefix: 'M04AC', category: 'COLCHICINE' },
  { prefix: 'J01G', category: 'AMINOGLYCOSIDE' },
  { prefix: 'J01A', category: 'TETRACYCLINE' },
  { prefix: 'J01E', category: 'TMP_SULFA' },
  { prefix: 'J01XX08', category: 'LINEZOLID' },
  { prefix: 'A04AA', category: 'SETRON' },
  { prefix: 'M05BA', category: 'BISPHOSPHONATE' },
  { prefix: 'A03FA', category: 'PROKINETIC' },
  // N05AN (lityum) N05A prefiksine de uyar ama antipsikotik DEĞİLDİR;
  // getAllCategories LITHIUM görünce ANTIPSYCHOTIC'i eler.
  { prefix: 'N05AN', category: 'LITHIUM' },
  // Bitkiseller: yalnız TAM/uzun ATC — N06DX geneli (memantin N06DX01!) veya
  // N05CM geneli (deksmedetomidin N05CM18!) eşlenmez. ATC'si "0" olan bitkisel
  // kombinasyonlar component-classes.json sınıf etiketiyle yakalanır.
  { prefix: 'N06DX02', category: 'HERBAL_GINKGO' },
  { prefix: 'A06AB', category: 'STIMULANT_LAXATIVE' },
  { prefix: 'L01BA01', category: 'METHOTREXATE' },
  { prefix: 'L04AX03', category: 'METHOTREXATE' },
  { prefix: 'V08A', category: 'IODINATED_CONTRAST' },
];

export function getCategory(atcCode) {
  if (!atcCode || atcCode === '0') return null;
  // En SPESİFİK (en uzun) prefiks kazanır: N05AN → LITHIUM (N05A/ANTIPSYCHOTIC
  // değil), J01AA → TETRACYCLINE (J01/ANTIBIOTIC değil). Map sırasına güvenilmez.
  let best = null;
  let bestLen = 0;
  for (const entry of ATC_CATEGORY_MAP) {
    if (atcCode.startsWith(entry.prefix) && entry.prefix.length > bestLen) {
      best = entry.category;
      bestLen = entry.prefix.length;
    }
  }
  return best;
}

export function getAllCategories(atcCode) {
  if (!atcCode || atcCode === '0') return [];
  const cats = [];
  for (const entry of ATC_CATEGORY_MAP) {
    if (atcCode.startsWith(entry.prefix)) cats.push(entry.category);
  }
  // Lityum antipsikotik değildir: ANTIPSYCHOTIC kuralları (antipsikotik ×
  // antipsikotik gibi) lityuma uygulanmamalı.
  if (cats.includes('LITHIUM')) {
    return cats.filter((c) => c !== 'ANTIPSYCHOTIC');
  }
  return cats;
}

export const CATEGORY_INTERACTIONS = [
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
  // --- Nitrat / PDE5 / alfa bloker (ONC yüksek öncelikli) ---
  { catA: 'NITRATE', catB: 'PDE5_INHIBITOR', risk: 'critical', message: 'Nitrat ve PDE5 inhibitörü (sildenafil vb.) birlikte kullanımı kontrendikedir. Hayatı tehdit eden kan basıncı düşüşü olabilir.' },
  { catA: 'NITRATE', catB: 'ALPHA_BLOCKER', risk: 'medium', message: 'Nitrat ve alfa bloker birlikte belirgin hipotansiyona neden olabilir.' },
  { catA: 'PDE5_INHIBITOR', catB: 'ALPHA_BLOCKER', risk: 'medium', message: 'PDE5 inhibitörü ve alfa bloker birlikte ortostatik hipotansiyon riskini artırır.' },
  // --- Hiperkalemi ---
  { catA: 'POTASSIUM_SUPPLEMENT', catB: 'ACE_INHIBITOR', risk: 'high', message: 'Potasyum takviyesi ve ACE inhibitörü birlikte hiperkalemi riskini artırır.' },
  { catA: 'POTASSIUM_SUPPLEMENT', catB: 'ACE_INHIBITOR_COMBO', risk: 'high', message: 'Potasyum takviyesi ve ACE inhibitörü birlikte hiperkalemi riskini artırır.' },
  { catA: 'POTASSIUM_SUPPLEMENT', catB: 'ARB', risk: 'high', message: 'Potasyum takviyesi ve ARB birlikte hiperkalemi riskini artırır.' },
  { catA: 'POTASSIUM_SUPPLEMENT', catB: 'ARB_COMBO', risk: 'high', message: 'Potasyum takviyesi ve ARB birlikte hiperkalemi riskini artırır.' },
  { catA: 'POTASSIUM_SUPPLEMENT', catB: 'POTASSIUM_SPARING_DIURETIC', risk: 'high', message: 'Potasyum takviyesi ve potasyum tutucu diüretik birlikte ciddi hiperkalemi riskini taşır.' },
  { catA: 'TMP_SULFA', catB: 'ACE_INHIBITOR', risk: 'high', message: 'Trimetoprim içeren antibiyotikler ACE inhibitörüyle birlikte hiperkalemi riskini artırır.' },
  { catA: 'TMP_SULFA', catB: 'ARB', risk: 'high', message: 'Trimetoprim içeren antibiyotikler ARB ile birlikte hiperkalemi riskini artırır.' },
  { catA: 'TMP_SULFA', catB: 'POTASSIUM_SPARING_DIURETIC', risk: 'high', message: 'Trimetoprim ve potasyum tutucu diüretik birlikte ciddi hiperkalemi riskini taşır.' },
  { catA: 'TMP_SULFA', catB: 'SULFONYLUREA', risk: 'high', message: 'Kotrimoksazol/trimetoprim sülfonilürelerin etkisini artırarak hipoglisemi riskini yükseltir.' },
  { catA: 'TMP_SULFA', catB: 'VITAMIN_K_ANTAGONIST', risk: 'high', message: 'Kotrimoksazol warfarinin etkisini belirgin artırır; kanama riski yükselir.' },
  // --- Ergot / triptan / serotonerjik ---
  { catA: 'ERGOT', catB: 'TRIPTAN', risk: 'critical', message: 'Ergot türevi ve triptan birlikte (24 saat içinde) kullanılmamalıdır. Ciddi vazospazm riski taşır.' },
  { catA: 'ERGOT', catB: 'MACROLIDE', risk: 'critical', message: 'Makrolid antibiyotikler ergot düzeylerini artırarak ergotizme (uzuv iskemisi) neden olabilir.' },
  { catA: 'MAOI', catB: 'OPIOID', risk: 'critical', message: 'MAO inhibitörü ve opioid (özellikle tramadol/petidin) birlikte serotonin sendromu riski taşır. Kontrendikedir.' },
  { catA: 'MAOI', catB: 'OTHER_ANTIDEPRESSANT', risk: 'critical', message: 'MAO inhibitörü ve SNRI/diğer antidepresan birlikte serotonin sendromu riski taşır.' },
  { catA: 'MAOI', catB: 'TRIPTAN', risk: 'high', message: 'MAO inhibitörü triptan düzeylerini artırabilir; serotonin sendromu riski vardır.' },
  { catA: 'MAOI_A', catB: 'OPIOID', risk: 'high', message: 'Moklobemid ve serotonerjik opioid (tramadol) birlikte serotonin sendromu riskini artırır.' },
  { catA: 'MAOI_A', catB: 'OTHER_ANTIDEPRESSANT', risk: 'high', message: 'Moklobemid ve SNRI/diğer antidepresan birlikte serotonin sendromu riskini artırır.' },
  // ONC yüksek öncelikli listesi: triptan × MAO-A (moklobemid) ve MAO-B × opioid
  { catA: 'MAOI_A', catB: 'TRIPTAN', risk: 'high', message: 'Moklobemid triptan düzeylerini artırabilir; serotonin sendromu riski vardır. Birlikte kullanımdan kaçının.' },
  { catA: 'MAOI_B', catB: 'OPIOID', risk: 'high', message: 'MAO-B inhibitörü (selejilin/rasajilin) ve serotonerjik opioid (tramadol, petidin) birlikte serotonin sendromu riskini artırır; birlikte kullanımdan kaçının.' },
  { catA: 'MAOI_B', catB: 'SSRI', risk: 'high', message: 'MAO-B inhibitörü (selejilin/rasajilin) ve SSRI birlikte serotonin sendromu riskini artırır.' },
  { catA: 'MAOI_B', catB: 'OTHER_ANTIDEPRESSANT', risk: 'high', message: 'MAO-B inhibitörü ve SNRI birlikte serotonin sendromu riskini artırır.' },
  { catA: 'LINEZOLID', catB: 'SSRI', risk: 'critical', message: 'Linezolid zayıf MAO inhibitörüdür; SSRI ile birlikte serotonin sendromu riski taşır.' },
  { catA: 'LINEZOLID', catB: 'OTHER_ANTIDEPRESSANT', risk: 'high', message: 'Linezolid ve SNRI birlikte serotonin sendromu riskini artırır.' },
  { catA: 'LINEZOLID', catB: 'TCA', risk: 'high', message: 'Linezolid ve trisiklik antidepresan birlikte serotonin sendromu riskini artırır.' },
  // --- Kalsinörin inhibitörleri (siklosporin/takrolimus) ---
  { catA: 'CALCINEURIN', catB: 'STATIN', risk: 'high', message: 'Siklosporin/takrolimus statin düzeylerini artırarak rabdomiyoliz riskini yükseltir.' },
  { catA: 'CALCINEURIN', catB: 'MACROLIDE', risk: 'high', message: 'Makrolidler kalsinörin inhibitörü düzeylerini artırarak nefrotoksisite riskini yükseltir.' },
  { catA: 'CALCINEURIN', catB: 'ANTIFUNGAL_SYSTEMIC', risk: 'high', message: 'Sistemik antifungaller kalsinörin inhibitörü düzeylerini belirgin artırır. Düzey takibi şarttır.' },
  { catA: 'CALCINEURIN', catB: 'NSAID', risk: 'medium', message: 'NSAID ve kalsinörin inhibitörü birlikte böbrek fonksiyonunu bozabilir.' },
  { catA: 'CALCINEURIN', catB: 'COLCHICINE', risk: 'high', message: 'Kalsinörin inhibitörleri kolşisin toksisitesini artırır; kas ve kemik iliği toksisitesi görülebilir.' },
  { catA: 'CALCINEURIN', catB: 'AMINOGLYCOSIDE', risk: 'high', message: 'Aminoglikozid ve kalsinörin inhibitörü birlikte nefrotoksisite riskini belirgin artırır.' },
  // --- Kolşisin ---
  { catA: 'COLCHICINE', catB: 'MACROLIDE', risk: 'critical', message: 'Makrolidler (özellikle klaritromisin) kolşisin toksisitesini ölümcül düzeye çıkarabilir.' },
  { catA: 'COLCHICINE', catB: 'ANTIFUNGAL_SYSTEMIC', risk: 'high', message: 'Sistemik antifungaller kolşisin düzeylerini artırarak toksisiteye yol açabilir.' },
  { catA: 'COLCHICINE', catB: 'STATIN', risk: 'high', message: 'Kolşisin ve statin birlikte miyopati/rabdomiyoliz riskini artırır.' },
  { catA: 'COLCHICINE', catB: 'CALCIUM_CHANNEL_BLOCKER', risk: 'medium', message: 'Bazı kalsiyum kanal blokerleri (verapamil, diltiazem) kolşisin düzeylerini artırabilir.' },
  // --- Teofilin (ksantin) ---
  { catA: 'XANTHINE', catB: 'FLUOROQUINOLONE', risk: 'high', message: 'Fluorokinolonlar (özellikle siprofloksasin) teofilin düzeylerini toksik seviyeye çıkarabilir.' },
  { catA: 'XANTHINE', catB: 'MACROLIDE', risk: 'high', message: 'Makrolidler teofilin metabolizmasını yavaşlatarak toksisiteye neden olabilir.' },
  // --- Rifampisin (güçlü enzim indükleyici) ---
  { catA: 'RIFAMYCIN', catB: 'VITAMIN_K_ANTAGONIST', risk: 'high', message: 'Rifampisin warfarinin etkisini belirgin AZALTIR; tromboz riski doğar. INR yakın takip edilmelidir.' },
  { catA: 'RIFAMYCIN', catB: 'DIRECT_FACTOR_XA_INHIBITOR', risk: 'high', message: 'Rifampisin DOAK düzeylerini azaltarak antikoagülan etkiyi zayıflatır.' },
  { catA: 'RIFAMYCIN', catB: 'CALCINEURIN', risk: 'high', message: 'Rifampisin siklosporin/takrolimus düzeylerini düşürerek rejeksiyon riskine yol açabilir.' },
  { catA: 'RIFAMYCIN', catB: 'STATIN', risk: 'medium', message: 'Rifampisin statin düzeylerini azaltarak etkinliği düşürebilir.' },
  // --- Aminoglikozid ---
  { catA: 'AMINOGLYCOSIDE', catB: 'LOOP_DIURETIC', risk: 'high', message: 'Aminoglikozid ve kıvrım diüretiği birlikte ototoksisite (işitme kaybı) riskini artırır.' },
  { catA: 'AMINOGLYCOSIDE', catB: 'NSAID', risk: 'medium', message: 'NSAID aminoglikozid atılımını azaltarak nefrotoksisite riskini artırabilir.' },
  // --- Emilim/şelasyon etkileşimleri ---
  { catA: 'TETRACYCLINE', catB: 'CALCIUM_SUPPLEMENT', risk: 'medium', message: 'Kalsiyum tetrasiklin emilimini azaltır. En az 2-3 saat arayla alınmalıdır.' },
  { catA: 'TETRACYCLINE', catB: 'IRON_SUPPLEMENT', risk: 'medium', message: 'Demir tetrasiklin emilimini azaltır. En az 2-3 saat arayla alınmalıdır.' },
  { catA: 'TETRACYCLINE', catB: 'ANTACID', risk: 'medium', message: 'Antasitler tetrasiklin emilimini belirgin azaltır.' },
  { catA: 'FLUOROQUINOLONE', catB: 'CALCIUM_SUPPLEMENT', risk: 'medium', message: 'Kalsiyum fluorokinolon emilimini azaltır. En az 2 saat arayla alınmalıdır.' },
  { catA: 'FLUOROQUINOLONE', catB: 'IRON_SUPPLEMENT', risk: 'medium', message: 'Demir fluorokinolon emilimini azaltır. En az 2 saat arayla alınmalıdır.' },
  { catA: 'FLUOROQUINOLONE', catB: 'ANTACID', risk: 'medium', message: 'Antasitler fluorokinolon emilimini belirgin azaltır.' },
  { catA: 'BISPHOSPHONATE', catB: 'CALCIUM_SUPPLEMENT', risk: 'medium', message: 'Kalsiyum bifosfonat emilimini engeller. Aynı anda alınmamalıdır.' },
  { catA: 'BISPHOSPHONATE', catB: 'IRON_SUPPLEMENT', risk: 'medium', message: 'Demir bifosfonat emilimini engeller. Aynı anda alınmamalıdır.' },
  { catA: 'BISPHOSPHONATE', catB: 'ANTACID', risk: 'medium', message: 'Antasitler bifosfonat emilimini engeller.' },
  { catA: 'THYROID_HORMONE', catB: 'CALCIUM_SUPPLEMENT', risk: 'medium', message: 'Kalsiyum levotiroksin emilimini azaltır. En az 4 saat arayla alınmalıdır.' },
  { catA: 'THYROID_HORMONE', catB: 'IRON_SUPPLEMENT', risk: 'medium', message: 'Demir levotiroksin emilimini azaltır. En az 4 saat arayla alınmalıdır.' },
  { catA: 'THYROID_HORMONE', catB: 'ANTACID', risk: 'medium', message: 'Antasitler levotiroksin emilimini azaltabilir.' },
  // --- QT uzaması ---
  { catA: 'SETRON', catB: 'MACROLIDE', risk: 'high', message: 'Ondansetron benzeri ilaçlar ve makrolidler birlikte QT uzaması riskini artırır.' },
  { catA: 'SETRON', catB: 'FLUOROQUINOLONE', risk: 'high', message: 'Ondansetron benzeri ilaçlar ve fluorokinolonlar birlikte QT uzaması riskini artırır.' },
  { catA: 'SETRON', catB: 'ANTIARRHYTHMIC_III', risk: 'high', message: 'Ondansetron benzeri ilaçlar ve amiodaron birlikte ciddi QT uzaması riski taşır.' },
  { catA: 'FLUOROQUINOLONE', catB: 'ANTIPSYCHOTIC', risk: 'high', message: 'Fluorokinolon ve antipsikotik birlikte QT uzaması riskini artırır.' },
  { catA: 'ANTIARRHYTHMIC_III', catB: 'ANTIPSYCHOTIC', risk: 'high', message: 'Amiodaron ve antipsikotik birlikte ciddi QT uzaması ve aritmi riski taşır.' },
  { catA: 'PROKINETIC', catB: 'ANTIPSYCHOTIC', risk: 'high', message: 'Metoklopramid/domperidon ve antipsikotik birlikte ekstrapiramidal yan etki ve QT riski taşır.' },
  // --- Sedasyon / SSS depresyonu ---
  { catA: 'OPIOID', catB: 'Z_DRUG', risk: 'high', message: 'Opioid ve Z-ilacı (zolpidem vb.) birlikte solunum depresyonu ve aşırı sedasyon riskini artırır.' },
  { catA: 'BENZODIAZEPINE', catB: 'ANTIPSYCHOTIC', risk: 'medium', message: 'Benzodiazepin ve antipsikotik birlikte sedasyonu derinleştirebilir.' },
  // --- Antikoagülan/antiplatelet kombinasyonları ---
  { catA: 'ANTIPLATELET', catB: 'DIRECT_FACTOR_XA_INHIBITOR', risk: 'high', message: 'Antiplatelet ve DOAK birlikte kanama riskini belirgin artırır.' },
  { catA: 'ANTIPLATELET', catB: 'DIRECT_THROMBIN_INHIBITOR', risk: 'high', message: 'Antiplatelet ve direkt trombin inhibitörü birlikte kanama riskini artırır.' },
  { catA: 'ANTIPLATELET', catB: 'HEPARIN', risk: 'high', message: 'Antiplatelet ve heparin birlikte kanama riskini artırır.' },
  { catA: 'ANTIPLATELET', catB: 'ANTIPLATELET', risk: 'medium', message: 'İkili antiplatelet tedavi kanama riskini artırır; yalnızca doktor kontrolünde uygulanmalıdır.' },
  { catA: 'VITAMIN_K_ANTAGONIST', catB: 'DIRECT_FACTOR_XA_INHIBITOR', risk: 'critical', message: 'İki farklı antikoagülan (warfarin + DOAK) birlikte kullanılmaz. Ciddi kanama riski!' },
  { catA: 'VITAMIN_K_ANTAGONIST', catB: 'DIRECT_THROMBIN_INHIBITOR', risk: 'critical', message: 'İki farklı antikoagülan birlikte kullanılmaz. Ciddi kanama riski!' },
  { catA: 'VITAMIN_K_ANTAGONIST', catB: 'HEPARIN', risk: 'high', message: 'Warfarin ve heparin birlikte (geçiş tedavisi dışında) kanama riskini belirgin artırır.' },
  { catA: 'SSRI', catB: 'VITAMIN_K_ANTAGONIST', risk: 'medium', message: 'SSRI ilaçlar warfarinle birlikte kanama riskini artırabilir.' },
  { catA: 'SSRI', catB: 'DIRECT_FACTOR_XA_INHIBITOR', risk: 'medium', message: 'SSRI ilaçlar DOAK ile birlikte kanama riskini artırabilir.' },
  { catA: 'DIRECT_FACTOR_XA_INHIBITOR', catB: 'ANTIFUNGAL_SYSTEMIC', risk: 'high', message: 'Sistemik azol antifungaller DOAK düzeylerini artırarak kanama riskini yükseltir.' },
  { catA: 'DIRECT_FACTOR_XA_INHIBITOR', catB: 'MACROLIDE', risk: 'medium', message: 'Makrolidler DOAK düzeylerini artırabilir.' },
  // --- Kardiyak ---
  { catA: 'BETA_BLOCKER', catB: 'ANTIARRHYTHMIC_III', risk: 'high', message: 'Beta bloker ve amiodaron birlikte ciddi bradikardi ve AV blok riskini artırır.' },
  { catA: 'CARDIAC_GLYCOSIDE', catB: 'MACROLIDE', risk: 'high', message: 'Makrolidler digoksin düzeylerini artırarak toksisiteye neden olabilir.' },
  // --- Salisilatlar (aspirin N02BA): NSAID'lerle aynı kanama profili ---
  { catA: 'SALICYLATE', catB: 'NSAID', risk: 'high', message: 'Aspirin ve NSAID birlikte GI kanama riskini artırır; NSAID aspirinin antiplatelet etkisini de azaltabilir.' },
  { catA: 'SALICYLATE', catB: 'SALICYLATE', risk: 'high', message: 'İki salisilat birlikte doz aşımı ve GI kanama riskini artırır.' },
  { catA: 'SALICYLATE', catB: 'VITAMIN_K_ANTAGONIST', risk: 'critical', message: 'Aspirin ve warfarin birlikte ciddi kanama riskini çok artırır.' },
  { catA: 'SALICYLATE', catB: 'DIRECT_FACTOR_XA_INHIBITOR', risk: 'high', message: 'Aspirin ve DOAK birlikte kanama riskini belirgin artırır.' },
  { catA: 'SALICYLATE', catB: 'DIRECT_THROMBIN_INHIBITOR', risk: 'high', message: 'Aspirin ve direkt trombin inhibitörü birlikte kanama riskini artırır.' },
  { catA: 'SALICYLATE', catB: 'HEPARIN', risk: 'high', message: 'Aspirin ve heparin birlikte kanama riskini artırır.' },
  { catA: 'SALICYLATE', catB: 'ANTIPLATELET', risk: 'medium', message: 'Aspirin ve antiplatelet birlikte kanama riskini artırır; bazı durumlarda bilinçli ikili tedavi olabilir.' },
  { catA: 'SALICYLATE', catB: 'SSRI', risk: 'medium', message: 'SSRI ve aspirin birlikte GI kanama riskini artırır.' },
  { catA: 'SALICYLATE', catB: 'CORTICOSTEROID', risk: 'high', message: 'Aspirin ve kortikosteroid birlikte GI kanama ve ülser riskini artırır.' },
  // --- Lityum (dar terapötik pencere; atılımı böbrekten) ---
  { catA: 'LITHIUM', catB: 'NSAID', risk: 'high', message: 'NSAID ilaçlar lityumun böbrekten atılımını azaltarak toksik düzeye çıkarabilir.' },
  { catA: 'LITHIUM', catB: 'SALICYLATE', risk: 'medium', message: 'Yüksek doz salisilatlar lityum düzeylerini etkileyebilir.' },
  { catA: 'LITHIUM', catB: 'THIAZIDE_DIURETIC', risk: 'high', message: 'Tiazid diüretikler lityum atılımını azaltarak toksisiteye yol açabilir. Düzey takibi şarttır.' },
  { catA: 'LITHIUM', catB: 'LOOP_DIURETIC', risk: 'medium', message: 'Kıvrım diüretikleri lityum düzeylerini etkileyebilir; izlem önerilir.' },
  { catA: 'LITHIUM', catB: 'ACE_INHIBITOR', risk: 'high', message: 'ACE inhibitörleri lityum düzeylerini artırarak toksisiteye neden olabilir.' },
  { catA: 'LITHIUM', catB: 'ACE_INHIBITOR_COMBO', risk: 'high', message: 'ACE inhibitörleri lityum düzeylerini artırarak toksisiteye neden olabilir.' },
  { catA: 'LITHIUM', catB: 'ARB', risk: 'high', message: 'ARB ilaçlar lityum düzeylerini artırabilir. Düzey takibi gereklidir.' },
  { catA: 'LITHIUM', catB: 'ARB_COMBO', risk: 'high', message: 'ARB ilaçlar lityum düzeylerini artırabilir. Düzey takibi gereklidir.' },
  { catA: 'LITHIUM', catB: 'SSRI', risk: 'medium', message: 'Lityum ve SSRI birlikte serotonerjik etkileri artırabilir; nörolojik belirtiler izlenmelidir.' },
  // --- Metotreksat ---
  { catA: 'METHOTREXATE', catB: 'NSAID', risk: 'high', message: 'NSAID ilaçlar metotreksat atılımını azaltarak kemik iliği ve böbrek toksisitesini artırır.' },
  { catA: 'METHOTREXATE', catB: 'SALICYLATE', risk: 'high', message: 'Salisilatlar metotreksat atılımını azaltarak toksisiteyi artırır.' },
  { catA: 'METHOTREXATE', catB: 'TMP_SULFA', risk: 'critical', message: 'Kotrimoksazol/trimetoprim metotreksat toksisitesini ciddi artırır; pansitopeni riski. Bu kombinasyondan kaçının.' },
  { catA: 'METHOTREXATE', catB: 'PPI', risk: 'medium', message: 'PPI ilaçlar (özellikle yüksek doz metotreksatta) atılımı azaltabilir.' },
  // --- İyotlu kontrast madde ---
  { catA: 'IODINATED_CONTRAST', catB: 'BIGUANIDE', risk: 'high', message: 'İyotlu kontrast madde sonrası metformine ara verilmesi gerekebilir; laktik asidoz riski. Görüntüleme öncesi doktorunuzu bilgilendirin.' },
  // --- Serotonerjik antidepresan kombinasyonları ---
  // Aynı sınıftan iki antidepresan: additif serotonin sendromu riski; motorda
  // "aynı ATC grubu" info dalına düşmeden önce bu kurallar yakalar.
  { catA: 'SSRI', catB: 'SSRI', risk: 'high', message: 'İki farklı SSRI birlikte kullanımı serotonin sendromu riskini artırır; genellikle birlikte kullanılmaz, mutlaka doktorunuza danışın.' },
  { catA: 'SNRI', catB: 'SNRI', risk: 'high', message: 'İki farklı SNRI birlikte kullanımı serotonin sendromu riskini artırır; genellikle birlikte kullanılmaz, mutlaka doktorunuza danışın.' },
  { catA: 'TCA', catB: 'TCA', risk: 'high', message: 'İki trisiklik antidepresan birlikte kullanımı yan etkileri (kardiyak, antikolinerjik) ve serotonin sendromu riskini artırır.' },
  { catA: 'SSRI', catB: 'SNRI', risk: 'high', message: 'İki serotonerjik antidepresan (SSRI + SNRI) birlikte serotonin sendromu riskini artırır.' },
  { catA: 'SNRI', catB: 'MAOI', risk: 'critical', message: 'SNRI ve MAO inhibitörü birlikte kullanımı kontrendikedir; serotonin sendromu riski.' },
  { catA: 'SNRI', catB: 'MAOI_A', risk: 'critical', message: 'SNRI ve MAO-A inhibitörü birlikte serotonin sendromu riski taşır.' },
  { catA: 'SNRI', catB: 'TRIPTAN', risk: 'high', message: 'SNRI ve triptan birlikte serotonin sendromu riskini artırır.' },
  { catA: 'SNRI', catB: 'LINEZOLID', risk: 'high', message: 'Linezolid ve SNRI birlikte serotonin sendromu riskini artırır.' },
  // --- Bitkiseller (emniyet ağı: adla eşleşmeyen ürün/il. formları için) ---
  // Ginkgo trombosit işlevini baskılayabilir → tüm kanama-riskli sınıflarla additif.
  { catA: 'HERBAL_GINKGO', catB: 'VITAMIN_K_ANTAGONIST', risk: 'high', message: 'Ginkgo biloba içeren ürünler warfarinle birlikte kanama riskini artırabilir; trombosit işlevi baskılanır.' },
  { catA: 'HERBAL_GINKGO', catB: 'ANTIPLATELET', risk: 'high', message: 'Ginkgo biloba içeren ürünler antiplatelet ilaçlarla birlikte kanama riskini artırabilir.' },
  { catA: 'HERBAL_GINKGO', catB: 'SALICYLATE', risk: 'high', message: 'Ginkgo biloba içeren ürünler aspirinle birlikte kanama riskini artırabilir.' },
  { catA: 'HERBAL_GINKGO', catB: 'DIRECT_FACTOR_XA_INHIBITOR', risk: 'medium', message: 'Ginkgo biloba içeren ürünler DOAK ile birlikte kanama riskini artırabilir.' },
  { catA: 'HERBAL_GINKGO', catB: 'DIRECT_THROMBIN_INHIBITOR', risk: 'medium', message: 'Ginkgo biloba içeren ürünler direkt trombin inhibitörüyle birlikte kanama riskini artırabilir.' },
  { catA: 'HERBAL_GINKGO', catB: 'HEPARIN', risk: 'medium', message: 'Ginkgo biloba içeren ürünler heparinle birlikte kanama riskini artırabilir.' },
  { catA: 'HERBAL_GINKGO', catB: 'NSAID', risk: 'medium', message: 'Ginkgo biloba içeren ürünler NSAID ilaçlarla birlikte kanama eğilimini artırabilir.' },
  { catA: 'HERBAL_GINKGO', catB: 'SSRI', risk: 'medium', message: 'Ginkgo biloba, SSRI ilaçların trombosit etkisine eklenerek kanama riskini artırabilir.' },
  // Sedatif bitkiseller (valerian, pasiflora): SSS baskılayıcılarla additif sedasyon.
  { catA: 'SEDATIVE_HERBAL', catB: 'BENZODIAZEPINE', risk: 'medium', message: 'Sedatif bitkisel ürünler (kediotu, pasiflora) benzodiazepinlerle birlikte sedasyonu derinleştirebilir.' },
  { catA: 'SEDATIVE_HERBAL', catB: 'Z_DRUG', risk: 'medium', message: 'Sedatif bitkisel ürünler uyku ilaçlarıyla birlikte sedasyonu derinleştirebilir.' },
  { catA: 'SEDATIVE_HERBAL', catB: 'OPIOID', risk: 'medium', message: 'Sedatif bitkisel ürünler opioidlerle birlikte sedasyon ve solunum depresyonu riskini artırabilir.' },
  // Stimülan laksatifler (senna): kronik kullanımda hipokalemi → digoksin/diüretik.
  { catA: 'STIMULANT_LAXATIVE', catB: 'CARDIAC_GLYCOSIDE', risk: 'medium', message: 'Uyarıcı laksatiflerin (sinameki) kronik kullanımı hipokalemiye yol açarak digoksin toksisitesi riskini artırır.' },
  { catA: 'STIMULANT_LAXATIVE', catB: 'LOOP_DIURETIC', risk: 'low', message: 'Uyarıcı laksatif ve diüretik birlikte potasyum kaybını artırabilir.' },
  { catA: 'STIMULANT_LAXATIVE', catB: 'THIAZIDE_DIURETIC', risk: 'low', message: 'Uyarıcı laksatif ve diüretik birlikte potasyum kaybını artırabilir.' },
];

// Çok-kategorili ürünlerde (kombinasyonlar) birden çok kural eşleşebilir;
// İLK eşleşen değil, EN YÜKSEK riskli olan raporlanır (kolşisin × [KKB+statin]
// kombosunda medium'un high'ı maskelemesini önler).
const CATEGORY_RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4, info: 5 };

export function checkCategoryInteraction(cats1, cats2) {
  let best = null;
  for (const cat1 of cats1) {
    for (const cat2 of cats2) {
      for (const rule of CATEGORY_INTERACTIONS) {
        if ((cat1 === rule.catA && cat2 === rule.catB) || (cat1 === rule.catB && cat2 === rule.catA)) {
          if (!best || CATEGORY_RISK_ORDER[rule.risk] < CATEGORY_RISK_ORDER[best.risk]) {
            best = { ...rule, matchedCat1: cat1, matchedCat2: cat2 };
          }
        }
      }
    }
  }
  return best;
}
