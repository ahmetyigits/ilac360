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
  { ID: '1', Product_Name: 'PAROL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01', barcode: '869' },
  { ID: '2', Product_Name: 'ASPIRIN 100 MG TABLET', Active_Ingredient: 'Asetilsalisilik Asit', ATC_code: 'N02BA01', barcode: '870' },
  { ID: '3', Product_Name: 'MAJEZIK 100 MG TABLET', Active_Ingredient: 'Flurbiprofen', ATC_code: 'M01AE09', barcode: '871' },
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
