import { describe, it, expect, beforeAll } from 'vitest';
import { setDrugsForTest } from '../drugStore.js';
import { setInteractionsForTest, analyzeInteractions, analyzeWithEnrichment } from '../interactionEngine.js';
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
];

// Bileşen→ATC geri doldurma haritası (gerçek build çıktısının küçük örneği):
// diklofenak'ın en yaygın ATC'si sistemik M01AB05'tir — topikal bastırma
// testleri tam da bu enjeksiyonun jel formunda atlanmasını doğrular.
const COMPONENT_ATC = {
  'diklofenak': 'M01AB05',
  'warfarin': 'B01AA03',
};

function analyze(...names) {
  const { interactions: results } = analyzeInteractions(names);
  return results;
}

beforeAll(() => {
  setDrugsForTest(FIXTURE_DRUGS);
  setInteractionsForTest(interactions, synonyms, COMPONENT_ATC, adjuvants, componentClasses);
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
