// @vitest-environment jsdom
// Takviye edici gıda detay kartı: "Takviye" rozeti + "ilaç değildir" bloğu +
// kaynak/GGBS bağlantısı. Takviyeler prospektüs-yok metnini GÖSTERMEZ.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('../../data/api', () => ({
  getDrugDetail: vi.fn().mockResolvedValue({
    id: '9000001', name: 'PHARMATON VITALITY KAPSÜL',
    activeIngredient: 'Ginseng G115, Demir, Magnezyum, Çinko',
    atcCode: null, barcode: null, categories: ['Takviye Edici Gıda', 'Multivitamin + Ginseng'],
    description: null, warnings: [],
    isSupplement: true, supplementBrand: 'Pharmaton (Opella/Sanofi)',
    supplementSource: 'https://www.pharmaton.com/tr-tr/urunler/pharmaton-vitality',
    supplementApproval: null,
  }),
  getEquivalents: vi.fn().mockResolvedValue([]),
}));

import DrugCard from '../DrugCard.jsx';

afterEach(cleanup);

describe('DrugCard — takviye edici gıda', () => {
  it('rozet + "ilaç değildir" bloğu + kaynak bağlantısı görünür', async () => {
    render(<DrugCard drug={{ id: '9000001' }} onClose={vi.fn()} />);
    // "Takviye Edici Gıda" birden çok yerde meşru (başlık rozeti + kategori) —
    // en az rozet dahil ≥1 kez görünmesi yeter.
    expect((await screen.findAllByText('Takviye Edici Gıda')).length).toBeGreaterThan(0);
    expect(screen.getByText(/takviye edici gıdadır, ilaç değildir/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /İçerik kaynağı/ })).toHaveAttribute('href', expect.stringContaining('pharmaton.com'));
    // Onay no boş → GGBS sorgu bağlantısı gösterilir
    expect(screen.getByRole('link', { name: /GGBS/ })).toBeInTheDocument();
    // İlaçlara özgü "prospektüs yok → TİTCK" metni takviyede GÖRÜNMEZ
    expect(screen.queryByText(/prospektüs bilgisi veritabanımızda mevcut değildir/)).not.toBeInTheDocument();
  });
});
