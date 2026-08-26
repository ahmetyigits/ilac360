// @vitest-environment jsdom
// TİTCK prospektüs kaynak linki: ktUrl varsa "TİTCK'de oku" linki gerçek PDF'e
// gider; yoksa genel TİTCK arşiv linkine düşülür.

import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('../../data/api', () => ({
  getDrugDetail: vi.fn().mockImplementation(() => Promise.resolve(globalThis.__ktDetail)),
  getEquivalents: vi.fn().mockResolvedValue([]),
}));

beforeAll(() => {
  let store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
});

import DrugCard from '../DrugCard.jsx';

afterEach(cleanup);

const base = {
  id: '1', name: 'DORAMYCIN 3 MU TABLET', activeIngredient: 'Spiramisin',
  atcCode: 'J01FA02', barcode: '8680199090987', categories: ['Antibiyotik'],
  description: null, isSupplement: false, prescriptionType: null, warnings: [],
};

describe('DrugCard — TİTCK prospektüs linki', () => {
  it('ktUrl varsa TİTCK prospektüs linki PDF adresine gider', async () => {
    globalThis.__ktDetail = { ...base, ktUrl: 'https://titck.gov.tr/storage/kubKtAttachments/abc.pdf' };
    render(<DrugCard drug={{ id: '1' }} onClose={vi.fn()} />);
    const link = await screen.findByRole('link', { name: /TİTCK.?de oku/i });
    expect(link).toHaveAttribute('href', 'https://titck.gov.tr/storage/kubKtAttachments/abc.pdf');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('ktUrl yoksa genel TİTCK arşiv linki gösterilir', async () => {
    globalThis.__ktDetail = { ...base, ktUrl: null };
    render(<DrugCard drug={{ id: '1' }} onClose={vi.fn()} />);
    const link = await screen.findByRole('link', { name: /TİTCK KÜB\/KT arşivine/i });
    expect(link).toHaveAttribute('href', 'https://www.titck.gov.tr/kubkt');
  });
});
