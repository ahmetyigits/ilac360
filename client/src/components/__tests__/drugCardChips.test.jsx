// @vitest-environment jsdom
// Özel durum çipleri: yalnız prospektüste karşılığı olan başlıklar çip olur;
// tıklama ilgili bölümü açar. Çipler veri üretmez — mevcut metne kısayoldur.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

// vi.mock fabrikası dosya başına kaldırılır (hoist) — fabrikanın kullandığı
// değerler de vi.hoisted ile birlikte kaldırılmalı.
const { DESC } = vi.hoisted(() => {
  // İlk bölüm 400 karakteri aşsın: kapalı görünümün önizlemesi (ilk 400 kr)
  // gebelik metnini içermesin ki "tıklamadan görünmüyor" iddiası test edilebilsin.
  const FILLER = 'Bu bölümde ilacın kullanımına dair genel bilgiler yer alır ve yeterince uzundur. '.repeat(6);
  return {
    DESC: [
      '1. PAROL nedir ve ne için kullanılır?',
      FILLER,
      '2. PAROL kullanmadan önce dikkat edilmesi gerekenler',
      'Hamilelik',
      'İlacı kullanmadan önce doktorunuza veya eczacınıza danışınız. Gebelik döneminde dikkatli kullanılmalıdır.',
      'Emzirme',
      'Emzirme döneminde doktor önerisiyle kullanılabilir.',
      'Araç ve makine kullanımı',
      'Araç kullanma becerisi üzerinde bilinen bir etkisi yoktur.',
      '3. PAROL nasıl kullanılır?',
      FILLER,
    ].join('\n'),
  };
});

vi.mock('../../data/api', () => ({
  getDrugDetail: vi.fn().mockResolvedValue({
    id: '1', name: 'PAROL 500 MG TABLET', activeIngredient: 'Parasetamol',
    atcCode: 'N02BE01', barcode: '8699536190869', mainCategory: 'Analjezik',
    categories: ['Analjezik'], warnings: [], description: DESC, hasIngredientData: true,
  }),
  getEquivalents: vi.fn().mockResolvedValue([]),
}));

import DrugCard from '../DrugCard.jsx';

afterEach(cleanup);

describe('DrugCard — özel durum çipleri', () => {
  it('yalnız prospektüste bulunan başlıklar çip olur', async () => {
    render(<DrugCard drug={{ id: '1' }} onClose={vi.fn()} />);
    expect(await screen.findByText('Özel Durumlar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gebelik' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emzirme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Araç Kullanımı' })).toBeInTheDocument();
    // Metinde olmayan başlıklar çip ÜRETMEZ
    expect(screen.queryByRole('button', { name: 'Böbrek Yetmezliği' })).not.toBeInTheDocument();
  });

  it('çipe tıklayınca ilgili prospektüs bölümü açılır', async () => {
    const user = userEvent.setup();
    render(<DrugCard drug={{ id: '1' }} onClose={vi.fn()} />);
    await screen.findByText('Özel Durumlar');
    expect(screen.queryByText(/Gebelik döneminde dikkatli/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gebelik' }));
    expect(await screen.findByText(/Gebelik döneminde dikkatli/)).toBeInTheDocument();
  });
});
