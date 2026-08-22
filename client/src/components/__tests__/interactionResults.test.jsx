// @vitest-environment jsdom
// "Bilinmiyor" kartlarının görünürlüğü: sessiz boşluk UX denetimi. Kural
// bulunamayan çift gri karta düşer; bu kart varsayılan katlıyken kullanıcı
// sonucu "risk yok" okuyordu.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import InteractionResults from '../InteractionResults.jsx';

afterEach(cleanup);

const unknownCard = (n) => ({
  drug1: `İLAÇ A${n}`, drug2: `İLAÇ B${n}`, id1: `a${n}`, id2: `b${n}`,
  risk: 'unknown',
  message: 'Bu ilaç çifti için veritabanımızda bilinen bir etkileşim kuralı yok.',
  details: null,
});
const highCard = {
  drug1: 'COUMADIN', drug2: 'ASPIRIN', id1: '1', id2: '2',
  risk: 'critical', message: 'Ciddi kanama riski.', details: 'Mekanizma metni.',
};

describe('InteractionResults — bilinmeyen sonuç görünürlüğü', () => {
  it('TÜM sonuçlar bilinmiyor ise kartlar katlanmadan doğrudan görünür', () => {
    render(<InteractionResults interactions={[unknownCard(1)]} unknownDrugs={[]} onPrintBlocked={vi.fn()} />);
    expect(screen.getByText('İLAÇ A1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sonucu göster/i })).not.toBeInTheDocument();
  });

  it('karışık sonuçlarda özet bandında "bilinen kural yok" satırı görünür', () => {
    render(<InteractionResults interactions={[highCard, unknownCard(1), unknownCard(2)]} unknownDrugs={[]} onPrintBlocked={vi.fn()} />);
    expect(screen.getByText(/2 çift için bilinen kural yok/i)).toBeInTheDocument();
    // Yüksek riskli kart görünür, unknown kartlar hâlâ katlı (buton mevcut)
    expect(screen.getByText('COUMADIN')).toBeInTheDocument();
    expect(screen.queryByText('İLAÇ A1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /düşük öncelikli sonucu göster/i })).toBeInTheDocument();
  });

  it('"bilinen kural yok" satırına tıklayınca unknown kartları filtrelenip açılır', async () => {
    const user = userEvent.setup();
    render(<InteractionResults interactions={[highCard, unknownCard(1)]} unknownDrugs={[]} onPrintBlocked={vi.fn()} />);
    await user.click(screen.getByText(/1 çift için bilinen kural yok/i));
    expect(screen.getByText('İLAÇ A1')).toBeInTheDocument();
  });
});
