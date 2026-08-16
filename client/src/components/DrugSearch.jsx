import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, SearchX, ScanBarcode } from 'lucide-react';
import { searchDrugs } from '../data/api';
import { getSuggestions } from '../data/fuzzySearch.js';
import { isScanSupported } from '../data/barcodeDetector.js';
import BarcodeScanner from './BarcodeScanner.jsx';
import { reportError } from '../data/telemetry.js';

export default function DrugSearch({ onSelect, selectedDrugs, maxDrugs = 10, onMaxReached }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searched, setSearched] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [scannerOpen, setScannerOpen] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

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
      requestIdRef.current++;
      setResults([]);
      setSuggestions([]);
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
        // Yazım hatası toleransı: tam arama boş dönerse marka önerisi üret
        setSuggestions(data.length === 0 ? getSuggestions(query) : []);
      } catch (err) {
        reportError(err, 'drugSearch');
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

  // Kameradan çözülen rakamlar: mevcut barkod arama hattına verilir.
  // Tek eşleşme → otomatik ekle; çoklu (30 mükerrer barkod grubu var) →
  // normal sonuç listesi; sıfır → rakamlar input'ta, "bulunamadı" paneli.
  const handleDetected = async (digits) => {
    setScannerOpen(false);
    setQuery(digits);
    setShowResults(true);
    try {
      const data = await searchDrugs(digits);
      if (data.length === 1 && !selectedDrugs.some((d) => d.id === data[0].id)) {
        selectDrug(data[0]);
      }
    } catch {
      // arama hattı zaten debounce ile tekrar deneyecek; sessiz geç
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* 3A odak arama girişi */}
      <div className="flex items-center gap-[13px] px-[18px] py-[15px] bg-card-inset rounded-[15px] border-[1.5px] border-accent/30 focus-within:border-accent/60 transition-colors">
        <Search className="w-5 h-5 text-accent flex-none" strokeWidth={2} />
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
          placeholder={isMaxReached ? `Maksimum ${maxDrugs} ilaç seçildi` : 'İlaç adı, etken madde veya barkod ara…'}
          aria-label="İlaç arama"
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={showResults && results.length > 0}
          aria-controls="drug-search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `drug-search-option-${activeIndex}` : undefined}
          disabled={isMaxReached}
          className="flex-1 min-w-0 border-none outline-none bg-transparent text-[16px] text-text-primary placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 text-text-muted animate-spin flex-none" />
        ) : (
          <span className="hidden sm:inline font-mono text-[11px] text-text-muted flex-none">
            {/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '') ? '⌘K' : 'Ctrl K'}
          </span>
        )}
        {isScanSupported() && (
          <button
            onClick={() => setScannerOpen(true)}
            disabled={isMaxReached}
            aria-label="Barkod tara (kamera ile)"
            title="Kutu barkodunu kamerayla tara"
            className="flex-none w-9 h-9 -my-1 rounded-[10px] text-accent hover:bg-accent-soft flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ScanBarcode className="w-5 h-5" />
          </button>
        )}
      </div>
      {scannerOpen && (
        <BarcodeScanner onDetected={handleDetected} onClose={() => setScannerOpen(false)} />
      )}
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
            <div
              id="drug-search-listbox"
              role="listbox"
              aria-label="Arama sonuçları"
              className="absolute z-50 left-0 right-0 top-[calc(100%+8px)] bg-card rounded-[15px] border border-black/10 shadow-[0_24px_44px_-18px_rgba(0,0,0,.3)] overflow-hidden max-h-96 overflow-y-auto animate-fade-in"
            >
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
                    className={`w-full flex items-center justify-between gap-4 px-[17px] py-[13px] text-left transition-colors border-b border-black/5 last:border-b-0 ${
                      selected || isMaxReached
                        ? 'bg-accent-soft/50 opacity-50 cursor-not-allowed'
                        : isHighlighted
                          ? 'bg-accent-soft/60'
                          : 'hover:bg-card-inset cursor-pointer'
                    }`}
                  >
                    <div className="flex items-baseline gap-2.5 min-w-0">
                      <span className="text-[15px] font-semibold text-text-primary truncate">{drug.name}</span>
                      <span className="text-[13px] text-text-muted truncate hidden sm:inline">
                        {drug.activeIngredient || 'Etkin madde bilinmiyor'}
                      </span>
                    </div>
                    <span className="flex-none px-2.5 py-[3px] bg-accent-soft rounded-[20px] text-[11px] font-medium text-accent">
                      {drug.atcCode ? `ATC ${drug.atcCode}` : 'İlaç'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            searched && (
              <div className="absolute z-50 left-0 right-0 top-[calc(100%+8px)] bg-card rounded-[15px] border border-black/10 shadow-[0_24px_44px_-18px_rgba(0,0,0,.3)] overflow-hidden animate-fade-in">
                <div className="px-4 py-6 text-center">
                  <SearchX className="w-6 h-6 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted font-medium">Sonuç bulunamadı</p>
                  <p className="text-[11px] text-text-muted mt-0.5">"{query}" ile eşleşen ilaç yok.</p>
                  {suggestions.length > 0 && (
                    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-[12px] text-text-secondary">Şunu mu demek istediniz:</span>
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setQuery(s);
                            setShowResults(true);
                            inputRef.current?.focus();
                          }}
                          className="text-[12.5px] font-semibold text-accent bg-accent-soft rounded-full px-3 py-1 hover:bg-accent-light/60 transition-colors cursor-pointer uppercase"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
