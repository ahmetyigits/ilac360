// @vitest-environment jsdom
// Footer bağlantıları: "Yenilikler" butonu gizli changelog sayfasını footer'dan
// erişilebilir kılıyor; doğru navigasyon id'siyle çağırdığını doğrula.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import Footer from '../Footer.jsx';

afterEach(cleanup);

describe('Footer', () => {
  it('Yenilikler butonu changelog navigasyonunu tetikler', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Footer onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button', { name: 'Yenilikler' }));
    expect(onNavigate).toHaveBeenCalledWith('changelog');
  });

  it('Hakkında butonu about navigasyonunu tetikler', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Footer onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button', { name: 'Hakkında' }));
    expect(onNavigate).toHaveBeenCalledWith('about');
  });
});
