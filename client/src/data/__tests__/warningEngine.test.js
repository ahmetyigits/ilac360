import { describe, it, expect, beforeAll } from 'vitest';
import { setWarningsForTest, getWarningsForDrug, getWarningRuleCount } from '../warningEngine.js';
import warnings from '../../../../data/drug-warnings.json';
import synonyms from '../../../../data/ingredient-synonyms.json';

// Gerçek uyarı seti + gerçek sinonim tablosu ile çalışır: kürasyon verisindeki
// bir bozulma (yanlış prefix, normalize edilemeyen ad) burada da yakalanır.
beforeAll(() => {
  setWarningsForTest(warnings, synonyms);
});

const byType = (list, type) => list.filter((w) => w.type === type);

describe('warningEngine — eşleşme', () => {
  it('gerçek uyarı seti yüklendi', () => {
    expect(getWarningRuleCount()).toBeGreaterThanOrEqual(50);
  });

  it('etken madde tam eşitliği: warfarin → K vitamini besin uyarısı + gebelik', () => {
    const list = getWarningsForDrug({
      activeIngredient: 'Warfarin Sodyum',
      atcCode: 'B01AA03',
      form: 'sistemik',
    });
    expect(byType(list, 'food').some((w) => w.message.includes('K vitamini'))).toBe(true);
    expect(byType(list, 'pregnancy').length).toBeGreaterThan(0);
  });

  it('sinonim çözümü: "Varfarin Sodyum" da warfarin uyarılarını alır', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Varfarin Sodyum', atcCode: null, form: null });
    expect(byType(list, 'food').length).toBeGreaterThan(0);
  });

  it('ATC prefix eşleşmesi: J01CA04 (amoksisilin) → penisilin alerji uyarısı', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Amoksisilin', atcCode: 'J01CA04', form: 'sistemik' });
    const allergy = byType(list, 'allergy');
    expect(allergy.some((w) => w.message.includes('penisilin') || w.title.includes('Penisilin'))).toBe(true);
  });

  it('tuz soyma: "İzotretinoin" isotretinoin sinonimiyle A vitamini uyarısını bulur', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Isotretinoin', atcCode: 'D10BA01', form: 'sistemik' });
    expect(byType(list, 'supplement').some((w) => w.title.includes('A vitamini'))).toBe(true);
    expect(byType(list, 'pregnancy').some((w) => w.severity === 'critical')).toBe(true);
  });

  it('kombinasyon ürünü: bileşenlerden biri eşleşirse uyarı gelir', () => {
    const list = getWarningsForDrug({
      activeIngredient: 'Parasetamol, asetilsalisilik asit, kafein',
      atcCode: 'N02BE51',
      form: 'sistemik',
    });
    expect(byType(list, 'age').some((w) => w.message.includes('Reye'))).toBe(true);
  });

  it('eşleşme yoksa boş liste döner', () => {
    // ATC'siz ve hiçbir kayıtta geçmeyen bir bileşen: hiçbir uyarı eşleşmez
    const list = getWarningsForDrug({ activeIngredient: 'Hyaluronik Asit', atcCode: null, form: 'sistemik' });
    expect(list).toEqual([]);
  });
});

describe('warningEngine — form bastırma', () => {
  it('topikal formda systemicOnly uyarılar bastırılır (diklofenak jel)', () => {
    const jel = getWarningsForDrug({ activeIngredient: 'Diklofenak Potasyum', atcCode: 'M02AA15', form: 'topikal' });
    // Jel yalnızca topikale özgü (systemicOnly=false) M02AA kayıtlarını alır;
    // sistemik NSAİİ gebelik/araç uyarıları görünmez.
    expect(jel.every((w) => ['W-0222', 'W-0223'].includes(w.id))).toBe(true);
    expect(byType(jel, 'pregnancy').length).toBe(0);
    expect(byType(jel, 'driving').length).toBe(0);

    const tablet = getWarningsForDrug({ activeIngredient: 'Diklofenak Potasyum', atcCode: 'M01AB05', form: 'sistemik' });
    expect(byType(tablet, 'allergy').length).toBeGreaterThan(0);
    expect(byType(tablet, 'pregnancy').length).toBeGreaterThan(0);
  });

  it('systemicOnly=false uyarılar topikal formda da kalır (tretinoin krem gebelik)', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Tretinoin', atcCode: 'D10AD01', form: 'topikal' });
    expect(byType(list, 'pregnancy').length).toBeGreaterThan(0);
  });

  it('form null → sistemik varsayılır, uyarılar bastırılmaz', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Warfarin', atcCode: null, form: null });
    expect(list.length).toBeGreaterThan(0);
  });
});

describe('warningEngine — dedupe ve sıralama', () => {
  it('hem etken madde hem ATC eşleşen kayıt bir kez döner', () => {
    // W-0027 (H03AA besin) + W-0044 (H03AA takviye): levotiroksin ürünü
    const list = getWarningsForDrug({ activeIngredient: 'Levotiroksin Sodyum', atcCode: 'H03AA01', form: 'sistemik' });
    const ids = list.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tip sırası: gebelik alerjiden, alerji besinden önce gelir', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Warfarin', atcCode: 'B01AA03', form: 'sistemik' });
    const types = list.map((w) => w.type);
    const iPreg = types.indexOf('pregnancy');
    const iFood = types.indexOf('food');
    expect(iPreg).toBeGreaterThanOrEqual(0);
    expect(iFood).toBeGreaterThan(iPreg);
  });

  it('kamuya dönük nesnede iç eşleşme alanları yoktur, kaynak vardır', () => {
    const [w] = getWarningsForDrug({ activeIngredient: 'Warfarin', atcCode: null, form: null });
    expect(w.source).toBeTruthy();
    expect(w.match).toBeUndefined();
    expect(w.systemicOnly).toBeUndefined();
  });
});

describe('warningEngine — general tipi ve genişletilmiş set', () => {
  it('beta-bloker (C07) ani bırakma uyarısı alır, general en sonda sıralanır', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Metoprolol', atcCode: 'C07AB02', form: 'sistemik' });
    const general = list.filter((w) => w.type === 'general');
    expect(general.some((w) => w.message.includes('aniden bırakmayın') || w.title.includes('Aniden'))).toBe(true);
    const lastNonGeneral = list.map((w) => w.type).lastIndexOf('driving');
    const firstGeneral = list.findIndex((w) => w.type === 'general');
    if (lastNonGeneral >= 0) expect(firstGeneral).toBeGreaterThan(lastNonGeneral);
  });

  it('B05 serum ürünü "sağlık personelince uygulanır" info kaydı alır', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Sodyum Klorür', atcCode: 'B05BB01', form: null });
    expect(list.some((w) => w.id === 'W-0230')).toBe(true);
  });

  it('sodyum klorür bileşeni tek başına hastane kaydını TETİKLEMEZ (burun spreyi)', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Sodyum Klorür', atcCode: null, form: null });
    expect(list.some((w) => w.id === 'W-0230')).toBe(false);
  });

  it('J01 antibiyotiği hem sınıf uyarısını hem genel antibiyotik kuralını alır', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Amoksisilin', atcCode: 'J01CA04', form: 'sistemik' });
    expect(list.some((w) => w.type === 'allergy')).toBe(true);
    expect(list.some((w) => w.id === 'W-0194')).toBe(true);
  });

  it('eltrombopag tuz sinonimleri üzerinden eşleşir', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Eltrombopag Olamin', atcCode: 'B02BX05', form: 'sistemik' });
    expect(list.some((w) => w.id === 'W-0214')).toBe(true);
  });
});

describe('warningEngine — administration (kullanım şekli) tipi', () => {
  it('doksisiklin "dik pozisyonda alın" uyarısı alır (feedback örneği)', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Doksisiklin', atcCode: 'J01AA02', form: 'sistemik' });
    const adm = list.find((w) => w.type === 'administration');
    expect(adm).toBeTruthy();
    expect(adm.id).toBe('W-0285');
    expect(adm.message).toContain('dik pozisyonda');
  });

  it('metotreksat "haftada bir" uyarısı critical olarak döner', () => {
    const list = getWarningsForDrug({ activeIngredient: 'Metotreksat', atcCode: 'L04AX03', form: 'sistemik' });
    const adm = list.find((w) => w.id === 'W-0287');
    expect(adm).toBeTruthy();
    expect(adm.severity).toBe('critical');
  });

  it('administration, food ve general tiplerinden ÖNCE sıralanır', () => {
    // Bifosfonat: W-0284 (administration) + W-0031 (food, süt/kalsiyum) birlikte
    const list = getWarningsForDrug({ activeIngredient: 'Alendronat Sodyum', atcCode: 'M05BA04', form: 'sistemik' });
    const types = list.map((w) => w.type);
    const iAdm = types.indexOf('administration');
    const iFood = types.indexOf('food');
    expect(iAdm).toBeGreaterThanOrEqual(0);
    expect(iFood).toBeGreaterThan(iAdm);
  });
});
