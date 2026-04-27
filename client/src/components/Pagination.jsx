import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function Pagination({ page, totalPages, totalFound, pageSize, onPageChange, onPageSizeChange }) {
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);

  if (totalPages <= 0) return null;

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    let start = Math.max(2, page - 1);
    let end = Math.min(totalPages - 1, page + 1);
    if (page <= 3) { start = 2; end = Math.min(5, totalPages - 1); }
    if (page >= totalPages - 2) { start = Math.max(2, totalPages - 4); end = totalPages - 1; }
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(inputValue);
    if (num >= 1 && num <= totalPages && num !== page) {
      onPageChange(num);
    }
    setShowInput(false);
    setInputValue('');
  };

  return (
    <div className="space-y-0">
      {/* Üst bilgi: toplam + sayfa boyutu */}
      <div className="px-5 py-2.5 border-t border-border flex flex-wrap items-center justify-between gap-2 bg-bg-primary/30">
        <span className="text-[11px] text-text-muted">
          Toplam {totalFound} sonuç
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-text-muted">Sayfa başına:</span>
          {PAGE_SIZE_OPTIONS.map(size => (
            <button
              key={size}
              onClick={() => onPageSizeChange(size)}
              className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer ${
                pageSize === size
                  ? 'bg-accent text-white font-medium'
                  : 'text-text-muted hover:bg-bg-primary hover:text-text-secondary'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Sayfalama kontrolleri */}
      {totalPages > 1 && (
        <div className="px-5 py-2.5 border-t border-border flex items-center justify-between bg-bg-primary/30">
          {/* Sol: İlk + Önceki */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-card hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="İlk sayfa"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-card hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Önceki sayfa"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Orta: Sayfa numaraları + girdi */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`dots-${i}`} className="w-7 h-7 flex items-center justify-center text-[12px] text-text-muted">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded-md text-[12px] font-medium flex items-center justify-center cursor-pointer transition-all ${
                    p === page
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:bg-card hover:text-accent'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            {/* Sayfa numarası girme */}
            <div className="ml-1.5 relative">
              {showInput ? (
                <form onSubmit={handleInputSubmit} className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={() => { setShowInput(false); setInputValue(''); }}
                    autoFocus
                    placeholder={String(page)}
                    className="w-12 h-7 px-1.5 text-center text-[12px] bg-bg-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                  />
                  <span className="text-[11px] text-text-muted">/ {totalPages}</span>
                </form>
              ) : (
                <button
                  onClick={() => { setShowInput(true); setInputValue(''); }}
                  className="h-7 px-2 rounded-md text-[11px] text-text-muted hover:bg-card hover:text-accent transition-all cursor-pointer border border-transparent hover:border-border"
                  title="Sayfa numarası girin"
                >
                  Git...
                </button>
              )}
            </div>
          </div>

          {/* Sağ: Sonraki + Son */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-card hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Sonraki sayfa"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
              className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-card hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Son sayfa"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
