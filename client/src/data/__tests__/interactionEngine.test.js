import { describe, it, expect, beforeAll } from 'vitest';
import { setDrugsForTest } from '../drugStore.js';
import { setInteractionsForTest, analyzeInteractions } from '../interactionEngine.js';
import interactions from '../../../../data/interactions.json';
import synonyms from '../../../../data/ingredient-synonyms.json';
import adjuvants from '../../../../data/adjuvant-components.json';

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
  setInteractionsForTest(interactions, synonyms, COMPONENT_ATC, adjuvants);
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
