// @vitest-environment jsdom
// Kişiye göre değerlendirme: gebe profili girilince gebelik uyarısı "Bu profil
// için" rozetiyle öne çıkar; HİÇBİR uyarı gizlenmez.

import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const detail = {
  id: '5', name: 'WARFARIN 5 MG', activeIngredient: 'Varfarin',
  atcCode: 'B01AA03', barcode: null, categories: ['Kan'],
  description: null, isSupplement: false, prescriptionType: null,
  warnings: [
    { id: 'W-x1', type: 'general', severity: 'info', title: 'Genel not', message: 'm', source: 's' },
    { id: 'W-x2', type: 'pregnancy', severity: 'critical', title: 'Gebelikte kullanılmaz', message: 'm', source: 's' },
  ],
};

vi.mock('../../data/api', () => ({
  getDrugDetail: vi.fn().mockImplementation(() => Promise.resolve(detail)),
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

afterEach(cleanup);

import DrugCard from '../DrugCard.jsx';

describe('DrugCard — kişiye göre değerlendirme', () => {
  it('gebe profili gebelik uyarısını "Bu profil için" ile vurgular ve hiçbir uyarı gizlenmez', async () => {
    localStorage.setItem('profile_v1', JSON.stringify({ sex: 'k', ageBand: null, pregnant: true, breastfeeding: false }));
    render(<DrugCard drug={{ id: '5' }} onClose={vi.fn()} />);

    // Gebelik uyarısı profil rozetiyle işaretli
    expect(await screen.findByText('Bu profil için')).toBeInTheDocument();
    // Profil özeti görünür
    expect(screen.getByText(/Profil \(/)).toBeInTheDocument();
    // Her İKİ uyarı da hâlâ görünür (gizleme yok)
    expect(screen.getByText('Gebelikte kullanılmaz')).toBeInTheDocument();
    expect(screen.getByText('Genel not')).toBeInTheDocument();
  });

  it('profil yokken rozet/özet çıkmaz, "Kişiye göre değerlendir" düğmesi görünür', async () => {
    localStorage.clear();
    render(<DrugCard drug={{ id: '5' }} onClose={vi.fn()} />);
    expect(await screen.findByText(/Kişiye göre değerlendir/)).toBeInTheDocument();
    expect(screen.queryByText('Bu profil için')).not.toBeInTheDocument();
  });
});
