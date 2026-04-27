import { useEffect } from 'react';
import { X, Pill, Layers, Tag, FileText } from 'lucide-react';

const META = {
  ingredient: {
    icon: Pill,
    color: 'purple',
    title: 'Etken Madde',
    quality: 'En güvenilir',
    explanation: 'İlacın etken maddesi, bu hastalığın tedavisinde kullanılanlardan biri.',
  },
  atc: {
    icon: Layers,
    color: 'blue',
    title: 'ATC Sınıfı',
    quality: 'Güvenilir',
    explanation: 'İlaç, bu hastalık için kullanılan ilaç sınıfında yer alıyor.',
  },
  category: {
    icon: Tag,
    color: 'emerald',
    title: 'Kategori',
    quality: 'Orta',
    explanation: 'İlacın kategorisi, tedavi kategorisi ile örtüşüyor.',
  },
  description: {
    icon: FileText,
    color: 'amber',
    title: 'Prospektüs',
    quality: 'Düşük',
    explanation: 'Hastalığın adı ilacın prospektüsünde geçiyor. Doğrudan kullanım amacı olmayabilir.',
  },
};

const COLOR_BG = {
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function MatchSourceModal({ drug, conditionDescription, onClose }) {
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!drug) return null;
  const meta = META[drug.matchSource] || META.description;
  const Icon = meta.icon;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-border shadow-2xl w-[460px] max-w-full overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Eşleşme Detayı</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-bg-primary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[11px] text-text-muted">İlaç</p>
            <p className="text-sm font-semibold text-text-primary mt-0.5">{drug.name}</p>
            {drug.activeIngredient && (
              <p className="text-[11px] text-text-muted mt-0.5">
                Etken madde: <span className="text-text-secondary">{drug.activeIngredient}</span>
              </p>
            )}
          </div>

          {conditionDescription && (
            <div>
              <p className="text-[11px] text-text-muted">Aranan</p>
              <p className="text-sm text-text-secondary mt-0.5">{conditionDescription}</p>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${COLOR_BG[meta.color]}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{meta.title}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{meta.quality}</p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed mt-3">
              {meta.explanation}
            </p>

            {drug.matchReason && (
              <div className="mt-3 p-3 rounded-lg bg-bg-primary border border-border">
                <p className="text-[11px] text-text-muted mb-1">Eşleşme nedeni</p>
                <p className="text-xs text-text-primary font-medium">{drug.matchReason}</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-bg-primary/50">
          <p className="text-[10px] text-text-muted leading-relaxed">
            Etken madde eşleşmesi en güvenilir, prospektüs ise zayıf olarak eşleşiyor. Son kararı doktora veya eczacıya bırakın.
          </p>
        </div>
      </div>
    </div>
  );
}
