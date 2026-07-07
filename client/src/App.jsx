import { useState, useCallback, useEffect, useRef } from 'react';
import { bootData, getStats, analyzeInteractions as analyzeInteractionsApi } from './data/api';
import DisclaimerGate from './components/DisclaimerGate';
import { hasAcknowledgedDisclaimer } from './data/disclaimer.js';
import { AlertTriangle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DrugSearch from './components/DrugSearch';
import SelectedDrugs from './components/SelectedDrugs';
import DrugCard from './components/DrugCard';
import InteractionResults from './components/InteractionResults';
import LegalWarning from './components/LegalWarning';
import AboutPage from './components/AboutPage';
import Toast from './components/Toast';
import Onboarding from './components/Onboarding';
import ConditionSearch from './components/ConditionSearch';
import Hero from './components/Hero';
import Footer from './components/Footer';

const MAX_DRUGS = 10;

export default function App() {
  const [currentView, setCurrentView] = useState('checker');
  const [searchMode, setSearchMode] = useState('drug');
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  const [activeDrug, setActiveDrug] = useState(null);
  const [interactions, setInteractions] = useState(null);
  const [unknownDrugs, setUnknownDrugs] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [dataError, setDataError] = useState(false);
  const [showDisclaimerGate, setShowDisclaimerGate] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const analysisRef = useRef(null);
  const drugCardRef = useRef(null);
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

  const loadInitialData = useCallback(() => {
    setDataError(false);
    // bootData üç veri setini birden ısıtır; istatistikler ilaç+kural verisinden gelir.
    bootData()
      .then(() => getStats())
      .then(setStats)
      .catch(() => setDataError(true));
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Analiz sonucu gelince görünür alana kaydır — özellikle hastalık aramasında
  // uzun sonuç listesi varken sonuçların "kaybolmasını" engeller.
  useEffect(() => {
    if (interactions) {
      analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [interactions]);

  useEffect(() => {
    if (activeDrug) {
      drugCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeDrug]);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }].slice(-4));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
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
    if (!hasAcknowledgedDisclaimer()) {
      setShowDisclaimerGate(true);
      return;
    }
    setAnalysisLoading(true);
    setUnknownDrugs([]);
    try {
      const data = await analyzeInteractionsApi(selectedDrugs.map((d) => d.name));
      setInteractions(data.interactions);
      setUnknownDrugs(data.unknownDrugs || []);
      if (data.unknownDrugs?.length > 0) {
        showToast(`Veritabanında bulunamayan ilaç: ${data.unknownDrugs.join(', ')}`, 'warning');
      }
    } catch {
      setInteractions(null);
      showToast('Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedDrugs, showToast]);

  const renderContent = () => {
    if (currentView === 'about') {
      return <AboutPage stats={stats} />;
    }

    return (
      <div className="max-w-5xl mx-auto space-y-5">
        {dataError && (
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">İlaç verileri yüklenemedi</p>
              <p className="text-[12px] text-red-700 mt-0.5">
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
        )}

        {selectedDrugs.length === 0 && !interactions && <Hero />}

        <div className="flex gap-1 bg-card rounded-xl border border-border p-1">
          <button
            onClick={() => setSearchMode('drug')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              searchMode === 'drug'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
            }`}
          >
            İlaç Ara
          </button>
          <button
            onClick={() => setSearchMode('condition')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              searchMode === 'condition'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
            }`}
          >
            Hastalığa Göre Ara
          </button>
        </div>

        {(() => {
          // Sepet + ilaç detayı + analiz sonuçları her iki arama modunda da
          // arama listesinin ÜSTÜNDE durur; hastalık aramasının uzun sonuç
          // listesi bu blokları ekran dışına itemez.
          const workspace = (
            <>
              {selectedDrugs.length > 0 && (
                <SelectedDrugs
                  drugs={selectedDrugs}
                  onRemove={removeDrug}
                  onSelect={setActiveDrug}
                  activeDrugId={activeDrug?.id}
                  onAnalyze={analyzeInteractions}
                  analysisLoading={analysisLoading}
                  onClearAll={clearAllDrugs}
                />
              )}

              {activeDrug && (
                <div ref={drugCardRef}>
                  <DrugCard key={activeDrug.id} drug={activeDrug} onClose={() => setActiveDrug(null)} />
                </div>
              )}

              {analysisLoading && (
                <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
                  <div className="px-5 py-3.5 border-b border-border flex items-center gap-2.5">
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
                <div ref={analysisRef} className="scroll-mt-5">
                  <InteractionResults
                    interactions={interactions}
                    unknownDrugs={unknownDrugs}
                    onPrintBlocked={() => showToast('Yazdırma penceresi tarayıcı tarafından engellendi. Açılır pencerelere izin verin.', 'warning')}
                  />
                </div>
              )}
            </>
          );

          if (searchMode === 'drug') {
            return (
              <>
                <DrugSearch
                  onSelect={addDrug}
                  selectedDrugs={selectedDrugs}
                  maxDrugs={MAX_DRUGS}
                  onMaxReached={() => showToast(`En fazla ${MAX_DRUGS} ilaç seçilebilir.`, 'warning')}
                />
                {workspace}
              </>
            );
          }
          return (
            <ConditionSearch
              onSelect={addDrug}
              onViewDrug={setActiveDrug}
              selectedDrugs={selectedDrugs}
              maxDrugs={MAX_DRUGS}
              onMaxReached={() => showToast(`En fazla ${MAX_DRUGS} ilaç seçilebilir.`, 'warning')}
              renderBeforeResults={workspace}
            />
          );
        })()}

        <LegalWarning />
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(p => !p)}
        selectedCount={selectedDrugs.length}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          totalDrugs={stats?.totalDrugs || 0}
          selectedCount={selectedDrugs.length}
          lastAnalysis={interactions ? `${interactions.length} etkileşim` : null}
          currentView={currentView}
        />
        <main className="flex-1 overflow-y-auto p-5">
          {renderContent()}
          <Footer />
        </main>
      </div>
      {toasts.length > 0 && (
        <div className="fixed top-5 right-5 z-[100] space-y-2">
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
