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
  // Aynı bileşen ama 7 haneden kısa ATC → gruba giremez
  { ID: '4', Product_Name: 'KISAATC TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE' },
  // Tek üyeli grup → eşdeğeri yok
  { ID: '5', Product_Name: 'VIAGRA 50 MG TABLET', Active_Ingredient: 'Sildenafil Sitrat', ATC_code: 'G04BE03' },
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

  it('7 haneden kısa ATC gruba girmez', () => {
    expect(getEquivalentIds('4')).toEqual([]);
    expect(getEquivalentIds('1')).not.toContain('4');
  });

  it('tek üyeli grupta eşdeğer dönmez', () => {
    expect(getEquivalentIds('5')).toEqual([]);
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
