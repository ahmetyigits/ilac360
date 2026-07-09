import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Loader2, SearchX } from 'lucide-react';
import { searchDrugs } from '../data/api';

// İlaç adının ilk 3 harfi — tasarımdaki mono avatar bloğu
function monogram(name) {
  return (name || '').replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '').slice(0, 3).toLocaleUpperCase('tr');
}

export default function DrugSearch({ onSelect, selectedDrugs, maxDrugs = 10, onMaxReached, chipQuery }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Hero'daki "Popüler" çipleri aramayı doldurur ({ q, at } — aynı çipe
  // ikinci tıklamada da tetiklenmesi için nesne kimliği kullanılır)
  useEffect(() => {
    if (chipQuery?.q) {
      setQuery(chipQuery.q);
      setShowResults(true);
      inputRef.current?.focus();
    }
  }, [chipQuery]);

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
      requestIdRef.current++;
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // İlk veri yüklemesi sürerken eski bir sorgu geç dönüp yeni sorgunun
      // sonuçlarını ezmesin diye monoton istek numarasıyla korunur.
      const requestId = ++requestIdRef.current;
      try {
        const data = await searchDrugs(query);
        if (requestId !== requestIdRef.current) return;
        setResults(data);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setResults([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setSearched(true);
        }
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

  const selectDrug = (drug) => {
    if (isMaxReached) {
      onMaxReached?.();
      return;
    }
    onSelect(drug);
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSearched(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Büyük arama çubuğu — tasarım 1A */}
      <div className="flex items-center gap-1.5 bg-card border border-accent/25 rounded-[15px] p-[7px] pl-3 shadow-[0_14px_34px_-12px_rgba(37,99,235,.25)]">
        <Search className="w-[18px] h-[18px] text-text-muted flex-none ml-1" />
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
            if (e.key === 'Escape') {
              setShowResults(false);
              return;
            }
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
              if (drug && !isSelected(drug)) selectDrug(drug);
            }
          }}
          placeholder={isMaxReached ? `Maksimum ${maxDrugs} ilaç seçildi` : 'İlaç, etkin madde veya barkod ara…'}
          aria-label="İlaç arama"
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={showResults && results.length > 0}
          aria-controls="drug-search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `drug-search-option-${activeIndex}` : undefined}
          disabled={isMaxReached}
          className="flex-1 min-w-0 border-none outline-none bg-transparent text-[16px] text-text-primary placeholder:text-text-muted px-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {loading && <Loader2 className="w-4 h-4 text-text-muted animate-spin flex-none" />}
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className="flex-none flex items-center gap-2 bg-accent text-white text-[15px] font-semibold px-6 py-3 rounded-[11px] hover:bg-accent/90 transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
          Ara
        </button>
      </div>
      {/* Ekran okuyucular için sonuç sayısı duyurusu */}
      <div aria-live="polite" className="sr-only">
        {searched && !loading
          ? results.length > 0
            ? `${results.length} sonuç bulundu`
            : 'Sonuç bulunamadı'
          : ''}
      </div>

      {showResults && query.length >= 2 && !loading && (
        <>
          {results.length > 0 ? (
            <div id="drug-search-listbox" role="listbox" aria-label="Arama sonuçları" className="absolute z-50 left-0 right-0 mt-2 bg-card rounded-xl shadow-lg border border-border overflow-hidden max-h-96 overflow-y-auto animate-fade-in">
              {results.map((drug, idx) => {
                const selected = isSelected(drug);
                const isHighlighted = idx === activeIndex;
                return (
                  <button
                    key={drug.id}
                    id={`drug-search-option-${idx}`}
                    role="option"
                    aria-selected={isHighlighted}
                    disabled={selected || isMaxReached}
                    onClick={() => selectDrug(drug)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors border-b border-border-light last:border-b-0 ${
                      selected || isMaxReached
                        ? 'bg-accent/5 opacity-50 cursor-not-allowed'
                        : isHighlighted
                          ? 'bg-accent-soft'
                          : 'hover:bg-bg-primary cursor-pointer'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-[10px] bg-accent-soft flex-none flex items-center justify-center font-mono font-semibold text-[13px] text-accent">
                      {monogram(drug.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary truncate">{drug.name}</p>
                      <p className="text-[12px] text-text-secondary mt-0.5 truncate">
                        {drug.activeIngredient || 'Etkin madde bilinmiyor'}
                        {drug.atcCode ? (
                          <span className="font-mono text-[11px] text-text-muted bg-bg-primary rounded px-1.5 py-px ml-2">
                            ATC {drug.atcCode}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {!selected && !isMaxReached && (
                      <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Plus className="w-4 h-4 text-accent" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            searched && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-card rounded-xl shadow-lg border border-border overflow-hidden animate-fade-in">
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
