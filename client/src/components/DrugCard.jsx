import { useState, useEffect, useRef } from 'react';
import { Tag, Layers, Barcode, FolderTree, FileText, Loader2, X, ChevronDown, ChevronUp, AlertTriangle, Baby, ShieldAlert, Users, Car, Citrus, Pill, Info } from 'lucide-react';
import { getDrugDetail, getEquivalents } from '../data/api';
import { parseDescription, normalizeDescription } from '../data/descriptionFormat.js';
import { reportError } from '../data/telemetry.js';

// Tekil ilaç statik uyarıları — kutu piktogramı dili: tip ikonu + kısa başlık.
// Renkler InteractionResults'taki riskConfig tonlarıyla hizalıdır.
const WARNING_TYPE_CONFIG = {
  pregnancy: { icon: Baby, label: 'Gebelik' },
  allergy: { icon: ShieldAlert, label: 'Alerji' },
  age: { icon: Users, label: 'Yaş Sınırı' },
  driving: { icon: Car, label: 'Araç Kullanımı' },
  food: { icon: Citrus, label: 'Besin' },
  supplement: { icon: Pill, label: 'Takviye' },
  general: { icon: Info, label: 'Genel' },
};

const WARNING_SEVERITY_CONFIG = {
  critical: {
    card: 'border-red-200/70 bg-red-50/50 dark-risk-critical',
    iconBox: 'bg-red-700',
  },
  high: {
    card: 'border-[#EAD9B8] bg-[#FBF3E2]/80 dark-warn',
    iconBox: 'bg-[#B5761E]',
  },
  medium: {
    card: 'border-amber-100 bg-amber-50/50 dark-risk-medium',
    iconBox: 'bg-amber-500',
  },
  info: {
    card: 'border-accent-light bg-accent-soft/60',
    iconBox: 'bg-accent',
  },
};

// Not: App bu bileşeni key={drug.id} ile render eder; ilaç değişince bileşen
// sıfır state ile yeniden kurulur, effect içinde senkron state sıfırlamaya gerek kalmaz.
export default function DrugCard({ drug, onClose, onSelectDrug }) {
  const [detail, setDetail] = useState(null);
  const [equivalents, setEquivalents] = useState([]);
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
        // Eşdeğerler ayrı yüklenir; hata detay ekranını engellemez.
        getEquivalents(drug.id)
          .then((eq) => { if (!stale) setEquivalents(eq); })
          .catch(() => {});
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

        {detail.warnings && detail.warnings.length > 0 ? (
          <div>
            <p className="font-mono text-[10.5px] tracking-[.12em] uppercase text-text-muted mb-2.5">
              Önemli Uyarılar <span className="normal-case tracking-normal">({detail.warnings.length})</span>
            </p>
            <div className="space-y-2">
              {detail.warnings.map((w) => (
                <WarningCallout key={w.id} warning={w} defaultOpen={w.severity === 'critical'} />
              ))}
            </div>
            <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
              Bu uyarılar ürün etiketlerinden derlenmiş genel bilgilerdir ve kapsayıcı değildir;
              kişisel durumunuz için doktorunuza veya eczacınıza danışın.
            </p>
          </div>
        ) : (
          /* Uyarı yokluğu güvenli demek DEĞİLDİR — sessiz kalmak yerine dürüst not */
          <div className="bg-card-inset rounded-[14px] p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-text-muted flex-none mt-0.5" />
            <p className="text-[12.5px] leading-relaxed text-text-muted">
              Bu ilaç için veritabanımızda derlenmiş özel bir uyarı bulunmuyor. Bu, risk
              olmadığı anlamına gelmez; prospektüsü inceleyin ve doktorunuza veya
              eczacınıza danışın.
            </p>
          </div>
        )}

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

        {equivalents.length > 0 && (
          <div>
            <p className="font-mono text-[10.5px] tracking-[.12em] uppercase text-text-muted mb-2.5">
              Eşdeğer İlaçlar <span className="normal-case tracking-normal">({equivalents.length})</span>
            </p>
            <div className="bg-card-inset rounded-[14px] overflow-hidden divide-y divide-border-light">
              {equivalents.map((eq) => (
                <button
                  key={eq.id}
                  onClick={() => onSelectDrug?.(eq)}
                  disabled={!onSelectDrug}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent-soft/50 transition-colors cursor-pointer disabled:cursor-default"
                >
                  <span className="text-[13.5px] font-semibold text-text-primary truncate">{eq.name}</span>
                  {eq.atcCode && (
                    <span className="flex-none font-mono text-[11px] text-accent bg-accent-soft rounded px-1.5 py-px">
                      {eq.atcCode}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
              Eşdeğerlik etkin madde ve ATC kodu eşleşmesine göre hesaplanmıştır; doz ve
              form farklı olabilir. Resmî SGK eşdeğer listesi değildir.
            </p>
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
                  {normalizeDescription(detail.description || '').replace(/\n+/g, ' ').slice(0, 400).trim()}
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

function WarningCallout({ warning, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const typeCfg = WARNING_TYPE_CONFIG[warning.type] || WARNING_TYPE_CONFIG.allergy;
  const sevCfg = WARNING_SEVERITY_CONFIG[warning.severity] || WARNING_SEVERITY_CONFIG.info;
  const Icon = typeCfg.icon;

  return (
    <div className={`rounded-[14px] border overflow-hidden ${sevCfg.card}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-3.5 p-3.5 text-left cursor-pointer"
      >
        <div className={`flex-none w-[38px] h-[38px] rounded-[11px] text-white flex items-center justify-center ${sevCfg.iconBox}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
          <span className="text-[13.5px] font-semibold text-text-primary">{warning.title}</span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[.08em] text-text-muted bg-card-inset border border-border rounded-md px-2 py-[2px]">
            {typeCfg.label}
          </span>
        </div>
        <span className="shrink-0">
          {open ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </span>
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 pl-[66px]">
          <p className="text-[12.5px] leading-relaxed text-text-secondary">{warning.message}</p>
          {warning.details && (
            <p className="text-[12px] leading-relaxed text-text-muted mt-1.5">{warning.details}</p>
          )}
          <p className="font-mono text-[10.5px] text-text-muted mt-2">Kaynak: {warning.source}</p>
        </div>
      )}
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

// Bölüm gövdesi: KT şablonundaki alt başlıklar ("KULLANMAYINIZ", "Hamilelik",
// "Araç ve makine kullanımı"...) yarı kalın paragraf başlığı olarak ayrılır.
function SectionBody({ section }) {
  const parts = section.parts && section.parts.length > 0
    ? section.parts
    : [{ subheading: null, text: section.content }];
  return (
    <div className="space-y-3">
      {parts.map((part, i) => (
        <div key={i}>
          {part.subheading && (
            <p className="text-[13px] font-semibold text-text-primary mb-1">{part.subheading}</p>
          )}
          {part.text && (
            <p className="text-[13.5px] text-text-secondary leading-[1.6] whitespace-pre-line">
              {part.text}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function DescriptionSection({ section, expanded, onToggle }) {
  if (!section.title) {
    return (
      <div className="bg-card-inset rounded-[14px] p-4 sm:p-5">
        <SectionBody section={section} />
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
          <div className="pt-3.5">
            <SectionBody section={section} />
          </div>
        </div>
      )}
    </div>
  );
}
