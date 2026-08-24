import { describe, it, expect, beforeAll } from 'vitest';
import { setDrugsForTest } from '../drugStore.js';
import { setInteractionsForTest } from '../interactionEngine.js';
import { getEquivalentIds, getEquivalentDrugs, resetEquivalentsIndex } from '../equivalents.js';
import synonyms from '../../../../data/ingredient-synonyms.json';

const FIXTURE_DRUGS = [
  // Aynı bileşen + aynı 7 haneli ATC → eşdeğer grup (tuz farkı sinonimle birleşir)
  { ID: '1', Product_Name: 'PAROL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  { ID: '2', Product_Name: 'TAMOL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  { ID: '3', Product_Name: 'MINOSET TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  // Aynı bileşen ama 7 haneden kısa ATC → ATC'siz sayılır, yine de eşdeğer grubuna katılır
  { ID: '4', Product_Name: 'KISAATC TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE' },
  // Tek üyeli grup → eşdeğeri yok
  { ID: '5', Product_Name: 'VIAGRA 50 MG TABLET', Active_Ingredient: 'Sildenafil Sitrat', ATC_code: 'G04BE03' },
  // Aynı bileşen (Parasetamol) ama farklı 5 haneli ATC ön eki → farklı form/rota,
  // ATC'li ürünlerle eşdeğer SAYILMAMALI (ör. farazi bir topikal sınıf)
  { ID: '6', Product_Name: 'PARA TOPIK', Active_Ingredient: 'Parasetamol', ATC_code: 'D11AX01' },
  // ATC="0" (eksik) ama aynı etken maddeli düzgün ATC'li kardeşi olan ürün
  { ID: '7', Product_Name: 'SILDE JENERIK', Active_Ingredient: 'Sildenafil Sitrat', ATC_code: '0' },
];

beforeAll(() => {
  setDrugsForTest(FIXTURE_DRUGS);
  // equivalents sinonim tablosunu motordan alır
  setInteractionsForTest([], synonyms, {}, { adjuvants: [] }, { components: {} });
  resetEquivalentsIndex();
});

describe('getEquivalentIds', () => {
  it('aynı bileşen + aynı 7 haneli ATC eşdeğer sayılır (kendisi hariç)', () => {
    const ids = getEquivalentIds('1');
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    expect(ids).not.toContain('1');
  });

  it('7 haneden kısa/eksik ATC artık eşdeğer grubuna katılır', () => {
    // Kendisi ATC'siz → aynı etken maddeli tüm uyumlu kardeşleri döner
    const ids = getEquivalentIds('4');
    expect(ids).toContain('1');
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    // ATC'li bir ürün, ATC'siz kardeşini (uyumlu) listeler
    expect(getEquivalentIds('1')).toContain('4');
  });

  it('farklı 5 haneli ATC ön eki eşdeğer sayılmaz (form/rota koruması)', () => {
    // 6 (D11AX01) ile 1 (N02BE01): aynı bileşen ama farklı 5-ön ek → eşleşmez
    expect(getEquivalentIds('1')).not.toContain('6');
    expect(getEquivalentIds('6')).not.toContain('1');
  });

  it('ATC="0" ürün aynı etken maddeli ATC\'li kardeşini eşdeğer döndürür', () => {
    expect(getEquivalentIds('7')).toContain('5');
    // ve tersi: ATC'li ürün ATC'siz kardeşini listeler
    expect(getEquivalentIds('5')).toContain('7');
  });

  it('kendisi ATC\'siz iken ATC\'li (kanonik) kardeş önce gelir', () => {
    // 4 ATC'siz; 1/2/3 ATC'li → hepsi ATC'siz kardeşlerden (yok) önce; sıra korunur
    const ids = getEquivalentIds('4');
    // ATC'li kardeşler listenin başında
    expect(ids.slice(0, 3).sort()).toEqual(['1', '2', '3']);
  });

  it('bilinmeyen/anahtarsız id için eşdeğer dönmez', () => {
    expect(getEquivalentIds('999')).toEqual([]);
  });

  it('limit parametresi uygulanır', () => {
    expect(getEquivalentIds('1', { limit: 1 })).toHaveLength(1);
  });
});

describe('getEquivalentDrugs', () => {
  it('id listesini ilaç kayıtlarına çözer', () => {
    const drugs = getEquivalentDrugs('2');
    expect(drugs.map((d) => d.Product_Name)).toContain('PAROL 500 MG TABLET');
  });
});
