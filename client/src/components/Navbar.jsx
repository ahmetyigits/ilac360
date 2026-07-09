import { Moon, Sun, Database } from 'lucide-react';

// Tasarımdaki artı-haç logo (SVG yerine saf div — tasarım dosyasıyla birebir)
export function BrandMark({ size = 36 }) {
  const bar = Math.round(size * 0.44);
  const thick = Math.round(size * 0.11);
  return (
    <div
      className="relative rounded-[10px] bg-accent flex-none"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white"
        style={{ width: bar, height: thick }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white"
        style={{ width: thick, height: bar }}
      />
    </div>
  );
}

export function BrandName({ className = 'text-xl' }) {
  return (
    <span className={`font-bold tracking-tight text-text-primary ${className}`}>
      ilaç<span className="text-accent">360</span>
    </span>
  );
}

export default function Navbar({ currentView, searchMode, onNavigate, darkMode, onToggleDark }) {
  const links = [
    { id: 'drug', label: 'İlaç Ara', active: currentView === 'checker' && searchMode === 'drug' },
    { id: 'condition', label: 'Hastalığa Göre', active: currentView === 'checker' && searchMode === 'condition' },
    { id: 'about', label: 'Hakkında', active: currentView === 'about' },
  ];

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => onNavigate('drug')}
          className="flex items-center gap-2.5 cursor-pointer"
          aria-label="Ana sayfa"
        >
          <BrandMark size={36} />
          <BrandName />
        </button>

        <nav aria-label="Ana menü" className="flex items-center gap-1 sm:gap-2 order-3 sm:order-2 w-full sm:w-auto justify-center">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`px-3.5 py-2 rounded-lg text-[15px] transition-colors cursor-pointer ${
                link.active
                  ? 'text-accent font-semibold'
                  : 'text-text-secondary font-medium hover:text-text-primary hover:bg-bg-primary'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 order-2 sm:order-3">
          <span className="hidden md:inline-flex items-center gap-2 text-[13px] font-medium text-accent bg-accent-soft border border-accent/15 rounded-full px-3.5 py-1.5">
            <Database className="w-3.5 h-3.5" />
            TİTCK ürün verisi
          </span>
          <button
            onClick={onToggleDark}
            title={darkMode ? 'Açık tema' : 'Koyu tema'}
            aria-label={darkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
