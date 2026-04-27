import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Loader2, SearchX } from 'lucide-react';
import { searchDrugs } from '../data/api';

export default function DrugSearch({ onSelect, selectedDrugs, maxDrugs = 10, onMaxReached }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Ctrl+K global kısayol
  useEffect(() => {
    function handleGlobalKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Sonuçlar değişince active index sıfırla
  useEffect(() => { setActiveIndex(-1); }, [results]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchDrugs(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isSelected = (drug) => selectedDrugs.some((d) => d.id === drug.id);
  const isMaxReached = selectedDrugs.length >= maxDrugs;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">İlaç Ara</h2>
          <span className="text-[11px] text-text-muted">
            {isMaxReached ? `Maksimum ${maxDrugs} ilaç seçildi` : 'En az 2 karakter yazın'}
          </span>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onKeyDown={(e) => {
                if (!showResults || results.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex((p) => (p < results.length - 1 ? p + 1 : 0));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex((p) => (p > 0 ? p - 1 : results.length - 1));
                } else if (e.key === 'Enter' && activeIndex >= 0) {
                  e.preventDefault();
                  const drug = results[activeIndex];
                  if (drug && !isSelected(drug) && !isMaxReached) {
                    onSelect(drug);
                    setQuery('');
                    setResults([]);
                    setShowResults(false);
                    setSearched(false);
                  }
                }
              }}
              placeholder="İlaç adı, etken madde veya barkod yazın... — Ctrl+K"
              aria-label="İlaç arama"
              aria-autocomplete="list"
              role="combobox"
              aria-expanded={showResults && results.length > 0}
              disabled={isMaxReached}
              className="w-full pl-10 pr-4 py-2.5 bg-bg-primary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {loading && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
            )}
          </div>
        </div>
      </div>

      {showResults && query.length >= 2 && !loading && (
        <>
          {results.length > 0 ? (
            <div role="listbox" aria-label="Arama sonuçları" className="absolute z-50 left-0 right-0 mt-1.5 bg-card rounded-xl shadow-lg border border-border overflow-hidden max-h-96 overflow-y-auto animate-fade-in">
              {results.map((drug, idx) => {
                const selected = isSelected(drug);
                const isHighlighted = idx === activeIndex;
                return (
                  <button
                    key={drug.id}
                    disabled={selected || isMaxReached}
                    onClick={() => {
                      if (isMaxReached) {
                        onMaxReached?.();
                        return;
                      }
                      onSelect(drug);
                      setQuery('');
                      setResults([]);
                      setShowResults(false);
                      setSearched(false);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-border last:border-b-0 ${
                      selected || isMaxReached
                        ? 'bg-accent/5 opacity-50 cursor-not-allowed'
                        : isHighlighted
                          ? 'bg-accent/5'
                          : 'hover:bg-bg-primary cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{drug.name}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {drug.activeIngredient || 'Etkin madde bilinmiyor'}
                        {drug.categories?.[0] ? ` · ${drug.categories[0]}` : ''}
                      </p>
                    </div>
                    {!selected && !isMaxReached && (
                      <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center shrink-0 ml-3">
                        <Plus className="w-3.5 h-3.5 text-accent" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            searched && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 bg-card rounded-xl shadow-lg border border-border overflow-hidden animate-fade-in">
                <div className="px-4 py-6 text-center">
                  <SearchX className="w-6 h-6 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted font-medium">Sonuç bulunamadı</p>
                  <p className="text-[11px] text-text-muted mt-0.5">"{query}" ile eşleşen ilaç yok.</p>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
