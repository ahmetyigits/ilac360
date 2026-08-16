// @vitest-environment jsdom
// Kritik akışların DOM testleri: arama → klavye ile ekleme, sepet paylaşımı,
// "Şunu mu demek istediniz?" önerisi.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import DrugSearch from '../DrugSearch.jsx';
import SelectedDrugs from '../SelectedDrugs.jsx';
import { setDrugsForTest } from '../../data/drugStore.js';
import { setInteractionsForTest } from '../../data/interactionEngine.js';
import { resetFuzzyIndex } from '../../data/fuzzySearch.js';

const FIXTURES = [
  { ID: '1', Product_Name: 'PAROL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01', barcode: '8699536190869' },
  { ID: '2', Product_Name: 'ASPIRIN 100 MG TABLET', Active_Ingredient: 'Asetilsalisilik Asit', ATC_code: 'N02BA01', barcode: '8699536190870' },
  { ID: '3', Product_Name: 'MAJEZIK 100 MG TABLET', Active_Ingredient: 'Flurbiprofen', ATC_code: 'M01AE09', barcode: '8699536190871' },
];

beforeAll(() => {
  setDrugsForTest(FIXTURES);
  setInteractionsForTest([], {});
  resetFuzzyIndex();
});

beforeEach(() => {
  vi.useRealTimers();
});

// vitest globals kapalıyken RTL otomatik cleanup çalışmaz — elle bağla.
afterEach(cleanup);

describe('DrugSearch akışı', () => {
  it('yaz → sonuç listesi → ArrowDown+Enter ile ekleme', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DrugSearch onSelect={onSelect} selectedDrugs={[]} />);

    await user.type(screen.getByRole('combobox'), 'parol');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument(), { timeout: 2000 });

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].name).toBe('PAROL 500 MG TABLET');
  });

  it("yazım hatasında 'Şunu mu demek istediniz' önerisi çıkar ve tıklanınca arar", async () => {
    const user = userEvent.setup();
    render(<DrugSearch onSelect={vi.fn()} selectedDrugs={[]} />);

    await user.type(screen.getByRole('combobox'), 'aspirn');
    await waitFor(
      () => expect(screen.getByText(/Şunu mu demek istediniz/i)).toBeInTheDocument(),
      { timeout: 2000 }
    );

    await user.click(screen.getByRole('button', { name: /aspirin/i }));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText('ASPIRIN 100 MG TABLET')).toBeInTheDocument();
  });
});

describe('SelectedDrugs paylaşımı', () => {
  it('Paylaş, navigator.share yoksa panoya kopyalar ve gizlilik notu iletir', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue();
    // navigator.clipboard/share jsdom'da getter-only: defineProperty gerekir
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const onToast = vi.fn();

    render(
      <SelectedDrugs
        drugs={[{ id: '1', name: 'PAROL 500 MG TABLET' }, { id: '2', name: 'ASPIRIN 100 MG TABLET' }]}
        onRemove={vi.fn()} onSelect={vi.fn()} onAnalyze={vi.fn()} onClearAll={vi.fn()}
        onToast={onToast}
      />
    );

    await user.click(screen.getByRole('button', { name: /paylaş/i }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('?d=1,2');
    expect(onToast).toHaveBeenCalledWith(expect.stringContaining('kimlik'), 'info');
  });
});

describe('Besin çipleri (FoodPicker)', () => {
  it('çipe tıkla → sepete besin ögesi eklenir; ekli çip pasifleşir', async () => {
    const { setFoodsForTest } = await import('../../data/foodStore.js');
    setFoodsForTest([
      { key: 'greyfurt', name: 'Greyfurt', longName: 'Greyfurt / greyfurt suyu', emoji: '🍊', blurb: 'x' },
      { key: 'alkol', name: 'Alkol', longName: 'Alkollü içecekler', emoji: '🍷', blurb: 'y' },
    ]);
    const { default: FoodPicker } = await import('../FoodPicker.jsx');
    const user = userEvent.setup();
    const onAdd = vi.fn();

    const { rerender } = render(<FoodPicker selectedItems={[]} onAdd={onAdd} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /greyfurt/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /greyfurt/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({ id: 'f:greyfurt', isFood: true, foodKey: 'greyfurt' });

    rerender(<FoodPicker selectedItems={[onAdd.mock.calls[0][0]]} onAdd={onAdd} />);
    expect(screen.getByRole('button', { name: /greyfurt/i })).toBeDisabled();
  });

  it('sepetteki besin çipi ayrı stilde, detay tıklaması yok, × ile çıkar', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <SelectedDrugs
        drugs={[
          { id: '1', name: 'PAROL 500 MG TABLET' },
          { id: 'f:alkol', isFood: true, foodKey: 'alkol', name: 'Alkol', emoji: '🍷' },
        ]}
        onRemove={onRemove} onSelect={vi.fn()} onAnalyze={vi.fn()} onClearAll={vi.fn()}
      />
    );
    // Besin adı bir buton DEĞİL (detaya gitmez); yalnız × butonu var
    expect(screen.queryByRole('button', { name: /^Alkol$/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Alkol listeden çıkar/i }));
    expect(onRemove).toHaveBeenCalledWith('f:alkol');
  });

  it('yalnız besin sepetinde "en az 1 ilaç" ipucu görünür', () => {
    render(
      <SelectedDrugs
        drugs={[
          { id: 'f:alkol', isFood: true, foodKey: 'alkol', name: 'Alkol', emoji: '🍷' },
          { id: 'f:kafein', isFood: true, foodKey: 'kafein', name: 'Kafein', emoji: '☕' },
        ]}
        onRemove={vi.fn()} onSelect={vi.fn()} onAnalyze={vi.fn()} onClearAll={vi.fn()}
      />
    );
    expect(screen.getByText(/en az 1 ilaç ekleyin/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Etkileşimleri Kontrol Et/i })).not.toBeInTheDocument();
  });
});

describe('Barkod tarama entegrasyonu', () => {
  // Tarayıcı modalı mock'lanır: kamera jsdom'da yok; test edilen şey
  // onDetected sonrası çözümleme akışıdır (tek/çoklu/sıfır eşleşme).
  vi.mock('../BarcodeScanner.jsx', () => ({
    default: ({ onDetected }) => (
      <button onClick={() => onDetected(globalThis.__scanDigits)}>mock-tara</button>
    ),
  }));

  const stubCamera = () => {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
  };
  const unstubCamera = () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  };

  it('kamera desteği yokken tarama butonu render edilmez', () => {
    unstubCamera();
    render(<DrugSearch onSelect={vi.fn()} selectedDrugs={[]} />);
    expect(screen.queryByRole('button', { name: /barkod tara/i })).not.toBeInTheDocument();
  });

  it('tek barkod eşleşmesi ilacı otomatik ekler', async () => {
    stubCamera();
    globalThis.__scanDigits = '8699536190869'; // FIXTURES[0] PAROL barkodu (tek eşleşme)
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DrugSearch onSelect={onSelect} selectedDrugs={[]} />);

    await user.click(screen.getByRole('button', { name: /barkod tara/i }));
    await user.click(screen.getByRole('button', { name: 'mock-tara' }));
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(onSelect.mock.calls[0][0].name).toBe('PAROL 500 MG TABLET');
    unstubCamera();
  });

  it('sıfır eşleşmede rakamlar input\'ta kalır, "bulunamadı" paneli çıkar', async () => {
    stubCamera();
    globalThis.__scanDigits = '9999999999999';
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DrugSearch onSelect={onSelect} selectedDrugs={[]} />);

    await user.click(screen.getByRole('button', { name: /barkod tara/i }));
    await user.click(screen.getByRole('button', { name: 'mock-tara' }));
    expect(screen.getByRole('combobox')).toHaveValue('9999999999999');
    await waitFor(() => expect(screen.getAllByText(/Sonuç bulunamadı/i).length).toBeGreaterThan(0), { timeout: 2000 });
    expect(onSelect).not.toHaveBeenCalled();
    unstubCamera();
  });
});
