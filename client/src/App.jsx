import { useState, useCallback, useEffect, useRef } from 'react';
import { bootData, getStats, getDrugsByIds, getFoodsByKeys, analyzeInteractions as analyzeInteractionsApi } from './data/api';
import {
  saveBasket,
  loadBasket,
  parseSharedIds,
  parseSharedFoodKeys,
  parseSharedDrugId,
  clearShareParams,
} from './data/basketStore.js';
import {
  getSavedLists,
  saveList,
  deleteList,
  getFavoriteIds,
  toggleFavorite,
} from './data/listsStore.js';
import DisclaimerGate from './components/DisclaimerGate';
import { hasAcknowledgedDisclaimer } from './data/disclaimer.js';
import { reportError } from './data/telemetry.js';
import { AlertTriangle } from 'lucide-react';
import Navbar from './components/Navbar';
import DrugSearch from './components/DrugSearch';
import SelectedDrugs from './components/SelectedDrugs';
import DrugCard from './components/DrugCard';
import InteractionResults from './components/InteractionResults';
import LegalWarning from './components/LegalWarning';
import AboutPage from './components/AboutPage';
import Changelog from './components/Changelog';
import Toast from './components/Toast';
import Onboarding from './components/Onboarding';
import ConditionSearch from './components/ConditionSearch';
import FoodPicker from './components/FoodPicker';
import SavedLists from './components/SavedLists';
import Hero from './components/Hero';
import Footer from './components/Footer';

const MAX_DRUGS = 10;

export default function App() {
  const [currentView, setCurrentView] = useState('checker');
  const [searchMode, setSearchMode] = useState('drug');
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  const [activeDrug, setActiveDrug] = useState(null);
  // Son eylem üste: analiz mi detay açma mı daha tazeyse onun cevabı üstte
  // durur. Sabit sıralamada hangisi üstteyse diğerinin cevabı dipte kalıyordu.
  const [detailOnTop, setDetailOnTop] = useState(false);
  const [interactions, setInteractions] = useState(null);
  const [unknownDrugs, setUnknownDrugs] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [favorites, setFavorites] = useState([]);   // çözülmüş favori ilaç nesneleri
  const [favoriteIds, setFavoriteIds] = useState([]); // yıldız durumu için id listesi
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(() => {
    try { return localStorage.getItem('auto_analyze') === 'true'; } catch { return false; }
  });
  const [stats, setStats] = useState(null);
  const [dataError, setDataError] = useState(false);
  const [showDisclaimerGate, setShowDisclaimerGate] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const analysisRef = useRef(null);
  const drugCardRef = useRef(null);
  const restoredRef = useRef(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // showToast önce tanımlanmalı: aşağıdaki handler'lar (handleSaveList/
  // handleLoadList) bunu bağımlılık dizisinde kullanır — sonra tanımlanırsa
  // render sırasında TDZ ("Cannot access 'showToast' before initialization").
  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }].slice(-4));
    // Uzun mesajlar (paylaşım gizlilik notu gibi) okunmadan kaybolmasın:
    // süre mesaj uzunluğuyla ölçeklenir.
    const duration = Math.max(4000, message.length * 55);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const loadInitialData = useCallback(() => {
    setDataError(false);
    // bootData üç veri setini birden ısıtır; istatistikler ilaç+kural verisinden gelir.
    bootData()
      .then(() => getStats())
      .then((s) => {
        setStats(s);
        restoreBasket();
        setSavedLists(getSavedLists());
        refreshFavorites();
      })
      .catch((err) => {
        reportError(err, 'bootData');
        setDataError(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // { drugIds, foodKeys } → çözülmüş öğe nesneleri (+ geçersiz id'ler).
  // restoreBasket ve kayıtlı-liste yükleme aynı çözümlemeyi paylaşır.
  const resolveItems = useCallback(async ({ drugIds = [], foodKeys = [] }) => {
    const items = [];
    let invalidIds = [];
    if (drugIds.length > 0) {
      const { drugs, invalidIds: bad } = await getDrugsByIds(drugIds);
      items.push(...drugs);
      invalidIds = bad;
    }
    if (foodKeys.length > 0) {
      const { foods } = await getFoodsByKeys(foodKeys);
      items.push(...foods);
    }
    return { items, invalidIds };
  }, []);

  // Favori id'lerini güncel veriden çözer (görünen ad için); yıldız durumu
  // için ham id listesini de tutar.
  const refreshFavorites = useCallback(async () => {
    const ids = getFavoriteIds();
    setFavoriteIds(ids);
    if (ids.length === 0) { setFavorites([]); return; }
    try {
      const { drugs } = await getDrugsByIds(ids);
      setFavorites(drugs);
    } catch (err) {
      reportError(err, 'refreshFavorites');
    }
  }, []);

  // Sepeti geri yükle: paylaşım URL'si (?d=) localStorage'a göre önceliklidir.
  // ?drug= tek ilaç detay deep-link'idir (SEO sayfalarından gelir).
  const restoreBasket = useCallback(async () => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const sharedIds = parseSharedIds(location.search);
      const sharedFoodKeys = parseSharedFoodKeys(location.search);
      const singleDrugId = parseSharedDrugId(location.search);
      const isShared = sharedIds.length > 0 || sharedFoodKeys.length > 0;
      const stored = isShared ? { drugIds: sharedIds, foodKeys: sharedFoodKeys } : loadBasket();
      const { items, invalidIds } = await resolveItems(stored);
      if (invalidIds.length > 0) {
        showToast(`${invalidIds.length} ilaç artık veritabanında bulunamadı.`, 'warning');
      }
      if (items.length > 0) {
        setSelectedDrugs(items.slice(0, MAX_DRUGS));
        if (isShared) {
          showToast(`Paylaşılan liste yüklendi — ${items.length} öge.`, 'info');
        }
      }
      if (singleDrugId) {
        const { drugs } = await getDrugsByIds([singleDrugId]);
        if (drugs[0]) setActiveDrug(drugs[0]);
      }
      if (isShared || singleDrugId) clearShareParams();
    } catch (err) {
      reportError(err, 'restoreBasket');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Kayıtlı listeler + favoriler (Faz 3.1) ---
  const handleSaveList = useCallback((name) => {
    const entry = saveList(name, selectedDrugs);
    if (entry) {
      setSavedLists(getSavedLists());
      showToast(`"${entry.name}" listesi kaydedildi.`, 'info');
    }
  }, [selectedDrugs, showToast]);

  const handleLoadList = useCallback(async (list) => {
    try {
      const { items, invalidIds } = await resolveItems({ drugIds: list.d, foodKeys: list.f });
      if (items.length > 0) {
        setSelectedDrugs(items.slice(0, MAX_DRUGS));
        setActiveDrug(null);
        setInteractions(null);
        setUnknownDrugs([]);
        showToast(`"${list.name}" yüklendi — ${items.length} öge.`, 'info');
      }
      if (invalidIds.length > 0) showToast(`${invalidIds.length} ilaç artık bulunamadı.`, 'warning');
    } catch (err) {
      reportError(err, 'loadList');
    }
  }, [resolveItems, showToast]);

  const handleDeleteList = useCallback((id) => {
    setSavedLists(deleteList(id));
  }, []);

  const handleToggleFavorite = useCallback((id) => {
    toggleFavorite(id);
    refreshFavorites();
  }, [refreshFavorites]);

  // Sepet her değiştiğinde cihaza kaydedilir (yenilemede kaybolmaz).
  useEffect(() => {
    if (restoredRef.current) saveBasket(selectedDrugs);
  }, [selectedDrugs]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Deep-link: ?p=yenilikler → Yenilikler sayfası (menüde link YOK, sadece URL).
  useEffect(() => {
    try {
      if (new URLSearchParams(location.search).get('p') === 'yenilikler') {
        setCurrentView('changelog');
      }
    } catch {
      // URL okunamazsa yoksay
    }
  }, []);

  // Analiz sonucu gelince görünür alana kaydır — özellikle hastalık aramasında
  // uzun sonuç listesi varken sonuçların "kaybolmasını" engeller.
  useEffect(() => {
    if (interactions) {
      analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Klavye/ekran okuyucu için odak sonuçlara taşınır; kaydırmayı
      // scrollIntoView yönettiğinden focus kaydırma yapmaz.
      analysisRef.current?.focus({ preventScroll: true });
    }
  }, [interactions]);

  useEffect(() => {
    if (activeDrug) {
      drugCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeDrug]);

  // Kullanıcı eylemiyle detay açma: çip/sonuç tıklaması detayı üste taşır.
  const openDrugDetail = useCallback((drug) => {
    setActiveDrug(drug);
    if (drug) setDetailOnTop(true);
  }, []);

  const addDrug = useCallback((drug) => {
    setSelectedDrugs((prev) => {
      if (prev.some((d) => d.id === drug.id)) return prev;
      if (prev.length >= MAX_DRUGS) return prev;
      return [...prev, drug];
    });
    setInteractions(null);
    setUnknownDrugs([]);
  }, []);

  const removeDrug = useCallback((drugId) => {
    setSelectedDrugs((prev) => prev.filter((d) => d.id !== drugId));
    setActiveDrug((prev) => (prev?.id === drugId ? null : prev));
    setInteractions(null);
    setUnknownDrugs([]);
  }, []);

  const clearAllDrugs = useCallback(() => {
    setSelectedDrugs([]);
    setActiveDrug(null);
    setInteractions(null);
    setUnknownDrugs([]);
  }, []);

  const analyzeInteractions = useCallback(async () => {
    if (selectedDrugs.length < 2) return;
    if (selectedDrugs.length > MAX_DRUGS) {
      showToast(`En fazla ${MAX_DRUGS} ilaç analiz edilebilir.`, 'warning');
      return;
    }
    // Besinler ancak bir ilaçla karşılaştırılabilir; besin×besin kapsam dışı.
    if (!selectedDrugs.some((d) => !d.isFood)) {
      showToast('Besin etkileşimi analizi için listeye en az 1 ilaç ekleyin.', 'warning');
      return;
    }
    if (!hasAcknowledgedDisclaimer()) {
      setShowDisclaimerGate(true);
      return;
    }
    setAnalysisLoading(true);
    setDetailOnTop(false); // en taze eylem analiz — iskelet ve sonuçlar üste
    setUnknownDrugs([]);
    try {
      // Ad yerine id ile analiz: veri setinde 135 üründe ad çakışması var.
      const data = await analyzeInteractionsApi(selectedDrugs.map((d) =>
        d.isFood ? { food: d.foodKey, name: d.name } : { id: d.id, name: d.name }));
      setInteractions(data.interactions);
      setUnknownDrugs(data.unknownDrugs || []);
      if (data.unknownDrugs?.length > 0) {
        showToast(`Veritabanında bulunamayan ilaç: ${data.unknownDrugs.join(', ')}`, 'warning');
      }
    } catch (err) {
      reportError(err, 'analyze');
      setInteractions(null);
      showToast('Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedDrugs, showToast]);

  // Otomatik analiz tercihi kalıcı.
  useEffect(() => {
    try { localStorage.setItem('auto_analyze', String(autoAnalyze)); } catch { /* kapalı */ }
  }, [autoAnalyze]);

  // Otomatik analiz: tercih açık, liste geçerli (≥2 öge + ≥1 ilaç), disclaimer
  // ONAYLI ve henüz sonuç yoksa — değişiklik durulunca (700ms) çalışır.
  // Onaylı değilken otomatik gate AÇILMAZ (rahatsız etmez); ilk analizi kullanıcı yapar.
  useEffect(() => {
    if (!autoAnalyze) return;
    if (selectedDrugs.length < 2 || !selectedDrugs.some((d) => !d.isFood)) return;
    if (interactions || analysisLoading) return;
    if (!hasAcknowledgedDisclaimer()) return;
    const t = setTimeout(() => { analyzeInteractions(); }, 700);
    return () => clearTimeout(t);
  }, [autoAnalyze, selectedDrugs, interactions, analysisLoading, analyzeInteractions]);

  // İçerik kutusu: 3A tasarımının 1180px'lik kolonu
  const boxed = (children, extra = '') => (
    <div className={`max-w-[1180px] mx-auto px-5 sm:px-12 py-6 sm:py-8 space-y-5 ${extra}`}>
      {children}
    </div>
  );

  const renderContent = () => {
    if (currentView === 'about') {
      return boxed(<AboutPage stats={stats} />);
    }

    // Yenilikler sayfası: menüde link YOK; yalnız ?p=yenilikler URL'iyle erişilir.
    if (currentView === 'changelog') {
      return boxed(<Changelog />);
    }

    const errorBanner = dataError && (
          <div className="rounded-[20px] border border-red-200 bg-red-50/60 dark:bg-red-950/30 dark:border-red-900/50 p-4 flex items-start gap-3" role="alert">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">İlaç verileri yüklenemedi</p>
              <p className="text-[12px] text-red-700 dark:text-red-400/90 mt-0.5">
                Bağlantınızı kontrol edin ve tekrar deneyin. Veri yüklenmeden arama ve analiz çalışmaz.
              </p>
            </div>
            <button
              onClick={loadInitialData}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors cursor-pointer shrink-0"
            >
              Tekrar dene
            </button>
          </div>
    );

    // Analiz sonuçları + ilaç detayı: her iki modda da aramanın hemen
    // altında, AYNI sayfada gösterilir. SON EYLEM ÜSTTE: "Etkileşimleri
    // Kontrol Et"e basınca sonuçlar, sonrasında bir ilaca tıklanınca detay
    // kartı üste gelir — iki eylem de cevabını tetiklendiği yerin (sepet
    // kartının) hemen altında bulur.
    const detailCard = activeDrug && (
      <div ref={drugCardRef}>
        <DrugCard key={activeDrug.id} drug={activeDrug} onClose={() => setActiveDrug(null)} onSelectDrug={openDrugDetail} />
      </div>
    );

    const analysisBlock = (
            <>
              {analysisLoading && (
                <div className="bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] overflow-hidden animate-fade-in">
                  <div className="px-5 py-3.5 border-b border-border-light flex items-center gap-2.5">
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton h-4 w-12 rounded-full" />
                  </div>
                  <div className="p-4 space-y-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-lg border border-border p-3.5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="skeleton w-2 h-2 rounded-full" />
                          <div className="skeleton h-4 w-28" />
                          <div className="skeleton h-3 w-4" />
                          <div className="skeleton h-4 w-28" />
                          <div className="skeleton h-4 w-14 rounded-full" />
                        </div>
                        <div className="skeleton h-3 w-3/4 ml-5" />
                        <div className="skeleton h-3 w-1/2 ml-5 mt-1.5" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {interactions && (
                <div ref={analysisRef} tabIndex={-1} className="scroll-mt-5 outline-none">
                  <InteractionResults
                    interactions={interactions}
                    unknownDrugs={unknownDrugs}
                    onPrintBlocked={() => showToast('Yazdırma penceresi tarayıcı tarafından engellendi. Açılır pencerelere izin verin.', 'warning')}
                  />
                </div>
              )}
            </>
          );

    const resultsBlock = detailOnTop
      ? <>{detailCard}{analysisBlock}</>
      : <>{analysisBlock}{detailCard}</>;

    const sepet = selectedDrugs.length > 0 && (
      <SelectedDrugs
        drugs={selectedDrugs}
        onRemove={removeDrug}
        onSelect={openDrugDetail}
        activeDrugId={activeDrug?.id}
        onAnalyze={analyzeInteractions}
        analysisLoading={analysisLoading}
        onClearAll={clearAllDrugs}
        onToast={showToast}
        embedded={searchMode === 'drug'}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
        autoAnalyze={autoAnalyze}
        onToggleAutoAnalyze={() => setAutoAnalyze((p) => !p)}
      />
    );

    const hasSavedContent = savedLists.length > 0 || favorites.length > 0 || selectedDrugs.length >= 1;
    const savedListsPanel = (
      <SavedLists
        savedLists={savedLists}
        favorites={favorites}
        canSave={selectedDrugs.length >= 1}
        onSaveCurrent={handleSaveList}
        onLoadList={handleLoadList}
        onDeleteList={handleDeleteList}
        onAddFavorite={addDrug}
      />
    );

    if (searchMode === 'drug') {
      // Tek sayfa akışı: hero hep görünür; seçilen ilaçlar odak kartın içine
      // eklenir, sonuçlar kartın hemen altında aynı sayfada gösterilir.
      return (
        <>
          <Hero
            onConditionMode={() => handleNavigate('condition')}
            workspace={(errorBanner || activeDrug || analysisLoading || interactions) ? (
              <>
                {errorBanner}
                {resultsBlock}
              </>
            ) : null}
          >
            <DrugSearch
              onSelect={addDrug}
              selectedDrugs={selectedDrugs}
              maxDrugs={MAX_DRUGS}
              onMaxReached={() => showToast(`En fazla ${MAX_DRUGS} ilaç seçilebilir.`, 'warning')}
            />
            <FoodPicker
              selectedItems={selectedDrugs}
              onAdd={addDrug}
              maxItems={MAX_DRUGS}
              onMaxReached={() => showToast(`En fazla ${MAX_DRUGS} öge seçilebilir.`, 'warning')}
            />
            {sepet}
            {savedListsPanel}
          </Hero>
          {boxed(<LegalWarning />)}
        </>
      );
    }
    return boxed(
      <>
        {errorBanner}
        <ConditionSearch
          onSelect={addDrug}
          onViewDrug={openDrugDetail}
          selectedDrugs={selectedDrugs}
          maxDrugs={MAX_DRUGS}
          onMaxReached={() => showToast(`En fazla ${MAX_DRUGS} ilaç seçilebilir.`, 'warning')}
          renderBeforeResults={<>
            {sepet}
            {hasSavedContent && (
              <div className="bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] p-5 sm:p-[26px]">
                {savedListsPanel && (
                  <SavedLists
                    savedLists={savedLists}
                    favorites={favorites}
                    canSave={selectedDrugs.length >= 1}
                    onSaveCurrent={handleSaveList}
                    onLoadList={handleLoadList}
                    onDeleteList={handleDeleteList}
                    onAddFavorite={addDrug}
                    embedded={false}
                  />
                )}
              </div>
            )}
            {resultsBlock}
          </>}
        />
        <LegalWarning />
      </>
    );
  };

  // Yenilikler sayfasından ayrılırken ?p'yi temizle (yenilemede geri açılmasın).
  const clearChangelogParam = () => {
    try {
      if (new URLSearchParams(location.search).has('p')) {
        history.replaceState(null, '', location.pathname);
      }
    } catch {
      // history API yoksa önemli değil
    }
  };

  const handleNavigate = (id) => {
    clearChangelogParam();
    if (id === 'about') {
      setCurrentView('about');
      return;
    }
    if (id === 'changelog') {
      setCurrentView('changelog');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentView('checker');
    setSearchMode(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Logo: her durumda gerçek ana sayfaya (hero) döner — çalışma alanı sıfırlanır.
  const handleLogoClick = () => {
    clearChangelogParam();
    clearAllDrugs();
    setCurrentView('checker');
    setSearchMode('drug');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Klavye kullanıcısı için gezinmeyi atlama bağlantısı */}
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg focus:text-sm"
      >
        İçeriğe atla
      </a>
      <Navbar
        currentView={currentView}
        searchMode={searchMode}
        onNavigate={handleNavigate}
        onLogoClick={handleLogoClick}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(p => !p)}
      />
      <main id="icerik" className="flex-1 w-full">
        {renderContent()}
      </main>
      <Footer onNavigate={handleNavigate} />
      {toasts.length > 0 && (
        // aria-live: hata/uyarı toast'ları ekran okuyucuya da duyurulur
        <div className="fixed top-5 right-5 z-[100] space-y-2" role="status" aria-live="polite">
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
          ))}
        </div>
      )}
      <Onboarding />
      {showDisclaimerGate && (
        <DisclaimerGate
          onAccept={() => {
            setShowDisclaimerGate(false);
            // Onay verildi; bekleyen analizi başlat.
            analyzeInteractions();
          }}
          onCancel={() => setShowDisclaimerGate(false)}
        />
      )}
    </div>
  );
}
