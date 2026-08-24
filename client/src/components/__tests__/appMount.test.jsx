// @vitest-environment jsdom
// App'in tamamını mount eden TEK test. keyFlows/diğerleri yalnız alt bileşenleri
// render ediyordu; bu yüzden App.jsx'te render sırasında oluşan bir TDZ hatası
// ("Cannot access 'showToast' before initialization" — handler'lar showToast'tan
// önce tanımlanınca) hiçbir testte yakalanmıyordu. Bu smoke testi o sınıfı yakalar.
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import App from '../../App.jsx';

beforeAll(() => {
  // Node'un deneysel global localStorage'ı jsdom'da eksik API sunabiliyor
  // (gerçek tarayıcıda sorun yok); temiz in-memory polyfill kur.
  let store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
  // jsdom matchMedia'yı implement etmez; App'in darkMode başlangıcı kullanır.
  if (!window.matchMedia) {
    window.matchMedia = (q) => ({
      matches: false, media: q, onchange: null,
      addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, dispatchEvent() { return false; },
    });
  }
  // bootData fetch'i asla çözülmez: App iskeleti render edilir, mount sonrası
  // setState tetiklenmez (act uyarısı olmaz). Amaç: render çökmesin.
  globalThis.fetch = vi.fn(() => new Promise(() => {}));
});

afterEach(cleanup);

describe('App mount smoke', () => {
  it('App TDZ/render hatası olmadan mount olur', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    // "İçeriğe atla" atlama bağlantısı her zaman senkron render edilir.
    expect(screen.getByText('İçeriğe atla')).toBeInTheDocument();
  });

  it('?p=yenilikler URL\'iyle Yenilikler sayfası açılır (menüde gizli deep-link)', () => {
    window.history.pushState({}, '', '/?p=yenilikler');
    render(<App />);
    expect(screen.getByText('Sürüm Notları')).toBeInTheDocument();
    window.history.pushState({}, '', '/');
  });
});
