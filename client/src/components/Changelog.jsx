import { Sparkles } from 'lucide-react';
import { CHANGELOG } from '../data/changelog.js';

const TAG_STYLE = {
  'YENİ': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'İYİLEŞTİRME': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'DÜZELTME': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function formatDate(iso) {
  // "2026-08-24" → "24 Ağustos 2026" (elle: yeni Date locale'e bağlı kalmasın)
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${Number(m[3])} ${AYLAR[Number(m[2]) - 1]} ${m[1]}`;
}

export default function Changelog() {
  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] p-5 sm:p-[26px]">
        <span className="font-mono text-[11px] tracking-[.18em] uppercase text-accent">Yenilikler</span>
        <h1 className="font-display font-bold text-[22px] sm:text-[26px] tracking-tight text-text-primary mt-1.5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          Sürüm Notları
        </h1>
        <p className="text-[13.5px] text-text-secondary mt-2 leading-relaxed">
          ilaç360'a eklenen yeni özellikler ve iyileştirmeler. En yeni güncelleme en üstte.
        </p>
      </div>

      {/* Sürümler */}
      {CHANGELOG.map((release) => (
        <div
          key={release.date}
          className="bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] p-5 sm:p-[26px]"
        >
          <div className="flex items-baseline justify-between gap-3 flex-wrap border-b border-border-light pb-4 mb-4">
            <h2 className="font-display font-bold text-[19px] tracking-tight text-text-primary">{release.title}</h2>
            <span className="font-mono text-[12px] text-text-muted">{formatDate(release.date)}</span>
          </div>

          {release.summary && (
            <p className="text-[14px] text-text-secondary leading-relaxed mb-5">{release.summary}</p>
          )}

          <ul className="space-y-4">
            {release.changes.map((c, i) => (
              <li key={i} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {c.tag && (
                    <span className={`text-[10px] font-bold px-1.5 py-px rounded-full uppercase tracking-wide ${TAG_STYLE[c.tag] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {c.tag}
                    </span>
                  )}
                  <span className="text-[15px] font-semibold text-text-primary">{c.title}</span>
                </div>
                {c.desc && <p className="text-[13px] text-text-muted leading-relaxed">{c.desc}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="text-[12px] text-text-muted text-center px-4">
        Bu araç yalnızca bilgilendirme amaçlıdır; hekim veya eczacı değerlendirmesinin yerine geçmez.
      </p>
    </div>
  );
}
