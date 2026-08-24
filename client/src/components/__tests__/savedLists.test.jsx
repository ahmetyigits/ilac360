// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import SavedLists from '../SavedLists.jsx';

afterEach(cleanup);

const noop = () => {};
const baseProps = {
  savedLists: [], favorites: [], canSave: false,
  onSaveCurrent: noop, onLoadList: noop, onDeleteList: noop, onAddFavorite: noop,
};

describe('SavedLists', () => {
  it('gösterilecek bir şey yoksa hiç render etmez', () => {
    const { container } = render(<SavedLists {...baseProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('canSave iken kaydet akışı: ad girip Kaydet çağrısı yapar', async () => {
    const user = userEvent.setup();
    const onSaveCurrent = vi.fn();
    render(<SavedLists {...baseProps} canSave onSaveCurrent={onSaveCurrent} />);
    await user.click(screen.getByRole('button', { name: /bu listeyi kaydet/i }));
    await user.type(screen.getByLabelText('Liste adı'), 'Annem');
    await user.click(screen.getByRole('button', { name: /listeyi kaydet/i }));
    expect(onSaveCurrent).toHaveBeenCalledWith('Annem');
  });

  it('kayıtlı liste çipi: tıklayınca yükler, × ile siler', async () => {
    const user = userEvent.setup();
    const onLoadList = vi.fn();
    const onDeleteList = vi.fn();
    const list = { id: '3', name: 'Sabah', savedAt: 0, d: ['1', '2'], f: ['greyfurt'] };
    render(<SavedLists {...baseProps} savedLists={[list]} onLoadList={onLoadList} onDeleteList={onDeleteList} />);
    await user.click(screen.getByRole('button', { name: /Sabah listesini yükle/i }));
    expect(onLoadList).toHaveBeenCalledWith(list);
    await user.click(screen.getByRole('button', { name: /Sabah listesini sil/i }));
    expect(onDeleteList).toHaveBeenCalledWith('3');
  });

  it('favori çipi: tıklayınca listeye ekler', async () => {
    const user = userEvent.setup();
    const onAddFavorite = vi.fn();
    const fav = { id: '9', name: 'PAROL' };
    render(<SavedLists {...baseProps} favorites={[fav]} onAddFavorite={onAddFavorite} />);
    await user.click(screen.getByRole('button', { name: /PAROL listeye ekle/i }));
    expect(onAddFavorite).toHaveBeenCalledWith(fav);
  });
});
