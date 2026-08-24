import { Fragment, useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Loader2, SearchX, Stethoscope, Check } from 'lucide-react';
import Pagination from './Pagination';
import MatchSourceModal from './MatchSourceModal';
import { getConditionList, searchCondition } from '../data/api';
import { reportError } from '../data/telemetry.js';

export default function ConditionSearch({ onSelect, onViewDrug, selectedDrugs, maxDrugs = 10, onMaxReached, renderBeforeResults }) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [explainingDrug, setExplainingDrug] = useState(null);
  const [activeRow, setActiveRow] = useState(-1);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const listRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
    // Liste yüklenemezse bölüm görünmez; en azından telemetriye iz bırak.
    getConditionList().then(setConditions).catch((err) => reportError(err, 'conditionList'));
  }, []);

  const doSearch = useCallback(async (searchQuery, searchPage = 1, limit = pageSize) => {
    if (!searchQuery || searchQuery.length < 2) return;
    setLoading(true);
    setLoadError(false);
    // Geç dönen eski bir arama, yeni aramanın sonuçlarını ezmesin.
    const requestId = ++requestIdRef.current;
    try {
      const data = await searchCondition(searchQuery, { page: searchPage, limit });
      if (requestId !== requestIdRef.current) return;
      setResults(data);
      setPage(data.page ?? searchPage);
      setSubmittedQuery(searchQuery);
    } catch (err) {
      // Veri yükleme hatası "sonuç bulunamadı"dan AYRI gösterilir.
      reportError(err, 'conditionSearch');
      if (requestId !== requestIdRef.current) return;
      setResults(null);
      setLoadError(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setSearched(true);
      }
    }
  }, [pageSize]);

  // Canlı arama: yazdıkça 300ms debounce ile ara (ilaç aramasıyla tutarlı).
  // Zaten aranmış sorgu (Enter/Ara/hızlı-kart sonrası submittedQuery) tekrar
  // aranmaz — mükerrer ağ çağrısı olmaz. Enter/buton anında tetiklemeye devam eder.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || q === submittedQuery) return;
    const t = setTimeout(() => { setPage(1); doSearch(q, 1); }, 300);
    return () => clearTimeout(t);
  }, [query, submittedQuery, doSearch]);

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
      <form onSubmit={handleSubmit} className="bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Hastalığa Göre İlaç Ara</h2>
          </div>
          <span className="text-[11px] text-text-muted">
            {isMaxReached ? `Maksimum ${maxDrugs} ilaç seçildi` : 'Yazdıkça otomatik aranır'}
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
              className="w-full pl-10 pr-20 py-3 bg-card-inset border-[1.5px] border-accent/30 rounded-[13px] text-[15px] placeholder:text-text-muted focus:outline-none focus:border-accent/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Sepet + ilaç detayı + analiz sonuçları: arama yapılmamış olsa bile
          her zaman görünür (sonuç listesinin üstünde) */}
      {renderBeforeResults}

      {/* Sık aranan durumlar — tasarımdaki kategori kartları düzeni */}
      {!searched && conditions.length > 0 && (
        <div className="bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] p-5 sm:p-6">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="font-display text-xl sm:text-[24px] font-bold tracking-tight text-text-primary m-0">
              Sık aranan durumlar
            </h3>
            <span className="text-sm text-text-muted">{conditions.length} başlık</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {conditions.slice(0, 12).map(c => (
              <button
                key={c.id}
                onClick={() => handleQuickSearch(c.names[0])}
                disabled={isMaxReached}
                className="flex items-center gap-3.5 bg-card border border-border rounded-[13px] p-4 text-left hover:border-accent/40 hover:bg-accent-soft/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-11 h-11 rounded-[11px] bg-accent-soft flex-none flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-text-primary truncate">{c.names[0]}</div>
                  <div className="text-[13px] text-text-muted mt-0.5 truncate">{c.description || 'İlaçları gör'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Yükleniyor */}
      {loading && (
        <div className="bg-card rounded-[20px] border border-ink/10 p-5">
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

      {/* Veri yükleme hatası — "sonuç bulunamadı"dan ayrı, yeniden denenebilir */}
      {searched && !loading && loadError && (
        <div className="bg-card rounded-[20px] border border-ink/10 p-8 text-center">
          <p className="text-[15px] font-semibold text-text-primary">Arama verileri yüklenemedi</p>
          <p className="text-[13px] text-text-muted mt-1">
            Bağlantınızı kontrol edin; sorun geçiciyse yeniden deneme işe yarar.
          </p>
          <button
            onClick={() => doSearch(query || submittedQuery, 1)}
            className="mt-4 px-5 py-2.5 bg-accent text-white rounded-[11px] text-sm font-semibold hover:bg-accent-deep transition-colors cursor-pointer"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* Ekran okuyucular için sonuç duyurusu (DrugSearch paritesi) */}
      <div aria-live="polite" className="sr-only">
        {searched && !loading
          ? loadError
            ? 'Arama verileri yüklenemedi'
            : results
              ? results.drugs.length > 0
                ? `${results.totalFound} sonuç bulundu`
                : 'Sonuç bulunamadı'
              : ''
          : ''}
      </div>

      {/* Sonuçlar */}
      {searched && !loading && results && (
        <div ref={resultsRef} className="space-y-5">
          {results.drugs.length > 0 ? (
            <div className="bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] overflow-hidden">
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

              {/* İlaç listesi — ok tuşlarıyla satırlar arasında gezilebilir */}
              <div
                ref={listRef}
                className="divide-y divide-border"
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
                  e.preventDefault();
                  const next = e.key === 'ArrowDown'
                    ? Math.min(activeRow + 1, results.drugs.length - 1)
                    : Math.max(activeRow - 1, 0);
                  setActiveRow(next);
                  // children[next] DEĞİL: grup başlık satırları indeksi kaydırır —
                  // yalnız ilaç satırları sayılır, indeks results.drugs ile hizalı kalır.
                  listRef.current?.querySelectorAll('[data-drug-row]')[next]?.focus();
                }}
              >
                {results.drugs.map((drug, idx) => {
                  const selected = isSelected(drug);
                  // Grup başlığı: grubun sayfadaki ilk satırının üstünde. Sayfa
                  // ortadan başlıyorsa (grup önceki sayfada açıldı) "devam" denir.
                  const showGroupHeader = drug.groupSize > 1 && (drug.groupStart || idx === 0);
                  return (
                    <Fragment key={drug.id}>
                    {showGroupHeader && (
                      <div className="px-5 py-2 bg-bg-primary/60 flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-text-primary">{drug.groupLabel}</span>
                        <span className="text-[10px] font-medium text-accent bg-accent/10 rounded-full px-2 py-px">
                          {drug.groupStart ? `${drug.groupSize} ürün` : 'devam'}
                        </span>
                      </div>
                    )}
                    <div
                      data-drug-row
                      role="button"
                      tabIndex={0}
                      aria-label={`${drug.name} — detayı aç`}
                      onFocus={() => setActiveRow(idx)}
                      onClick={() => onViewDrug?.(drug)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewDrug?.(drug); } }}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-inset ${
                        selected ? 'bg-accent/5' : 'hover:bg-bg-primary'
                      }`}
                      title="Detayını görmek için tıklayın"
                    >
                      <div className="w-11 h-11 rounded-[10px] bg-accent-soft flex items-center justify-center shrink-0 font-mono text-[12px] font-semibold text-accent">
                        {(drug.name || '').replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '').slice(0, 3).toLocaleUpperCase('tr') || (page - 1) * pageSize + idx + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-text-primary truncate">{drug.name}</p>
                        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                          <p className="text-[12.5px] text-text-secondary">
                            Etkin madde: <span className="font-semibold text-accent/90">{drug.activeIngredient || 'Bilinmiyor'}</span>
                          </p>
                          {drug.atcCode && (
                            <span className="font-mono text-[11px] text-text-muted bg-bg-primary rounded px-1.5 py-px">
                              ATC {drug.atcCode}
                            </span>
                          )}
                        </div>
                        {drug.matchReason && (
                          <p className="text-[11px] text-text-muted mt-1 truncate">
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
                    </Fragment>
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
            <div className="bg-card rounded-[20px] border border-ink/10 p-8 text-center">
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
