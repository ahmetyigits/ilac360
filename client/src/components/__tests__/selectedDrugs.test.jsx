// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import SelectedDrugs from '../SelectedDrugs.jsx';

afterEach(cleanup);

const twoDrugs = [
  { id: '1', name: 'PAROL', activeIngredient: 'Parasetamol' },
  { id: '2', name: 'ASPIRIN', activeIngredient: 'ASA' },
];
const base = {
  drugs: twoDrugs, onRemove: () => {}, onSelect: () => {}, activeDrugId: null,
  onAnalyze: () => {}, analysisLoading: false, onClearAll: () => {}, onToast: () => {},
};

describe('SelectedDrugs — favori yıldızı', () => {
  it('yıldıza tıklayınca onToggleFavorite çağrılır', async () => {
    const user = userEvent.setup();
    const onToggleFavorite = vi.fn();
    render(<SelectedDrugs {...base} favoriteIds={[]} onToggleFavorite={onToggleFavorite} />);
    await user.click(screen.getByRole('button', { name: /PAROL favorilere ekle/i }));
    expect(onToggleFavorite).toHaveBeenCalledWith('1');
  });

  it('favori ilaç yıldızı basılı (aria-pressed) gösterir', () => {
    render(<SelectedDrugs {...base} favoriteIds={['1']} onToggleFavorite={() => {}} />);
    expect(screen.getByRole('button', { name: /PAROL favorilerden çıkar/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('onToggleFavorite verilmezse yıldız render edilmez', () => {
    render(<SelectedDrugs {...base} />);
    expect(screen.queryByRole('button', { name: /favorilere ekle/i })).not.toBeInTheDocument();
  });
});

describe('SelectedDrugs — otomatik analiz anahtarı', () => {
  it('anahtar görünür ve tıklanınca onToggleAutoAnalyze çağrılır', async () => {
    const user = userEvent.setup();
    const onToggleAutoAnalyze = vi.fn();
    render(<SelectedDrugs {...base} autoAnalyze={false} onToggleAutoAnalyze={onToggleAutoAnalyze} />);
    const checkbox = screen.getByRole('checkbox', { name: /otomatik analiz/i });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(onToggleAutoAnalyze).toHaveBeenCalled();
  });

  it('autoAnalyze açıkken kutu işaretli', () => {
    render(<SelectedDrugs {...base} autoAnalyze onToggleAutoAnalyze={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /otomatik analiz/i })).toBeChecked();
  });
});
