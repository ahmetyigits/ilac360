import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedLists, saveList, deleteList, renameList,
  getFavoriteIds, isFavorite, toggleFavorite,
} from '../listsStore.js';

// Ortamdan bağımsız temiz localStorage (node env'de Node'un deneysel global'i
// eksik API sunabiliyor; store testi için kendi in-memory polyfill'imizi kurarız).
beforeEach(() => {
  let store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
});

const items = (...spec) => spec.map((s) =>
  typeof s === 'string' ? { isFood: true, foodKey: s } : { id: String(s) });

describe('listsStore — kayıtlı listeler', () => {
  it('boş başlangıçta liste yok', () => {
    expect(getSavedLists()).toEqual([]);
  });

  it('liste kaydeder ve kimlikleri (d/f) saklar; en yeni başta', () => {
    saveList('İlk', items(1, 2, 'greyfurt'));
    const two = saveList('İkinci', items(3));
    const lists = getSavedLists();
    expect(lists).toHaveLength(2);
    expect(lists[0].name).toBe('İkinci');
    expect(lists[0].id).toBe(two.id);
    expect(lists[1].d).toEqual(['1', '2']);
    expect(lists[1].f).toEqual(['greyfurt']);
  });

  it('boş liste kaydedilmez', () => {
    expect(saveList('boş', [])).toBeNull();
    expect(getSavedLists()).toHaveLength(0);
  });

  it('adsız kayıt varsayılan ad alır', () => {
    const e = saveList('   ', items(5));
    expect(e.name).toMatch(/^Liste /);
  });

  it('geçersiz id/foodKey ayıklanır', () => {
    const e = saveList('temiz', [{ id: 'abc' }, { id: '7' }, { isFood: true, foodKey: 'KÖTÜ KEY' }, { isFood: true, foodKey: 'alkol' }]);
    expect(e.d).toEqual(['7']);
    expect(e.f).toEqual(['alkol']);
  });

  it('siler ve yeniden adlandırır', () => {
    const a = saveList('A', items(1));
    const b = saveList('B', items(2));
    renameList(a.id, 'A-yeni');
    expect(getSavedLists().find((l) => l.id === a.id).name).toBe('A-yeni');
    deleteList(b.id);
    const rest = getSavedLists();
    expect(rest).toHaveLength(1);
    expect(rest[0].id).toBe(a.id);
  });

  it('yeni id çakışmaz (silme sonrası bile)', () => {
    const a = saveList('A', items(1));
    saveList('B', items(2));
    deleteList(a.id);
    const c = saveList('C', items(3));
    const ids = getSavedLists().map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(c.id);
  });

  it('bozuk localStorage → boş liste (çökmez)', () => {
    localStorage.setItem('saved_lists_v1', '{bozuk json');
    expect(getSavedLists()).toEqual([]);
  });
});

describe('listsStore — favoriler', () => {
  it('ekler, kontrol eder, çıkarır (toggle)', () => {
    expect(isFavorite('42')).toBe(false);
    toggleFavorite('42');
    expect(isFavorite('42')).toBe(true);
    expect(getFavoriteIds()).toEqual(['42']);
    toggleFavorite('42');
    expect(isFavorite('42')).toBe(false);
  });

  it('en yeni favori başta; geçersiz id yok sayılır', () => {
    toggleFavorite('1');
    toggleFavorite('2');
    expect(getFavoriteIds()).toEqual(['2', '1']);
    toggleFavorite('abc');
    expect(getFavoriteIds()).toEqual(['2', '1']);
  });
});
