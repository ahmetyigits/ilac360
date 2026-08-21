// Keşfet gruplaması: aynı etken maddeli ürünler grup halinde ardışık gelir
// ("eşdeğerler bir arada" eczacı feedback'i). Sayfalama item-bazlı kalır;
// sayfa sınırında bölünen grup groupStart=false ile işaretlenir.

import { describe, it, expect, beforeAll } from 'vitest';
import { setDrugsForTest } from '../drugStore.js';
import { setInteractionsForTest } from '../interactionEngine.js';
import { setConditionsForTest, searchByCondition } from '../conditionSearch.js';
import synonyms from '../../../../data/ingredient-synonyms.json';

const FIXTURE_DRUGS = [
  // Sıralamada araya girecek şekilde karışık dizilmiş parasetamol ürünleri
  { ID: '1', Product_Name: 'PAROL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  { ID: '2', Product_Name: 'AFEBRYL TABLET', Active_Ingredient: 'İbuprofen', ATC_code: 'M01AE01' },
  { ID: '3', Product_Name: 'TAMOL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  // Tuz/yazım varyantı: sinonimle aynı gruba inmeli
  { ID: '4', Product_Name: 'MINOSET 500 MG TABLET', Active_Ingredient: 'Asetaminofen', ATC_code: 'N02BE01' },
  // Kombinasyon: bileşen kümesi farklı → AYRI grup
  { ID: '5', Product_Name: 'GRIPIN KAFEIN TABLET', Active_Ingredient: 'Parasetamol, Kafein', ATC_code: 'N02BE51' },
  // Etken maddesi bilinmeyen ürün: gruba girmez, yerinde tekil satır
  { ID: '6', Product_Name: 'GIZEMLI AGRI TABLET', Active_Ingredient: 'Etken maddesi bilgisi bulunamadı.', ATC_code: 'N02BE01' },
  { ID: '7', Product_Name: 'NUROFEN 200 MG TABLET', Active_Ingredient: 'İbuprofen', ATC_code: 'M01AE01' },
];

const FIXTURE_CONDITIONS = [
  {
    id: 'bas-agrisi',
    names: ['baş ağrısı', 'bas agrisi'],
    keywords: [],
    ingredients: ['parasetamol', 'asetaminofen', 'ibuprofen'],
    priorityBrands: ['PAROL'],
    atcPrefixes: ['N02BE'],
    categories: [],
    description: 'Baş ağrısı için kullanılan ilaçlar',
  },
];

beforeAll(() => {
  setDrugsForTest(FIXTURE_DRUGS);
  setInteractionsForTest([], synonyms, {}, { adjuvants: [] }, { components: {} });
  setConditionsForTest(FIXTURE_CONDITIONS);
});

describe('searchByCondition gruplaması', () => {
  it('aynı etken maddeli ürünler ardışık gelir, grup alanları dolu', async () => {
    const { drugs } = await searchByCondition('baş ağrısı', { limit: 25 });
    const keys = drugs.map((d) => d.groupKey || null);
    // Her grup kesintisiz blok olmalı: bir anahtar bitince tekrar başlamamalı
    const seenDone = new Set();
    let prev = Symbol('start');
    for (const k of keys) {
      if (k !== prev) {
        expect(seenDone.has(k)).toBe(false);
        if (prev && typeof prev === 'string') seenDone.add(prev);
        prev = k;
      }
    }
    const parol = drugs.find((d) => d.name.startsWith('PAROL'));
    expect(parol.groupKey).toBe('parasetamol');
    expect(parol.groupSize).toBe(3); // PAROL + TAMOL + MINOSET
    expect(parol.groupLabel).toBeTruthy();
  });

  it('tuz/yazım varyantı (Asetaminofen) sinonimle aynı gruba girer', async () => {
    const { drugs } = await searchByCondition('baş ağrısı', { limit: 25 });
    const minoset = drugs.find((d) => d.name.startsWith('MINOSET'));
    expect(minoset.groupKey).toBe('parasetamol');
  });

  it('kombinasyon (parasetamol+kafein) tekil parasetamolden AYRI gruptur', async () => {
    const { drugs } = await searchByCondition('baş ağrısı', { limit: 25 });
    const gripin = drugs.find((d) => d.name.startsWith('GRIPIN'));
    expect(gripin.groupKey).toBe('kafein+parasetamol');
    expect(gripin.groupSize).toBe(1);
  });

  it('etken maddesi bilinmeyen ürün grupsuz kalır', async () => {
    const { drugs } = await searchByCondition('baş ağrısı', { limit: 25 });
    const gizemli = drugs.find((d) => d.name.startsWith('GIZEMLI'));
    expect(gizemli).toBeTruthy();
    expect(gizemli.groupKey).toBeUndefined();
  });

  it('priorityBrands: öncelikli marka listenin başında ve grubunun ilk üyesi', async () => {
    const { drugs } = await searchByCondition('baş ağrısı', { limit: 25 });
    expect(drugs[0].name).toContain('PAROL');
    expect(drugs[0].groupStart).toBe(true);
    // Grubun kalanı hemen ardından gelir
    expect(drugs[1].groupKey).toBe('parasetamol');
    expect(drugs[1].groupStart).toBe(false);
  });

  it('sayfa sınırında bölünen grup: 2. sayfanın ilk üyesi groupStart=false', async () => {
    const p1 = await searchByCondition('baş ağrısı', { page: 1, limit: 2 });
    const p2 = await searchByCondition('baş ağrısı', { page: 2, limit: 2 });
    expect(p1.drugs).toHaveLength(2);
    expect(p1.drugs[1].groupKey).toBe('parasetamol');
    expect(p2.drugs[0].groupKey).toBe('parasetamol'); // 3 üyeli grup 2'de bölündü
    expect(p2.drugs[0].groupStart).toBe(false);
  });

  it('cache ikinci çağrıda aynı gruplu listeyi döndürür', async () => {
    const a = await searchByCondition('baş ağrısı', { limit: 25 });
    const b = await searchByCondition('baş ağrısı', { limit: 25 });
    expect(b.drugs.map((d) => d.id)).toEqual(a.drugs.map((d) => d.id));
    expect(b.totalFound).toBe(a.totalFound);
  });
});
