import { Github } from 'lucide-react';

// 3A footer: üst çizgili tek satır — solda marka + bağlantılar, sağda düz uyarı metni.
export default function Footer({ onNavigate }) {
  return (
    <footer className="w-full border-t border-border mt-10">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-12 py-[30px] flex flex-col sm:flex-row justify-between items-center gap-5">
        <span className="text-[16px] font-semibold text-text-primary flex items-center gap-3">
          <span>
            ilaç<span className="text-accent">360</span>{' '}
            <span className="font-normal text-text-muted text-[13px]">© 2026</span>
          </span>
          <button
            onClick={() => onNavigate?.('about')}
            className="text-[13px] font-normal text-text-muted hover:text-accent transition-colors cursor-pointer"
          >
            Hakkında
          </button>
          <a
            href="https://github.com/ahmetyigits/ilac360"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub deposu"
            className="text-text-muted hover:text-accent transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
        </span>
        <span className="text-[12.5px] leading-normal text-text-muted max-w-[430px] text-center sm:text-right">
          Bu araç yalnızca bilgilendirme amaçlıdır ve hekim veya eczacı tavsiyesinin
          yerine geçmez.
        </span>
      </div>
    </footer>
  );
}
