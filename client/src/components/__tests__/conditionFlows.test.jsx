// @vitest-environment jsdom
// Keşfet gruplamasının DOM testleri: grup başlığı render'ı, klavye
// navigasyonunun başlık satırlarını atlaması, satırdan sepete ekleme.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import ConditionSearch from '../ConditionSearch.jsx';
import { setDrugsForTest } from '../../data/drugStore.js';
import { setInteractionsForTest } from '../../data/interactionEngine.js';
import { setConditionsForTest } from '../../data/conditionSearch.js';
import synonyms from '../../../../data/ingredient-synonyms.json';

const FIXTURE_DRUGS = [
  { ID: '1', Product_Name: 'PAROL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  { ID: '2', Product_Name: 'TAMOL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  { ID: '3', Product_Name: 'NUROFEN 200 MG TABLET', Active_Ingredient: 'İbuprofen', ATC_code: 'M01AE01' },
];

beforeAll(() => {
  setDrugsForTest(FIXTURE_DRUGS);
  setInteractionsForTest([], synonyms, {}, { adjuvants: [] }, { components: {} });
  setConditionsForTest([
    {
      id: 'bas-agrisi',
      names: ['baş ağrısı'],
      keywords: [],
      ingredients: ['parasetamol', 'ibuprofen'],
      priorityBrands: [],
      atcPrefixes: [],
      categories: [],
      description: 'Baş ağrısı için kullanılan ilaçlar',
    },
  ]);
});

// vitest globals kapalıyken RTL otomatik cleanup çalışmaz — elle bağla.
afterEach(cleanup);

async function searchHeadache(user) {
  await user.type(screen.getByRole('textbox', { name: /hastalık arama/i }), 'baş ağrısı');
  await user.keyboard('{Enter}');
  await waitFor(() => expect(screen.getByText('PAROL 500 MG TABLET')).toBeInTheDocument(), { timeout: 2000 });
}

describe('Keşfet gruplaması (DOM)', () => {
  it('çok üyeli grup başlık alır, tek üyeli sade satır kalır', async () => {
    const user = userEvent.setup();
    render(<ConditionSearch onSelect={vi.fn()} onViewDrug={vi.fn()} selectedDrugs={[]} />);
    await searchHeadache(user);

    // Parasetamol grubu (2 ürün) başlıklı; İbuprofen tek üyeli → başlıksız
    expect(screen.getByText('2 ürün')).toBeInTheDocument();
    expect(screen.queryByText('1 ürün')).not.toBeInTheDocument();
    // Grup üyeleri ardışık: PAROL ve TAMOL satırları listede var
    expect(screen.getByText('TAMOL 500 MG TABLET')).toBeInTheDocument();
  });

  it('ArrowDown başlık satırlarını atlayıp bir sonraki İLAÇ satırına odaklanır', async () => {
    const user = userEvent.setup();
    render(<ConditionSearch onSelect={vi.fn()} onViewDrug={vi.fn()} selectedDrugs={[]} />);
    await searchHeadache(user);

    const rows = screen.getAllByRole('button', { name: /detayı aç/i });
    expect(rows.length).toBe(3);
    rows[0].focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(rows[1]);
    await user.keyboard('{ArrowDown}');
    // İbuprofen grubunun başlığı yok ama olsaydı da atlanırdı: odak 3. satırda
    expect(document.activeElement).toBe(rows[2]);
  });

  it('satırdaki + butonu ilacı sepete ekler (grup başlığı akışı bozmaz)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ConditionSearch onSelect={onSelect} onViewDrug={vi.fn()} selectedDrugs={[]} />);
    await searchHeadache(user);

    const addButtons = screen.getAllByTitle('Etkileşim listesine ekle');
    await user.click(addButtons[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].name).toBe('PAROL 500 MG TABLET');
  });
});
