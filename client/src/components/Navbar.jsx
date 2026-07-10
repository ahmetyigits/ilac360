import { Moon, Sun } from 'lucide-react';

// 3A logosu: gradyan kare içinde beyaz kapsül (ortasında ayırma çizgisi)
export function BrandMark({ size = 32 }) {
  const capW = Math.round(size * 0.47);
  const capH = Math.round(size * 0.19);
  return (
    <div
      className="relative rounded-[10px] flex-none flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(145deg,#2E6FB8,#1E4E86)',
        boxShadow: '0 6px 14px -6px rgba(37,99,168,.7)',
      }}
      aria-hidden="true"
    >
      <div className="relative bg-white" style={{ width: capW, height: capH, borderRadius: capH }}>
        <div
          className="absolute top-0"
          style={{ left: '50%', width: '1.4px', height: '100%', background: 'rgba(37,99,168,.55)', transform: 'translateX(-.7px)' }}
        />
      </div>
    </div>
  );
}

export function BrandName({ className = 'text-xl' }) {
  return (
    <span className={`font-semibold tracking-tight text-text-primary ${className}`}>
      ilaç<span className="text-accent">360</span>
    </span>
  );
}

export default function Navbar({ currentView, searchMode, onNavigate, onLogoClick, darkMode, onToggleDark }) {
  const links = [
    { id: 'drug', label: 'İlaç Ara', active: currentView === 'checker' && searchMode === 'drug' },
    { id: 'condition', label: 'Hastalığa Göre', active: currentView === 'checker' && searchMode === 'condition' },
    { id: 'about', label: 'Hakkında', active: currentView === 'about' },
  ];

  return (
    <header className="bg-bg-primary">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-12 py-5 sm:py-6 flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => (onLogoClick ? onLogoClick() : onNavigate('drug'))}
          className="flex items-center gap-2.5 cursor-pointer"
          aria-label="Ana sayfaya dön"
        >
          <BrandMark size={32} />
          <BrandName className="text-[20px]" />
        </button>

        <nav aria-label="Ana menü" className="flex items-center gap-1 sm:gap-4 order-3 sm:order-2 w-full sm:w-auto justify-center">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`px-2.5 py-1.5 text-[14px] font-medium transition-colors cursor-pointer ${
                link.active ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 order-2 sm:order-3">
          <button
            onClick={() => onNavigate('drug')}
            className="hidden sm:inline-block px-[19px] py-2.5 bg-ink text-bg-primary rounded-[10px] text-[13.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Kontrole Başla
          </button>
          <button
            onClick={onToggleDark}
            title={darkMode ? 'Açık tema' : 'Koyu tema'}
            aria-label={darkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
            className="w-9 h-9 rounded-[10px] border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-card transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
