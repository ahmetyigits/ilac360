import { ExternalLink, Github } from 'lucide-react';

// Tasarım 1A: koyu lacivert footer bandı.
export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-ink text-slate-400 mt-10">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-[15px] font-semibold text-white">
          ilaç<span className="text-blue-400">360</span>
        </div>
        <div className="flex items-center gap-6 text-sm flex-wrap justify-center">
          <button
            onClick={() => onNavigate?.('about')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Hakkında
          </button>
          <a
            href="https://titck.gov.tr/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors inline-flex items-center gap-1"
          >
            Veri kaynağı: TİTCK <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://github.com/ahmetyigits/ilac360"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <Github className="w-3.5 h-3.5" /> Açık kaynak
          </a>
        </div>
        <div className="text-[13px] text-slate-500">© 2026 ilaç360</div>
      </div>
    </footer>
  );
}
