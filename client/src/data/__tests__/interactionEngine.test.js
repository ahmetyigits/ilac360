import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setDrugsForTest } from '../drugStore.js';
import { setInteractionsForTest, setFoodDataForTest, analyzeInteractions, analyzeWithEnrichment } from '../interactionEngine.js';
import foodItems from '../../../../data/food-items.json';
import drugWarnings from '../../../../data/drug-warnings.json';
import interactions from '../../../../data/interactions.json';
import synonyms from '../../../../data/ingredient-synonyms.json';
import adjuvants from '../../../../data/adjuvant-components.json';
import componentClasses from '../../../../data/component-classes.json';

// Gerçek kural seti + gerçek sinonim tablosu, sabit ilaç fikstürleriyle.
const FIXTURE_DRUGS = [
  { ID: '1', Product_Name: 'COUMADIN 5 MG TABLET', Active_Ingredient: 'Warfarin Sodyum', ATC_code: 'B01AA03' },
  { ID: '2', Product_Name: 'ASPIRIN 100 MG TABLET', Active_Ingredient: 'Asetilsalisilik Asit', ATC_code: 'N02BA01' },
  { ID: '3', Product_Name: 'PAROL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  { ID: '4', Product_Name: 'TAMOL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  { ID: '5', Product_Name: 'VIAGRA 50 MG TABLET', Active_Ingredient: 'Sildenafil Sitrat', ATC_code: 'G04BE03' },
  { ID: '6', Product_Name: 'TRAVAZOL KREM', Active_Ingredient: 'İzokonazol Nitrat + Diflukortolon Valerat', ATC_code: 'D01AC44' },
  { ID: '7', Product_Name: 'MONOKET 20 MG TABLET', Active_Ingredient: 'İzosorbid Mononitrat', ATC_code: 'C01DA14' },
  { ID: '8', Product_Name: 'GRIPIN TABLET', Active_Ingredient: 'Parasetamol, asetilsalisilik asit, kafein', ATC_code: 'N02BE51' },
  { ID: '9', Product_Name: 'PREDNOL 16 MG TABLET', Active_Ingredient: 'Metilprednizolon', ATC_code: 'H02AB04' },
  { ID: '10', Product_Name: 'DELTACORTRIL 5 MG TABLET', Active_Ingredient: 'Prednizolon', ATC_code: 'H02AB06' },
  { ID: '11', Product_Name: 'LARGOPEN 1 G TABLET', Active_Ingredient: 'Amoksisilin', ATC_code: 'J01CA04' },
  { ID: '12', Product_Name: 'CIPRO 500 MG TABLET', Active_Ingredient: 'Siprofloksasin', ATC_code: 'J01MA02' },
  { ID: '13', Product_Name: 'LUSTRAL 50 MG TABLET', Active_Ingredient: 'Sertralin Hidroklorür', ATC_code: 'N06AB06' },
  { ID: '14', Product_Name: 'CONTRAMAL 50 MG KAPSUL', Active_Ingredient: 'Tramadol Hidroklorür', ATC_code: 'N02AX02' },
  { ID: '15', Product_Name: 'XVITAMIN TABLET', Active_Ingredient: 'Kolekalsiferol', ATC_code: 'A11CC05' },
  { ID: '16', Product_Name: 'DOLOREX %1 JEL (50 G)', Active_Ingredient: 'Diklofenak Potasyum', ATC_code: 'M02AA15' },
  { ID: '17', Product_Name: 'DOLOREX 50 MG KAPLI TABLET', Active_Ingredient: 'Diklofenak Potasyum', ATC_code: 'M01AB05' },
  { ID: '18', Product_Name: 'NITRODERM TTS 5 TRANSDERMAL FLASTER', Active_Ingredient: 'Nitrogliserin', ATC_code: 'C01DA02' },
  { ID: '19', Product_Name: 'KAFEDOL TABLET', Active_Ingredient: 'Askorbik Asit, Kafein', ATC_code: 'N06BC51' },
  { ID: '20', Product_Name: 'KAFEVIT TABLET', Active_Ingredient: 'Tiamin, Kafein', ATC_code: 'A11DA51' },
  { ID: '21', Product_Name: 'LITHURIL 300 MG KAPSUL', Active_Ingredient: 'Lityum Karbonat', ATC_code: 'N05AN01' },
  { ID: '22', Product_Name: 'ESIDREX 25 MG TABLET', Active_Ingredient: 'Hidroklorotiyazid', ATC_code: 'C03AA03' },
  { ID: '23', Product_Name: 'EFEXOR 75 MG KAPSUL', Active_Ingredient: 'Venlafaksin Hidroklorür', ATC_code: 'N06AX16' },
  { ID: '24', Product_Name: 'CIPRALEX 10 MG TABLET', Active_Ingredient: 'Essitalopram', ATC_code: 'N06AB10' },
  { ID: '25', Product_Name: 'AVELOX 400 MG TABLET', Active_Ingredient: 'Moksifloksasin', ATC_code: 'J01MA14' },
  { ID: '26', Product_Name: 'CORDARONE 200 MG TABLET', Active_Ingredient: 'Amiodaron Hidroklorür', ATC_code: 'C01BD01' },
  { ID: '27', Product_Name: 'ZOFRAN 8 MG TABLET', Active_Ingredient: 'Ondansetron', ATC_code: 'A04AA01' },
  { ID: '28', Product_Name: 'GARDAVAX ENJEKSIYON', Active_Ingredient: 'Papillomavirüs Aşısı Tip 6, 11, 16, 18', ATC_code: 'J07BM01' },
  { ID: '29', Product_Name: 'PNOMOVAX ENJEKSIYON', Active_Ingredient: 'Pnömokok Konjuge Aşı Serotip 4, 9, 11, 16, 18', ATC_code: 'J07AL02' },
  // Ad çakışması fikstürü: aynı görünen ad, farklı etken madde (id 30/31) —
  // zenginleştirmenin ada değil id'ye göre çözdüğünü doğrular.
  { ID: '30', Product_Name: 'DUPLIK TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  { ID: '31', Product_Name: 'DUPLIK TABLET', Active_Ingredient: 'İbuprofen', ATC_code: 'M01AE01' },
  // Bitkisel fikstürler — etken madde stringleri DATASET'TEKİ GERÇEK yazımlar
  // (fragmanlı varyantlar, "gingko" yazım hatası, ATC "0" kombinasyonlar dahil).
  { ID: '32', Product_Name: 'TEBOKAN FORT 40 MG FILM TABLET', Active_Ingredient: 'ginkgo biloba yapraklari kuru ekstresi', ATC_code: 'N06DX02' },
  { ID: '33', Product_Name: 'GINKOREM 10/80 MG EFERVESAN TABLET', Active_Ingredient: 'donepezil hcl ve ginkgo biloba kuru ekstresi', ATC_code: '0' },
  { ID: '34', Product_Name: 'BILOKAN SUPRA FILM TABLET', Active_Ingredient: 'gingko biloba', ATC_code: 'N06DX02' },
  { ID: '35', Product_Name: 'NOROBALANS ELIXIR', Active_Ingredient: 'tent. de valeriane, tent. de pasiflora, tent. de grateagus', ATC_code: 'N05CM' },
  { ID: '36', Product_Name: 'DIAZEM 5 MG KAPSUL', Active_Ingredient: 'Diazepam', ATC_code: 'N05BA01' },
  { ID: '37', Product_Name: 'PROSTAGOOD MONO KAPSUL', Active_Ingredient: 'saw palmetto ekstresi', ATC_code: 'G04CX02' },
  { ID: '38', Product_Name: 'ELIQUIS 5 MG TABLET', Active_Ingredient: 'Apiksaban', ATC_code: 'B01AF02' },
  { ID: '39', Product_Name: 'PURSENNID DRAJE', Active_Ingredient: 'senna glycosides', ATC_code: 'A06AB06' },
  { ID: '40', Product_Name: 'DIGOXIN 0.25 MG TABLET', Active_Ingredient: 'Digoksin', ATC_code: 'C01AA05' },
];

// Bileşen→ATC geri doldurma haritası (gerçek build çıktısının küçük örneği):
// diklofenak'ın en yaygın ATC'si sistemik M01AB05'tir — topikal bastırma
// testleri tam da bu enjeksiyonun jel formunda atlanmasını doğrular.
const COMPONENT_ATC = {
  'diklofenak': 'M01AB05',
  'warfarin': 'B01AA03',
  // Gerçek build çıktısının örnekleri: ATC'si "0" ürünlerde motor bileşen
  // başına bu haritadan kategori türetir (kanonik çift testleri bunu kullanır).
  'deksketoprofen': 'M01AE17',
  'glimepirid': 'A10BB12',
  'indometazin': 'M01AB01',
  'eritromisin': 'J01FA01',
  'psödoefedrin': 'R01BA02',
};

function analyze(...names) {
  const { interactions: results } = analyzeInteractions(names);
  return results;
}

beforeAll(() => {
  setDrugsForTest(FIXTURE_DRUGS);
  setInteractionsForTest(interactions, synonyms, COMPONENT_ATC, adjuvants, componentClasses);
  // Gerçek katalog + gerçek foodKeys etiketli kayıtlar (kürasyon bozulursa test de kırılır)
  setFoodDataForTest(foodItems, drugWarnings);
});

describe('bilinen kural eşleşmesi', () => {
  it('warfarin + aspirin → critical (sinonim: aspirin → asetilsalisilik asit)', () => {
    const [r] = analyze('COUMADIN 5 MG TABLET', 'ASPIRIN 100 MG TABLET');
    expect(r.risk).toBe('critical');
    expect(r.message).toContain('kanama');
  });

  it('tuz formu kuralı engellemez: Warfarin Sodyum da eşleşir', () => {
    const [r] = analyze('COUMADIN 5 MG TABLET', 'PAROL 500 MG TABLET');
    expect(r.risk).toBe('medium');
  });

  it('sildenafil + izosorbid mononitrat → critical', () => {
    const [r] = analyze('VIAGRA 50 MG TABLET', 'MONOKET 20 MG TABLET');
    expect(r.risk).toBe('critical');
    expect(r.message).toContain('hipotansiyon');
  });

  it('kombine ilaç bileşen bazında eşleşir (Gripin içindeki ASA × warfarin)', () => {
    const [r] = analyze('GRIPIN TABLET', 'COUMADIN 5 MG TABLET');
    expect(r.risk).toBe('critical');
  });
});

describe('yanlış pozitif regresyonları', () => {
  it('REGRESYON: sildenafil + izokonazol nitrat (krem) critical DEĞİL', () => {
    // Eski substring eşleşmesi "nitrat" kuralını topikal antifungal tuzuyla ateşliyordu.
    const [r] = analyze('VIAGRA 50 MG TABLET', 'TRAVAZOL KREM');
    expect(r.risk).not.toBe('critical');
    expect(r.risk).not.toBe('high');
  });

  it('REGRESYON: ortak >4 harf substring "doz aşımı" uyarısı üretmez (metilprednizolon × prednizolon)', () => {
    // Eski kod "metilprednizolon".includes("prednizolon") nedeniyle high veriyordu.
    const [r] = analyze('PREDNOL 16 MG TABLET', 'DELTACORTRIL 5 MG TABLET');
    expect(r.risk).not.toBe('high');
    expect(r.risk).not.toBe('critical');
    // Aynı ATC alt grubu (H02AB) sadece bilgilendirme olmalı.
    expect(r.risk).toBe('info');
  });

  it('aynı 3 karakterlik terapötik grup (J01 antibiyotikler) uyarı üretmez', () => {
    const [r] = analyze('LARGOPEN 1 G TABLET', 'CIPRO 500 MG TABLET');
    expect(r.risk).toBe('unknown');
  });
});

describe('ortak etken madde tespiti', () => {
  it('birebir aynı etken madde → critical doz aşımı uyarısı', () => {
    const [r] = analyze('PAROL 500 MG TABLET', 'TAMOL 500 MG TABLET');
    expect(r.risk).toBe('critical');
    expect(r.message).toContain('aynı etkin madde');
  });

  it('kısmi bileşen kesişimi → high, ortak bileşen adıyla', () => {
    const [r] = analyze('PAROL 500 MG TABLET', 'GRIPIN TABLET');
    expect(r.risk).toBe('high');
    expect(r.message).toContain('parasetamol');
  });
});

describe('kategori (ATC sınıfı) kuralları', () => {
  it('SSRI + tramadol bilinen kuraldan yakalanır', () => {
    const [r] = analyze('LUSTRAL 50 MG TABLET', 'CONTRAMAL 50 MG KAPSUL');
    expect(['high', 'medium']).toContain(r.risk);
    expect(r.message).toContain('serotonin');
  });
});

describe('topikal form farkındalığı', () => {
  it('REGRESYON: diklofenak JEL + warfarin kritik uyarı ÜRETMEZ (topikal bastırma)', () => {
    const [r] = analyze('DOLOREX %1 JEL (50 G)', 'COUMADIN 5 MG TABLET');
    expect(r.risk).not.toBe('critical');
    expect(r.risk).not.toBe('high');
    // Sessizce yutulmaz: düşük seviyeli topikal bilgilendirmesi verilir.
    expect(r.risk).toBe('low');
    expect(r.message).toContain('topikal');
  });

  it('diklofenak TABLET + warfarin hâlâ kritik verir (bastırma sistemiği etkilemez)', () => {
    const [r] = analyze('DOLOREX 50 MG KAPLI TABLET', 'COUMADIN 5 MG TABLET');
    expect(r.risk).toBe('critical');
  });

  it('transdermal nitrogliserin + sildenafil hâlâ kritik (bant sistemiktir, bastırılmaz)', () => {
    const [r] = analyze('NITRODERM TTS 5 TRANSDERMAL FLASTER', 'VIAGRA 50 MG TABLET');
    expect(r.risk).toBe('critical');
  });

  it('aynı etken madde jel + tablet → critical değil, medium + topikal notu', () => {
    const [r] = analyze('DOLOREX %1 JEL (50 G)', 'DOLOREX 50 MG KAPLI TABLET');
    expect(r.risk).toBe('medium');
    expect(r.message).toContain('topikal');
  });
});

describe('adjuvan bileşen hariç tutma', () => {
  it('yalnızca kafein paylaşan iki ürün doz aşımı uyarısı ÜRETMEZ; düşük bilgilendirme verir', () => {
    const [r] = analyze('KAFEDOL TABLET', 'KAFEVIT TABLET');
    expect(r.risk).toBe('low');
    expect(r.message).toContain('yardımcı');
  });

  it('adjuvan paylaşımı güçlü kuralları engellemez (Gripin ASA × warfarin kritik kalır)', () => {
    // Gripin (parasetamol+ASA+kafein) × Coumadin: kafein adjuvan ama
    // warfarin×aspirin kuralı yine de tetiklenmeli.
    const [r] = analyze('GRIPIN TABLET', 'COUMADIN 5 MG TABLET');
    expect(r.risk).toBe('critical');
  });
});

describe('yeni sınıf kuralları (lityum, SNRI)', () => {
  it('lityum + tiazid diüretik → high (atılım azalması)', () => {
    const [r] = analyze('LITHURIL 300 MG KAPSUL', 'ESIDREX 25 MG TABLET');
    expect(r.risk).toBe('high');
    expect(r.message).toContain('ityum');
  });

  it('lityum ANTIPSYCHOTIC sayılmaz (antipsikotik×antipsikotik kuralı tetiklenmez)', () => {
    // Haloperidol N05AD? — fikstürde antipsikotik yok; lityum + parasetamol
    // antipsikotik kuralı ÜRETMEMELİ (unknown/info kabul).
    const [r] = analyze('LITHURIL 300 MG KAPSUL', 'PAROL 500 MG TABLET');
    expect(['unknown', 'info', 'medium']).toContain(r.risk);
    expect(r.message).not.toContain('antipsikotik');
  });

  it('SSRI + SNRI → high serotonin sendromu (SNRI etiketi component-classes\'tan)', () => {
    const [r] = analyze('CIPRALEX 10 MG TABLET', 'EFEXOR 75 MG KAPSUL');
    expect(r.risk).toBe('high');
    expect(r.message).toContain('serotonin');
  });
});

describe('additive-QT modeli', () => {
  it('iki bilinen QT ajanı (moksifloksasin + amiodaron) → yüksek risk, spesifik kural yoksa QT uyarısı', () => {
    const [r] = analyze('AVELOX 400 MG TABLET', 'CORDARONE 200 MG TABLET');
    // Spesifik sınıf kuralı (FLUOROQUINOLONE×ANTIARRHYTHMIC_III critical) ÖNCE gelir
    expect(['critical', 'high']).toContain(r.risk);
  });

  it('QT çifti spesifik kuralla kapsanmıyorsa QT modeli devreye girer (ondansetron + essitalopram)', () => {
    const [r] = analyze('ZOFRAN 8 MG TABLET', 'CIPRALEX 10 MG TABLET');
    expect(['high', 'medium']).toContain(r.risk);
    expect(r.message).toContain('QT');
  });

  it('3+ QT ajanında risk bir seviye yükselir ve mesaj toplam sayıyı söyler', () => {
    const results = analyze('ZOFRAN 8 MG TABLET', 'CIPRALEX 10 MG TABLET', 'AVELOX 400 MG TABLET');
    const qtResults = results.filter((r) => r.message.includes('QT'));
    expect(qtResults.length).toBeGreaterThan(0);
    expect(qtResults.some((r) => r.message.includes('3 ilaç'))).toBe(true);
  });
});

describe('bilinmeyen çiftler ve sıralama', () => {
  it('kural bulunamayan çift → unknown (low/yeşil değil)', () => {
    const [r] = analyze('PAROL 500 MG TABLET', 'XVITAMIN TABLET');
    expect(r.risk).toBe('unknown');
    expect(r.message).toContain('anlamına gelmez');
  });

  it('sonuçlar risk şiddetine göre sıralanır; unknown/info sonda', () => {
    const results = analyze(
      'COUMADIN 5 MG TABLET',
      'ASPIRIN 100 MG TABLET',
      'XVITAMIN TABLET'
    );
    expect(results[0].risk).toBe('critical');
    const last = results[results.length - 1].risk;
    expect(['unknown', 'info']).toContain(last);
  });

  it('bilinmeyen ilaç adı unknownDrugs listesine düşer', () => {
    const { unknownDrugs } = analyzeInteractions(['BÖYLE BİR İLAÇ YOK 123']);
    expect(unknownDrugs).toContain('BÖYLE BİR İLAÇ YOK 123');
  });
});

describe('finalizasyon regresyonları', () => {
  it('sayısal aşı serotipleri ortak bileşen sayılmaz (iki aşı → doz aşımı YOK)', () => {
    // "11, 16, 18" serotip numaraları bileşen sanılırsa iki farklı aşı
    // "ortak etkin madde — doz aşımı" high/critical üretirdi.
    const [r] = analyze('GARDAVAX ENJEKSIYON', 'PNOMOVAX ENJEKSIYON');
    expect(r.risk).not.toBe('critical');
    expect(r.risk).not.toBe('high');
    expect(r.risk).toBe('unknown');
  });

  it('geçersiz id ada DÜŞMEZ: ilaç unknownDrugs listesine girer', () => {
    // Bayat ?d= linki: id yok, ad kısa. Eski substring fallback "PAROL"u
    // ilk içeren ürüne sessizce çözüp yanlış analiz üretiyordu.
    const { unknownDrugs } = analyzeInteractions([{ id: '99999', name: 'PAROL' }]);
    expect(unknownDrugs).toContain('PAROL');
  });

  it('yalnız kısmi ad (substring) artık ürüne çözülmez', () => {
    const { unknownDrugs } = analyzeInteractions(['PAROL']);
    expect(unknownDrugs).toContain('PAROL');
  });

  it('aynı ilaç iki kez eklenirse teklenir; sahte "doz aşımı" üretmez', () => {
    const { interactions: results } = analyzeInteractions([
      { id: '3', name: 'PAROL 500 MG TABLET' },
      { id: '3', name: 'PAROL 500 MG TABLET' },
    ]);
    expect(results).toHaveLength(0);
  });

  it('aynı QT ajanı iki kez sayılmaz (3-ajan yükseltmesi yanlış tetiklenmez)', () => {
    const results = analyze('ZOFRAN 8 MG TABLET', 'ZOFRAN 8 MG TABLET', 'CIPRALEX 10 MG TABLET');
    // Dedup sonrası 2 ilaç kalır → tek çift, iki-ajan QT mesajı.
    expect(results).toHaveLength(1);
    expect(results[0].message).not.toContain('3 ilaç');
  });

  it('iki farklı SSRI → high serotonin sendromu (info değil)', () => {
    const [r] = analyze('CIPRALEX 10 MG TABLET', 'LUSTRAL 50 MG TABLET');
    expect(r.risk).toBe('high');
    expect(r.message).toContain('serotonin');
  });

  it('zenginleştirme ad çakışmasında id ile DOĞRU ürünü çözer', () => {
    // 'DUPLIK TABLET' adı iki üründe var (id 30 parasetamol, id 31 ibuprofen);
    // ada göre çözüm son kaydı (ibuprofen) verirdi.
    const { interactions: enriched } = analyzeWithEnrichment([
      { id: '30', name: 'DUPLIK TABLET' },
      { id: '5', name: 'VIAGRA 50 MG TABLET' },
    ]);
    expect(enriched[0].ingredientA).toBe('Parasetamol');
  });
});

describe('İlaç-Besin sorgusu', () => {
  const food = (key, name) => ({ food: key, name });

  it('warfarin + K vitamini → high besin kartı (W-0020, ingredient yolu)', () => {
    const results = analyze({ id: '1', name: 'COUMADIN 5 MG TABLET' }, food('k-vitamini', 'K vitamini'));
    expect(results).toHaveLength(1);
    expect(results[0].risk).toBe('high');
    expect(results[0].ruleId).toBe('W-0020');
    expect(results[0].food2).toBe('k-vitamini');
    expect(results[0].id2).toBeNull();
    expect(results[0].source).toBeTruthy();
  });

  it('warfarin + alkol → yeni W-0243 kartı; uyuyan R-0005 çift kuralı TETİKLENMEZ', () => {
    const results = analyze({ id: '1', name: 'COUMADIN 5 MG TABLET' }, food('alkol', 'Alkol'));
    expect(results[0].ruleId).toBe('W-0243');
    expect(results[0].risk).toBe('high');
  });

  it('siprofloksasin + kafein → medium (W-0248)', () => {
    const results = analyze({ id: '12', name: 'CIPRO 500 MG TABLET' }, food('kafein', 'Kafein'));
    expect(results[0].risk).toBe('medium');
    expect(results[0].ruleId).toBe('W-0248');
  });

  it('parasetamol + alkol → medium (W-0116, düzenli alkol uyarısı)', () => {
    const results = analyze({ id: '3', name: 'PAROL 500 MG TABLET' }, food('alkol', 'Alkol'));
    expect(results[0].ruleId).toBe('W-0116');
  });

  it('topikal NSAİİ jel + alkol → systemicOnly bastırılır, katlanabilir unknown kartı', () => {
    const results = analyze({ id: '16', name: 'DOLOREX %1 JEL (50 G)' }, food('alkol', 'Alkol'));
    expect(results).toHaveLength(1);
    expect(results[0].risk).toBe('unknown');
  });

  it('eşleşme olmayan ilaç + besin → dürüst unknown kartı (güvenli DEĞİL)', () => {
    const results = analyze({ id: '15', name: 'XVITAMIN TABLET' }, food('greyfurt', 'Greyfurt'));
    expect(results[0].risk).toBe('unknown');
    expect(results[0].message).toContain('besin etkileşimi');
  });

  it('besin×besin kart üretmez; besinler unknownDrugs listesine düşmez', () => {
    const { interactions: results, unknownDrugs } = analyzeInteractions([
      food('greyfurt', 'Greyfurt'), food('alkol', 'Alkol'),
    ]);
    expect(results).toHaveLength(0);
    expect(unknownDrugs).toHaveLength(0);
  });

  it('katalogda olmayan besin anahtarı sessizce atılır', () => {
    const { interactions: results, unknownDrugs } = analyzeInteractions([
      { id: '1', name: 'COUMADIN 5 MG TABLET' }, food('olmayan-besin', 'X'),
    ]);
    expect(results).toHaveLength(0);
    expect(unknownDrugs).toHaveLength(0);
  });

  it('aynı besin iki kez eklense de tek sayılır', () => {
    const results = analyze(
      { id: '1', name: 'COUMADIN 5 MG TABLET' },
      food('k-vitamini', 'K vitamini'), food('k-vitamini', 'K vitamini'),
    );
    expect(results).toHaveLength(1);
  });

  it('besin varken ilaç×ilaç sonuçları değişmez', () => {
    const only = analyze('COUMADIN 5 MG TABLET', 'ASPIRIN 100 MG TABLET');
    const withFood = analyze('COUMADIN 5 MG TABLET', 'ASPIRIN 100 MG TABLET', food('kafein', 'Kafein'))
      .filter((r) => !r.food1 && !r.food2);
    expect(withFood).toEqual(only);
  });

  it('zenginleştirme besin tarafını ada göre ÇÖZMEZ (ingredient/atc null)', () => {
    const { interactions: enriched } = analyzeWithEnrichment([
      { id: '1', name: 'COUMADIN 5 MG TABLET' }, food('k-vitamini', 'K vitamini'),
    ]);
    expect(enriched[0].ingredientA).toBe('Warfarin Sodyum');
    expect(enriched[0].ingredientB).toBeNull();
    expect(enriched[0].atcB).toBeNull();
  });
});

describe('İlaç-Besin kanonik çiftler — bu liste HER ZAMAN uyarı vermeli', () => {
  // "sertralin+alkol neden uyarmıyor?" sınıfı sessiz kürasyon boşluklarına
  // karşı sabitlenmiş kontrol listesi. Buradaki bir çift "unknown"a düşerse
  // foodKeys etiketi kaybolmuş/bozulmuş demektir — testi değil KÜRASYONU düzelt.
  const CANONICAL = [
    // [etken madde, ATC, besin anahtarı, en az beklenen risk]
    ['Sertralin Hidroklorür', 'N06AB06', 'alkol', 'high'],       // antidepresan (NIAAA)
    ['Ketiapin Fumarat', 'N05AH04', 'alkol', 'high'],            // antipsikotik
    ['Karbamazepin', 'N03AF01', 'alkol', 'high'],                // antiepileptik
    ['Diazepam', 'N05BA01', 'alkol', 'critical'],                // benzodiazepin (boxed)
    ['Metronidazol', 'J01XD01', 'alkol', 'high'],                // disülfiram benzeri
    ['Metotreksat', 'L04AX03', 'alkol', 'high'],                 // hepatotoksisite
    ['Warfarin Sodyum', 'B01AA03', 'k-vitamini', 'high'],        // klasik VKA↔K vit
    ['Warfarin Sodyum', 'B01AA03', 'alkol', 'high'],
    ['Atorvastatin Kalsiyum', 'C10AA05', 'greyfurt', 'high'],    // CYP3A4
    ['Amlodipin Besilat', 'C08CA01', 'greyfurt', 'medium'],
    ['Moklobemid', 'N06AG02', 'tiramin', 'high'],                // MAOİ hipertansif kriz
    ['Teofilin Anhidrat', 'R03DA04', 'kafein', 'medium'],
    ['Fluvoksamin Maleat', 'N06AB08', 'kafein', 'high'],         // CYP1A2
    ['Sertralin Hidroklorür', 'N06AB06', 'sari-kantaron', 'high'], // serotonin sendromu
    ['Karbamazepin', 'N03AF01', 'sari-kantaron', 'high'],        // düzey düşürme→nöbet
    ['Spironolakton', 'C03DA01', 'potasyum', 'high'],            // hiperkalemi
    ['Levotiroksin Sodyum', 'H03AA01', 'sut-kalsiyum', 'medium'],
    ['Doksisiklin', 'J01AA02', 'sut-kalsiyum', 'medium'],
  ];
  const RISK_AT_LEAST = { critical: 0, high: 1, medium: 2 };

  for (const [ingredient, atc, foodKey, minRisk] of CANONICAL) {
    it(`${ingredient} + ${foodKey} → en az ${minRisk}`, () => {
      setDrugsForTest([{ ID: '900', Product_Name: 'KANONIK TEST ÜRÜNÜ', Active_Ingredient: ingredient, ATC_code: atc }]);
      const { interactions: results } = analyzeInteractions([
        { id: '900', name: 'KANONIK TEST ÜRÜNÜ' },
        { food: foodKey, name: foodKey },
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].risk).not.toBe('unknown');
      expect(RISK_AT_LEAST[results[0].risk]).toBeLessThanOrEqual(RISK_AT_LEAST[minRisk]);
      expect(results[0].source).toBeTruthy();
    });
  }

  // Fikstürleri diğer describe'lar için geri yükle
  afterAll(() => setDrugsForTest(FIXTURE_DRUGS));
});

describe('bitkisel ürün kuralları (Tebokan×Warfmadin sınıfı boşluklar)', () => {
  it('REGRESYON: ginkgo (fragmanlı yazım) + warfarin → high, unknown DEĞİL', () => {
    // Bildirilen bug: Tebokan × Warfmadin "risk görünmüyor" — gri unknown kartı.
    const [r] = analyze('TEBOKAN FORT 40 MG FILM TABLET', 'COUMADIN 5 MG TABLET');
    expect(r.risk).toBe('high');
    expect(r.ruleId).toBe('R-0247');
    expect(r.source).toBeTruthy();
  });

  it('ATC "0" kombinasyon (GINKOREM) bileşen yoluyla yakalanır', () => {
    const [r] = analyze('GINKOREM 10/80 MG EFERVESAN TABLET', 'COUMADIN 5 MG TABLET');
    expect(r.risk).toBe('high');
  });

  it('"gingko" yazım hatası sinonimle kanona iner: BILOKAN + aspirin → high', () => {
    const [r] = analyze('BILOKAN SUPRA FILM TABLET', 'ASPIRIN 100 MG TABLET');
    expect(r.risk).toBe('high');
    expect(r.ruleId).toBe('R-0248');
  });

  it('ad kuralı olmayan çiftte kategori emniyet ağı: ginkgo + apiksaban → medium', () => {
    const [r] = analyze('TEBOKAN FORT 40 MG FILM TABLET', 'ELIQUIS 5 MG TABLET');
    expect(r.risk).toBe('medium');
    expect(r.message).toContain('kanama');
  });

  it('sedatif bitkisel sınıf etiketi: NOROBALANS + diazepam → medium', () => {
    const [r] = analyze('NOROBALANS ELIXIR', 'DIAZEM 5 MG KAPSUL');
    expect(r.risk).toBe('medium');
    expect(r.message.toLocaleLowerCase('tr')).toContain('sedasyon');
  });

  it('saw palmetto + warfarin → medium (R-0251)', () => {
    const [r] = analyze('PROSTAGOOD MONO KAPSUL', 'COUMADIN 5 MG TABLET');
    expect(r.risk).toBe('medium');
    expect(r.ruleId).toBe('R-0251');
  });

  it('senna + digoksin → medium (hipokalemi → toksisite)', () => {
    const [r] = analyze('PURSENNID DRAJE', 'DIGOXIN 0.25 MG TABLET');
    expect(r.risk).toBe('medium');
    expect(r.message).toContain('digoksin');
  });

  it('iki ginkgo ürünü ortak etkin madde olarak yakalanır (sinonim birleştirme)', () => {
    const [r] = analyze('TEBOKAN FORT 40 MG FILM TABLET', 'BILOKAN SUPRA FILM TABLET');
    expect(r.risk).toBe('critical');
    expect(r.message).toContain('aynı etkin madde');
  });
});

describe('İlaç-İlaç kanonik çiftler — bu liste HER ZAMAN uyarı vermeli', () => {
  // "Tebokan×Warfmadin neden risksiz?" sınıfı sessiz kürasyon boşluklarına
  // karşı sabitlenmiş kontrol listesi. Etken madde stringleri DATASET'İN GERÇEK
  // yazımlarıdır (İngilizce jenerik, tuz varyantı, ATC "0" dahil). Buradaki bir
  // çift "unknown"a düşerse kural/sinonim/harita bozulmuş demektir — testi
  // değil KÜRASYONU düzelt.
  const CANONICAL = [
    // [etkenA, atcA, etkenB, atcB, en az beklenen risk]
    ['ginkgo biloba yapraklari kuru ekstresi', 'N06DX02', 'Varfarin Sodyum', 'B01AA03', 'high'],       // Tebokan×Warfmadin (bildirilen bug)
    ['deksketoprofen trometamol', '0', 'Varfarin Sodyum', 'B01AA03', 'critical'],                       // ATC "0" NSAID — componentAtc türetmesi
    ['Metamizol Sodyum', 'N02BB02', 'Metotreksat', 'L04AX03', 'high'],                                  // Novalgin sınıfı (sıfır kapsamdaydı)
    ['Metamizol Sodyum', 'N02BB02', 'Klozapin', 'N05AH02', 'high'],                                     // agranülositoz additif
    ['Metamizol Sodyum', 'N02BB02', 'Varfarin Sodyum', 'B01AA03', 'high'],                              // PYRAZOLONE×VKA kategori
    ['Tramadol Hidroklorür', 'N02AX02', 'Pregabalin', 'N03AX16', 'high'],                               // FDA 2019 gabapentinoid×opioid
    ['Gabapentin', 'N03AX12', 'Morfin Sülfat', 'N02AA01', 'high'],
    ['Everolimus', 'L04AA18', 'Klaritromisin', 'J01FA09', 'high'],                                      // mTOR×makrolid
    ['Sirolimus', 'L04AA10', 'Ketokonazol', 'J02AB02', 'high'],                                         // mTOR×azol
    ['Apiksaban', 'B01AF02', 'Karbamazepin', 'N03AF01', 'high'],                                        // DOAK×indükleyici
    ['Rivaroksaban', 'B01AF01', 'Fenitoin', 'N03AB02', 'high'],
    ['Dabigatran Eteksilat', 'B01AE07', 'Fenobarbital', 'N03AA02', 'high'],
    ['riosiguat', 'C02KX05', 'Sildenafil Sitrat', 'G04BE03', 'critical'],                               // Adempas kara kutu
    ['glimepiride', '0', 'Flukonazol', 'J02AC01', 'high'],                                              // İngilizce yazım + ATC "0"
    ['psödoefedrin hidroklorur', 'R01BA02', 'Moklobemid', 'N06AG02', 'high'],                           // sempatomimetik×MAOİ
    ['Parasetamol, Psödoefedrin Hcl, Klorfeniramin Maleat', 'R05X', 'Moklobemid', 'N06AG02', 'high'],   // GRIBEX kombinasyonu (kürasyonlu)
    ['Sakubitril + Valsartan', 'C09DX04', 'Ramipril', 'C09AA05', 'critical'],                           // ARNI×ACE anjiyoödem
    ['Ziprasidon', 'N05AE04', 'Ondansetron', 'A04AA01', 'medium'],                                      // yeni QT etiketi
    ['Trazodon Hidroklorür', 'N06AX05', 'Moksifloksasin Hidroklorür', 'J01MA14', 'medium'],             // yeni QT etiketi
    ['Sertralin Hidroklorür', 'N06AB06', 'Selejilin', 'N04BD01', 'critical'],                           // SSRI×MAO-B
    ['Simvastatin', 'C10AA01', 'Klaritromisin', 'J01FA09', 'critical'],                                 // kontrendike statin çifti
    ['eritromisin estolat', '0', 'Simvastatin', 'C10AA01', 'high'],                                     // tuz varyantı + ATC "0"
    ['Potasyum Klorür', 'B05XA01', 'Spironolakton', 'C03DA01', 'high'],                                 // hiperkalemi
    ['Metilen Mavisi', 'V03AB17', 'Sertralin Hidroklorür', 'N06AB06', 'critical'],                      // FDA 2011 DSC
    ['Losartan Potasyum', 'C09CA01', 'Lityum Karbonat', 'N05AN01', 'high'],                             // LOXIBIN kürasyonu sınıfı
    ['indometazin', '0', 'Lityum Karbonat', 'N05AN01', 'high'],                                         // tüm ürünleri ATC "0" olan NSAID
    ['Flutikazon Propiyonat', 'R03BA05', 'Ritonavir', 'J05AE03', 'high'],                               // Cushing
    ['Etinilestradiol, Levonorgestrel', 'G03AA07', 'Lamotrijin', 'N03AX09', 'medium'],                  // kontraseptif×lamotrijin
    ['Etinilestradiol, Levonorgestrel', 'G03AA07', 'Modafinil', 'N06BA07', 'medium'],
    ['Sefoperazon Sodyum', 'J01DD12', 'Varfarin Sodyum', 'B01AA03', 'medium'],                          // NMTT sefalosporin
    ['Levodopa + Benserazid', 'N04BA02', 'Demir III Hidroksit Polimaltoz Kompleksi', 'B03AB05', 'medium'], // şelasyon
    ['Diazepam', 'N05BA01', 'Tramadol Hidroklorür', 'N02AX02', 'critical'],                             // BZD×opioid (mevcut ağ)
    ['Budesonid', 'R03BA02', 'Ritonavir', 'J05AE03', 'medium'],
    ['saw palmetto ekstresi', 'G04CX02', 'Varfarin Sodyum', 'B01AA03', 'medium'],                       // bitkisel tur regresyonu
  ];
  const RISK_AT_LEAST = { critical: 0, high: 1, medium: 2 };

  let pairId = 800;
  for (const [ingA, atcA, ingB, atcB, minRisk] of CANONICAL) {
    it(`${ingA} × ${ingB} → en az ${minRisk}`, () => {
      const idA = String(pairId++), idB = String(pairId++);
      setDrugsForTest([
        { ID: idA, Product_Name: `KANONIK A ${idA}`, Active_Ingredient: ingA, ATC_code: atcA },
        { ID: idB, Product_Name: `KANONIK B ${idB}`, Active_Ingredient: ingB, ATC_code: atcB },
      ]);
      const { interactions: results } = analyzeInteractions([
        { id: idA, name: `KANONIK A ${idA}` },
        { id: idB, name: `KANONIK B ${idB}` },
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].risk).not.toBe('unknown');
      expect(RISK_AT_LEAST[results[0].risk]).toBeLessThanOrEqual(RISK_AT_LEAST[minRisk]);
    });
  }

  afterAll(() => setDrugsForTest(FIXTURE_DRUGS));
});
