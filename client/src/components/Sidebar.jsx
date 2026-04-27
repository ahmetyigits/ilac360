import { useState } from 'react';
import { Pill, FlaskConical, Info, Settings, Menu, X, Moon, Sun } from 'lucide-react';

const navItems = [
  { id: 'checker', icon: FlaskConical, label: 'İlaç Kontrol' },
  { id: 'about', icon: Info, label: 'Hakkında' },
];

export default function Sidebar({ currentView, onNavigate, darkMode, onToggleDark, selectedCount }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobil hamburger butonu */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-lg bg-bg-sidebar text-white flex items-center justify-center shadow-lg cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay (mobil) */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        w-[220px] bg-bg-sidebar flex flex-col shrink-0 border-r border-white/5
        fixed lg:relative inset-y-0 left-0 z-40
        transform transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-5 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Pill className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <h1 className="text-white text-[15px] font-bold leading-tight tracking-tight">ilac360</h1>
              <p className="text-white/40 text-[10px] leading-tight mt-0.5">İlaç Etkileşim Kontrolü</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-white/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav aria-label="Ana menü" className="flex-1 px-3 mt-1">
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider px-3 mb-2">Menü</p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const badge = item.id === 'checker' && selectedCount > 0 ? selectedCount : null;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-150 cursor-pointer relative ${
                    isActive
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
                  )}
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {badge && (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center px-1">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="px-3 pb-5 space-y-3">
          {/* Dark Mode Toggle */}
          <div className="px-3">
            <button
              onClick={onToggleDark}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] text-white/40 hover:text-white/70 hover:bg-white/5 transition-all cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{darkMode ? 'Açık Tema' : 'Koyu Tema'}</span>
            </button>
          </div>

          <div className="border-t border-white/5 pt-4 px-3">
            <div className="flex items-center gap-2 text-white/30">
              <Settings className="w-3.5 h-3.5" />
              <span className="text-[11px]">v1.0</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
