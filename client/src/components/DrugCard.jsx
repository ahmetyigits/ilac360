import { useState, useEffect } from 'react';
import { Tag, Layers, Barcode, FolderTree, FileText, Loader2, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { getDrugDetail } from '../data/api';

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

export default function DrugCard({ drug, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const fetchDetail = (id) => {
    setLoading(true);
    setDetail(null);
    setError(false);
    setShowFullDesc(false);
    setExpandedSection(null);
    getDrugDetail(id)
      .then((data) => {
        if (!data) throw new Error('Not found');
        setDetail(data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetail(drug.id);
  }, [drug.id]);

  // Escape ile kapatma
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">İlaç Detayı</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-bg-primary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-8 text-center">
          <p className="text-sm text-text-muted mb-3">İlaç detayları yüklenirken bir hata oluştu.</p>
          <button
            onClick={() => fetchDetail(drug.id)}
            className="text-xs text-accent hover:text-accent/80 font-medium cursor-pointer"
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
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">İlaç Detayı</h2>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md hover:bg-bg-primary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <p className="text-lg font-semibold text-text-primary leading-snug">{detail.name}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <InfoCard icon={Tag} label="Etkin Madde" value={detail.activeIngredient || '—'} missing={!detail.activeIngredient} />
          <InfoCard icon={Layers} label="ATC Kodu" value={detail.atcCode || '—'} missing={!detail.atcCode} />
          <InfoCard icon={Barcode} label="Barkod" value={detail.barcode || '—'} missing={!detail.barcode} />
          <InfoCard icon={FolderTree} label="Ana Kategori" value={categories[0] || '—'} missing={!categories[0]} />
        </div>

        {!detail.activeIngredient && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/50 dark-warn p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-800 warn-title">Etkin madde bilgisi eksik</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Bu ilacın etkin madde bilgisi veritabanında bulunmuyor. Etkileşim analizi sınırlı olabilir;
                kesin bilgi için prospektüse ve eczacınıza danışınız.
              </p>
            </div>
          </div>
        )}

        {categories.length > 1 && (
          <div>
            <p className="text-[11px] text-text-muted mb-2 font-medium">Tüm Kategoriler</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c, i) => (
                <span
                  key={i}
                  className="text-[11px] text-text-secondary bg-bg-primary px-2.5 py-1 rounded-md border border-border"
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
              <p className="text-[11px] text-text-muted font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Prospektüs / Kullanma Talimatı
              </p>
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-[11px] text-accent hover:text-accent/80 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showFullDesc ? 'Gizle' : 'Tümünü Göster'}
                {showFullDesc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {!showFullDesc ? (
              <div className="bg-bg-primary rounded-lg border border-border p-4">
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  {(detail.description || '').slice(0, 400).trim()}
                  {(detail.description || '').length > 400 && '...'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
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
          <div className="bg-bg-primary rounded-lg border border-border p-4 text-center">
            <p className="text-[12px] text-text-muted">
              Bu ilaç için prospektüs bilgisi veritabanımızda mevcut değildir.
            </p>
            <p className="text-[11px] text-text-muted mt-1">
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

function InfoCard({ icon: Icon, label, value, missing }) {
  return (
    <div className="bg-bg-primary rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-text-muted" />
        <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">{label}</p>
      </div>
      <p className={`text-[13px] font-medium leading-snug break-words ${missing ? 'text-text-muted italic' : 'text-text-primary'}`}>
        {value}
      </p>
    </div>
  );
}

function DescriptionSection({ section, index, expanded, onToggle }) {
  if (!section.title) {
    return (
      <div className="bg-bg-primary rounded-lg border border-border p-4">
        <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
          {section.content}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary rounded-lg border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-border/30 transition-colors cursor-pointer"
      >
        <span className="text-[12px] font-semibold text-text-primary pr-4">
          {section.title.match(/^(\d+)\.\s*(.*)/) ? (
            <>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold mr-2">{section.title.match(/^(\d+)/)[1]}</span>
              {section.title.replace(/^\d+\.\s*/, '')}
            </>
          ) : section.title}
        </span>
        {section.content && (
          <span className="shrink-0">
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            )}
          </span>
        )}
      </button>
      {expanded && section.content && (
        <div className="px-4 pb-4 border-t border-border">
          <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line pt-3">
            {section.content}
          </p>
        </div>
      )}
    </div>
  );
}
