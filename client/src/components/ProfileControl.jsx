import { UserCog, X } from 'lucide-react';
import { isProfileSet } from '../data/profileRelevance.js';

// Kişiye göre değerlendirme için kompakt hasta profili girişi (cinsiyet + yaş
// bandı + gebe/emziren). Değeri yukarıdan gelir; her değişiklikte tam profili
// onChange ile döndürür. Kadın değilse gebe/emziren gizlenir.

const SEXES = [
  { key: 'k', label: 'Kadın' },
  { key: 'e', label: 'Erkek' },
];
const AGES = [
  { key: 'bebek', label: 'Bebek' },
  { key: 'cocuk', label: 'Çocuk' },
  { key: 'ergen', label: 'Ergen' },
  { key: 'yetiskin', label: 'Yetişkin' },
  { key: 'yasli', label: 'Yaşlı' },
];

function Chip({ active, onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`px-2.5 py-1 rounded-full text-[12.5px] font-medium border transition-colors cursor-pointer ${
        active
          ? 'bg-accent text-white border-accent'
          : 'bg-card border-border text-text-secondary hover:border-accent/50'
      }`}
    >
      {children}
    </button>
  );
}

export default function ProfileControl({ profile, onChange, onClear }) {
  const set = (patch) => onChange({ ...profile, ...patch });

  return (
    <div className="bg-card-inset rounded-[14px] border border-border-light p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
          <UserCog className="w-4 h-4 text-accent" />
          Kişiye göre değerlendir
        </span>
        {isProfileSet(profile) && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-[12px] text-text-muted hover:text-accent transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Temizle
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] text-text-muted mr-1">Cinsiyet:</span>
        {SEXES.map((s) => (
          <Chip
            key={s.key}
            active={profile.sex === s.key}
            ariaLabel={`Cinsiyet: ${s.label}`}
            onClick={() => set({ sex: profile.sex === s.key ? null : s.key })}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] text-text-muted mr-1">Yaş:</span>
        {AGES.map((a) => (
          <Chip
            key={a.key}
            active={profile.ageBand === a.key}
            ariaLabel={`Yaş: ${a.label}`}
            onClick={() => set({ ageBand: profile.ageBand === a.key ? null : a.key })}
          >
            {a.label}
          </Chip>
        ))}
      </div>

      {profile.sex === 'k' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-text-muted mr-1">Durum:</span>
          <Chip active={profile.pregnant} ariaLabel="Gebe" onClick={() => set({ pregnant: !profile.pregnant })}>
            Gebe
          </Chip>
          <Chip active={profile.breastfeeding} ariaLabel="Emziren" onClick={() => set({ breastfeeding: !profile.breastfeeding })}>
            Emziren
          </Chip>
        </div>
      )}

      <p className="text-[11px] text-text-muted leading-relaxed">
        Girdiğiniz profil yalnızca ilgili uyarıları öne çıkarır; hiçbir uyarı gizlenmez.
        Kişisel değerlendirme bilgilendirme amaçlıdır, hekim/eczacı değerlendirmesinin yerini tutmaz.
      </p>
    </div>
  );
}
