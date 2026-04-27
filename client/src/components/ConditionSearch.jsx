import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Loader2, SearchX, Stethoscope, Check } from 'lucide-react';
import Pagination from './Pagination';
import MatchSourceModal from './MatchSourceModal';
import { getConditionList, searchCondition } from '../data/api';

export default function ConditionSearch({ onSelect, onViewDrug, selectedDrugs, maxDrugs = 10, onMaxReached, renderBeforeResults }) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [explainingDrug, setExplainingDrug] = useState(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    getConditionList().then(setConditions).catch(() => {});
  }, []);

  const doSearch = useCallback(async (searchQuery, searchPage = 1, limit = pageSize) => {
    if (!searchQuery || searchQuery.length < 2) return;
    setLoading(true);
    try {
      const data = await searchCondition(searchQuery, { page: searchPage, limit });
      setResults(data);
      setPage(searchPage);
      setSubmittedQuery(searchQuery);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [pageSize]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    setPage(1);
    doSearch(query, 1);
  };

  const handleQuickSearch = (name) => {
    setQuery(name);
    setPage(1);
    doSearch(name, 1);
  };

  const goToPage = (newPage) => {
    doSearch(submittedQuery, newPage);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
    if (submittedQuery) {
      doSearch(submittedQuery, 1, newSize);
    }
  };

  const isSelected = (drug) => selectedDrugs.some((d) => d.id === drug.id);
  const isMaxReached = selectedDrugs.length >= maxDrugs;
  const totalPages = results?.totalPages || 0;

  const matchSourceColor = (source) => {
    switch (source) {
      case 'ingredient': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'atc': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'category': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'description': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Arama formu */}
      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Hastalığa Göre İlaç Ara</h2>
          </div>
          <span className="text-[11px] text-text-muted">
            {isMaxReached ? `Maksimum ${maxDrugs} ilaç seçildi` : 'Yazıp Enter\'a basın veya Ara butonuna tıklayın'}
          </span>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hastalık veya şikayet yazın, Enter'a basın (ör. baş ağrısı, ateş, grip)"
              aria-label="Hastalık arama"
              disabled={isMaxReached}
              className="w-full pl-10 pr-20 py-2.5 bg-bg-primary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={query.length < 2 || loading || isMaxReached}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ara'}
            </button>
          </div>
        </div>
      </form>

      {/* Hızlı etiketler */}
      {!searched && conditions.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-text-secondary mb-3">Sık Aranan Durumlar</p>
          <div className="flex flex-wrap gap-2">
            {conditions.slice(0, 12).map(c => (
              <button
                key={c.id}
                onClick={() => handleQuickSearch(c.names[0])}
                disabled={isMaxReached}
                className="px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs text-text-secondary hover:bg-accent/5 hover:border-accent/30 hover:text-accent transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {c.names[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Yükleniyor */}
      {loading && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-lg border border-border p-3.5 flex items-center gap-3">
                <div className="skeleton w-7 h-7 rounded-lg" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-48 mb-1" />
                  <div className="skeleton h-3 w-32" />
                </div>
                <div className="skeleton h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sonuçlar */}
      {searched && !loading && results && (
        <div ref={resultsRef} className="space-y-5">
          {renderBeforeResults}
          {results.drugs.length > 0 ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Üst bilgi */}
              {results.condition && (
                <div className="px-5 py-3 bg-accent/5 border-b border-border flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium text-accent">{results.condition.description}</p>
                </div>
              )}

              <div className="px-5 py-2 border-b border-border bg-bg-primary/50 text-[11px] text-text-muted">
                Detay için satıra tıklayın · Etkileşim için <span className="inline-flex items-center gap-0.5 mx-0.5"><Plus className="w-2.5 h-2.5 text-accent" /></span> ile ekleyin
              </div>

              {/* İlaç listesi */}
              <div className="divide-y divide-border">
                {results.drugs.map((drug, idx) => {
                  const selected = isSelected(drug);
                  return (
                    <div
                      key={drug.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onViewDrug?.(drug)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewDrug?.(drug); } }}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors cursor-pointer ${
                        selected ? 'bg-accent/5' : 'hover:bg-bg-primary'
                      }`}
                      title="Detayını görmek için tıklayın"
                    >
                      <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 text-[11px] font-semibold text-accent">
                        {(page - 1) * pageSize + idx + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{drug.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-text-muted">
                            {drug.activeIngredient || 'Etkin madde bilinmiyor'}
                          </p>
                          {drug.atcCode && (
                            <span className="text-[10px] text-text-muted">ATC: {drug.atcCode}</span>
                          )}
                        </div>
                        {drug.matchReason && (
                          <p className="text-[10px] text-text-muted mt-1 italic truncate">
                            ↳ {drug.matchReason}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExplainingDrug(drug);
                        }}
                        className={`text-[10px] px-2 py-1 rounded-full font-medium shrink-0 hover:ring-2 hover:ring-current hover:ring-offset-1 hover:ring-offset-card transition-all cursor-pointer ${matchSourceColor(drug.matchSource)}`}
                        title="Eşleşme nedenini gör"
                      >
                        {drug.matchSource === 'ingredient' ? 'Etken Madde' : drug.matchSource === 'atc' ? 'ATC' : drug.matchSource === 'category' ? 'Kategori' : 'Prospektüs'}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isMaxReached) { onMaxReached?.(); return; }
                          if (!selected) onSelect(drug);
                        }}
                        disabled={selected || isMaxReached}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                          selected
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 cursor-default'
                            : isMaxReached
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-40'
                              : 'bg-accent/10 text-accent hover:bg-accent/20'
                        }`}
                        title={selected ? 'Zaten seçili' : isMaxReached ? `Maksimum ${maxDrugs} ilaç` : 'Etkileşim listesine ekle'}
                      >
                        {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Sayfalama */}
              <Pagination
                page={page}
                totalPages={totalPages}
                totalFound={results.totalFound}
                pageSize={pageSize}
                onPageChange={goToPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <SearchX className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-text-primary">Sonuç bulunamadı</p>
              <p className="text-[12px] text-text-muted mt-1">"{submittedQuery}" ile eşleşen ilaç bulunamadı. Farklı bir terim deneyin.</p>
            </div>
          )}
        </div>
      )}

      {explainingDrug && (
        <MatchSourceModal
          drug={explainingDrug}
          conditionDescription={results?.condition?.description}
          onClose={() => setExplainingDrug(null)}
        />
      )}
    </div>
  );
}
