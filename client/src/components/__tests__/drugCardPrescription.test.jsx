// @vitest-environment jsdom
// Reçete tipi rozeti: kontrole tabi ilaçta renkli "… Reçete" rozeti + kısa
// bilgilendirme; reçete tipi olmayan ilaçta rozet GÖRÜNMEZ.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const detail = {
  id: '1', name: 'RIVOTRIL 2 MG TABLET', activeIngredient: 'Klonazepam',
  atcCode: 'N03AE01', barcode: null, categories: ['Sinir Sistemi'],
  description: null, warnings: [], isSupplement: false,
  prescriptionType: 'yesil',
};

vi.mock('../../data/api', () => ({
  getDrugDetail: vi.fn().mockImplementation(() => Promise.resolve(globalThis.__rxDetail)),
  getEquivalents: vi.fn().mockResolvedValue([]),
}));

import DrugCard from '../DrugCard.jsx';

afterEach(cleanup);

describe('DrugCard — reçete tipi rozeti', () => {
  it('kontrole tabi ilaçta "Yeşil Reçete" rozeti + bilgilendirme görünür', async () => {
    globalThis.__rxDetail = detail;
    render(<DrugCard drug={{ id: '1' }} onClose={vi.fn()} />);
    expect(await screen.findByText('Yeşil Reçete')).toBeInTheDocument();
    expect(screen.getByText(/resmi reçete sınıfı TİTCK/i)).toBeInTheDocument();
  });

  it('reçete tipi olmayan ilaçta rozet render edilmez', async () => {
    globalThis.__rxDetail = { ...detail, name: 'MAJEZİK 100 MG', activeIngredient: 'Flurbiprofen', prescriptionType: null };
    render(<DrugCard drug={{ id: '2' }} onClose={vi.fn()} />);
    expect(await screen.findByText('MAJEZİK 100 MG')).toBeInTheDocument();
    expect(screen.queryByText(/Reçete$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/resmi reçete sınıfı TİTCK/i)).not.toBeInTheDocument();
  });
});
