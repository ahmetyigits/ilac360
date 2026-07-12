import { useState, useEffect, useRef } from 'react';
import { Tag, Layers, Barcode, FolderTree, FileText, Loader2, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { getDrugDetail } from '../data/api';
import { reportError } from '../data/telemetry.js';

function parseDescription(raw) {
  if (!raw || raw.trim().length === 0) return null;
  if (raw.includes('İkinci siteye ait içerik bulunamadı')) return null;

  const text = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Yapışık cümleleri ayır: "KULLANMAYINIZ.Eğer" → "KULLANMAYINIZ. Eğer"
    .replace(/([.!?])([A-ZÇĞİÖŞÜa-zçğıöşü])/g, '$1 $2')
    // Küçük harften büyük harfe geçişlerde ayır: "tabletDOLARIT" → "tablet DOLARIT"
    .replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2')
    // Sayfa numaralarını temizle
    .replace(/\d+\s*\/\s*\d+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const sectionRegex = /([1-5])\.\s+([A-ZÇĞİÖŞÜ][^\n]{5,})/g;
  const allMatches = [...text.matchAll(sectionRegex)];

  const withGap = allMatches.map((m, i) => {
    const nextMatch = allMatches[i + 1];
    const gap = nextMatch
      ? nextMatch.index - (m.index + m[0].length)
      : text.length - (m.index + m[0].length);
    return { match: m, gap };
  });

  const contentSections = withGap.filter((item) => item.gap > 50);

  const uniqueSections = [];
  const seenNumbers = new Set();
  for (const item of contentSections) {
    const num = item.match[1];
    if (!seenNumbers.has(num)) {
      seenNumbers.add(num);
      uniqueSections.push(item.match);
    }
  }

  if (uniqueSections.length < 2) {
    return [{ title: null, content: text }];
  }

  const sections = [];

  const beforeFirst = text.slice(0, uniqueSections[0].index).trim();
  if (beforeFirst.length > 20) {
    sections.push({ title: null, content: beforeFirst });
  }

  for (let i = 0; i < uniqueSections.length; i++) {
    const start = uniqueSections[i].index;
    const end = i + 1 < uniqueSections.length ? uniqueSections[i + 1].index : text.length;
    const fullText = text.slice(start, end).trim();

    const titleEnd = fullText.indexOf('\n');
    const title = titleEnd > 0 ? fullText.slice(0, titleEnd).trim() : fullText.slice(0, 100).trim();
    const content = titleEnd > 0 ? fullText.slice(titleEnd + 1).trim() : '';

    sections.push({ title, content });
  }

  return sections;
}

// Not: App bu bileşeni key={drug.id} ile render eder; ilaç değişince bileşen
// sıfır state ile yeniden kurulur, effect içinde senkron state sıfırlamaya gerek kalmaz.
export default function DrugCard({ drug, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [retryToken, setRetryToken] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => {
    let stale = false;
    getDrugDetail(drug.id)
      .then((data) => {
        if (stale) return;
        if (!data) throw new Error('Not found');
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        reportError(err, 'drugDetail');
        if (stale) return;
        setError(true);
        setLoading(false);
      });
    return () => { stale = true; };
  }, [drug.id, retryToken]);

  // Escape ile kapatma — kart satır içi panel olduğundan global dinleyici yerine
  // yalnızca odak panel içindeyken (veya odak serbestken) kapatılır; başka bir
  // modal/girdi açıkken Escape bu paneli yanlışlıkla kapatmaz.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== 'Escape') return;
      const active = document.activeElement;
      const insidePanel = panelRef.current?.contains(active);
      const focusFree = !active || active === document.body;
      if (insidePanel || focusFree) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 3A kart iskeleti: geniş yarıçap, yumuşak derin gölge, cömert iç boşluk
  const shell = 'bg-card rounded-[20px] border border-ink/10 shadow-[0_30px_70px_-34px_rgba(20,32,46,.4)]';

  if (loading) {
    return (
      <div className={`${shell} flex items-center justify-center py-14`}>
        <Loader2 className="w-5 h-5 text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${shell} overflow-hidden animate-slide-up`}>
        <div className="px-5 sm:px-[26px] py-4 border-b border-border-light flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[.18em] uppercase text-accent">İlaç Detayı</span>
          <button
            onClick={onClose}
            aria-label="İlaç detayını kapat"
            className="w-8 h-8 rounded-[10px] border border-border hover:bg-bg-primary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-10 text-center">
          <p className="text-sm text-text-muted mb-4">İlaç detayları yüklenirken bir hata oluştu.</p>
          <button
            onClick={() => {
              setError(false);
              setLoading(true);
              setRetryToken((t) => t + 1);
            }}
            className="px-5 py-2.5 bg-accent text-white rounded-[11px] text-sm font-semibold hover:bg-accent-deep transition-colors cursor-pointer"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const categories = detail.categories || [];

  const sections = parseDescription(detail.description);
  const hasDescription = sections && sections.length > 0;

  return (
    <div ref={panelRef} tabIndex={-1} className={`${shell} overflow-hidden animate-slide-up`}>
      {/* Başlık: mono kicker + display ilaç adı */}
      <div className="px-5 sm:px-[26px] pt-5 sm:pt-[22px] pb-4 border-b border-border-light flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="font-mono text-[11px] tracking-[.18em] uppercase text-accent">İlaç Detayı</span>
          <h2 className="font-display font-bold text-[20px] sm:text-[24px] leading-snug tracking-tight text-text-primary mt-1.5 [text-wrap:balance]">
            {detail.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="İlaç detayını kapat"
          className="flex-none w-9 h-9 rounded-[10px] border border-border hover:bg-bg-primary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 sm:p-[26px] space-y-5">
        {/* Kimlik bilgileri — inset paneller, mono etiketler */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <InfoCard icon={Tag} label="Etkin Madde" value={detail.activeIngredient || '—'} missing={!detail.activeIngredient} />
          <InfoCard icon={Layers} label="ATC Kodu" value={detail.atcCode || '—'} missing={!detail.atcCode} mono />
          <InfoCard icon={Barcode} label="Barkod" value={detail.barcode || '—'} missing={!detail.barcode} mono />
          <InfoCard icon={FolderTree} label="Ana Kategori" value={categories[0] || '—'} missing={!categories[0]} />
        </div>

        {!detail.activeIngredient && (
          <div className="flex items-start gap-3.5 rounded-[14px] border border-[#EAD9B8] bg-[#FBF3E2]/80 dark-warn p-4">
            <div className="flex-none w-[38px] h-[38px] rounded-[11px] bg-[#B5761E] text-white flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-[#7A4E12] warn-title">Etkin madde bilgisi eksik</p>
              <p className="text-[12.5px] leading-relaxed text-[#8A6320] mt-0.5">
                Bu ilacın etkin madde bilgisi veritabanında bulunmuyor. Etkileşim analizi sınırlı olabilir;
                kesin bilgi için prospektüse ve eczacınıza danışınız.
              </p>
            </div>
          </div>
        )}

        {categories.length > 1 && (
          <div>
            <p className="font-mono text-[10.5px] tracking-[.12em] uppercase text-text-muted mb-2.5">Tüm Kategoriler</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c, i) => (
                <span
                  key={i}
                  className="text-[12px] font-medium text-accent bg-accent-soft px-3 py-1.5 rounded-[20px]"
                >
                  {c.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasDescription && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10.5px] tracking-[.12em] uppercase text-text-muted flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-accent" />
                Prospektüs / Kullanma Talimatı
              </p>
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-[12.5px] text-accent hover:text-accent-deep font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showFullDesc ? 'Gizle' : 'Tümünü Göster'}
                {showFullDesc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {!showFullDesc ? (
              <div className="bg-card-inset rounded-[14px] p-4 sm:p-5">
                <p className="text-[13.5px] text-text-secondary leading-[1.6]">
                  {(detail.description || '').slice(0, 400).trim()}
                  {(detail.description || '').length > 400 && '...'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sections.map((section, i) => (
                  <DescriptionSection
                    key={i}
                    section={section}
                    index={i}
                    expanded={expandedSection === i}
                    onToggle={() => setExpandedSection(expandedSection === i ? null : i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!hasDescription && (
          <div className="bg-card-inset rounded-[14px] p-5 text-center">
            <p className="text-[13.5px] text-text-muted">
              Bu ilaç için prospektüs bilgisi veritabanımızda mevcut değildir.
            </p>
            <p className="text-[12.5px] text-text-muted mt-1">
              Güncel ve resmi bilgi için <a
                href="https://www.titck.gov.tr/kubkt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >TİTCK KÜB/KT arşivine</a> başvurunuz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, missing, mono }) {
  return (
    <div className="bg-card-inset rounded-[13px] p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-accent" />
        <p className="font-mono text-[10px] text-text-muted uppercase tracking-[.1em]">{label}</p>
      </div>
      <p className={`text-[13.5px] leading-snug break-words ${
        missing ? 'text-text-muted italic font-medium' : mono ? 'font-mono text-accent font-bold text-[12.5px]' : 'text-text-primary font-semibold'
      }`}>
        {value}
      </p>
    </div>
  );
}

function DescriptionSection({ section, expanded, onToggle }) {
  if (!section.title) {
    return (
      <div className="bg-card-inset rounded-[14px] p-4 sm:p-5">
        <p className="text-[13.5px] text-text-secondary leading-[1.6] whitespace-pre-line">
          {section.content}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card-inset rounded-[14px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-left hover:bg-accent-soft/50 transition-colors cursor-pointer"
      >
        <span className="text-[13.5px] font-semibold text-text-primary pr-4">
          {section.title.match(/^(\d+)\.\s*(.*)/) ? (
            <>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-accent-soft text-accent font-mono text-[11px] font-bold mr-2.5">{section.title.match(/^(\d+)/)[1]}</span>
              {section.title.replace(/^\d+\.\s*/, '')}
            </>
          ) : section.title}
        </span>
        {section.content && (
          <span className="shrink-0">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </span>
        )}
      </button>
      {expanded && section.content && (
        <div className="px-4 sm:px-5 pb-4 border-t border-border-light">
          <p className="text-[13.5px] text-text-secondary leading-[1.6] whitespace-pre-line pt-3.5">
            {section.content}
          </p>
        </div>
      )}
    </div>
  );
}
