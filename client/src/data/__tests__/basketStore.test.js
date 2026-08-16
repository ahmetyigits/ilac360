// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveBasket,
  loadBasket,
  parseSharedIds,
  parseSharedFoodKeys,
  buildShareUrl,
} from '../basketStore.js';

// Node 22+ globalThis'e yarım bir deneysel localStorage enjekte ediyor
// (--localstorage-file bayraksız clear/setItem çalışmıyor) ve jsdom'unkini
// gölgeleyebiliyor — testler kendi tam mock'unu kullanır.
const store = new Map();
vi.stubGlobal('localStorage', {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
});

beforeEach(() => store.clear());

describe('basket v2 — ilaç + besin kalıcılığı', () => {
  it('kaydet/yükle gidiş-dönüşü: ilaçlar ve besinler ayrışır', () => {
    saveBasket([
      { id: '123', name: 'PAROL' },
      { id: 'f:greyfurt', isFood: true, foodKey: 'greyfurt', name: 'Greyfurt' },
    ]);
    expect(loadBasket()).toEqual({ drugIds: ['123'], foodKeys: ['greyfurt'] });
  });

  it('v1 sepeti sessizce migrasyonla okunur (besinsiz)', () => {
    localStorage.setItem('basket_v1', JSON.stringify(['5', '9']));
    expect(loadBasket()).toEqual({ drugIds: ['5', '9'], foodKeys: [] });
  });

  it('v2 varsa v1 yok sayılır', () => {
    localStorage.setItem('basket_v1', JSON.stringify(['1']));
    localStorage.setItem('basket_v2', JSON.stringify({ d: ['7'], f: ['alkol'] }));
    expect(loadBasket()).toEqual({ drugIds: ['7'], foodKeys: ['alkol'] });
  });

  it('bozuk veri boş sepete düşer', () => {
    localStorage.setItem('basket_v2', '{bozuk');
    expect(loadBasket()).toEqual({ drugIds: [], foodKeys: [] });
    localStorage.setItem('basket_v2', JSON.stringify({ d: ['abc', '3'], f: ['Geçersiz Anahtar!', 'kafein'] }));
    expect(loadBasket()).toEqual({ drugIds: ['3'], foodKeys: ['kafein'] });
  });
});

describe('paylaşım parametreleri', () => {
  it('?f= besin anahtarlarını ayrıştırır, bozukları eler', () => {
    expect(parseSharedFoodKeys('?f=greyfurt,alkol')).toEqual(['greyfurt', 'alkol']);
    expect(parseSharedFoodKeys('?f=GRE%20YFURT,sut-kalsiyum,<script>')).toEqual(['sut-kalsiyum']);
    expect(parseSharedFoodKeys('?d=1,2')).toEqual([]);
  });

  it('?d= yalnız-rakam ayrıştırması değişmedi (eski linkler)', () => {
    expect(parseSharedIds('?d=1,2,abc')).toEqual(['1', '2']);
    expect(parseSharedIds('?d=1,2&f=greyfurt')).toEqual(['1', '2']);
  });

  it('buildShareUrl karma sepette d ve f üretir, virgüller kodlanmaz', () => {
    const url = buildShareUrl([
      { id: '1', name: 'A' },
      { id: 'f:kafein', isFood: true, foodKey: 'kafein', name: 'Kafein' },
      { id: '2', name: 'B' },
    ]);
    expect(url).toContain('?d=1,2&f=kafein');
  });

  it('yalnız besin sepetinde d parametresi hiç olmaz', () => {
    const url = buildShareUrl([{ id: 'f:alkol', isFood: true, foodKey: 'alkol', name: 'Alkol' }]);
    expect(url).toContain('?f=alkol');
    expect(url).not.toContain('d=');
  });
});
