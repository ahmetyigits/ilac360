import { useState, useCallback, useEffect, useRef } from 'react';
import { getStats, analyzeInteractions as analyzeInteractionsApi } from './data/api';
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
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
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

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

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
          const sepet = selectedDrugs.length > 0 && (
            <SelectedDrugs
              drugs={selectedDrugs}
              onRemove={removeDrug}
              onSelect={setActiveDrug}
              activeDrugId={activeDrug?.id}
              onAnalyze={analyzeInteractions}
              analysisLoading={analysisLoading}
              onClearAll={clearAllDrugs}
            />
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
                {sepet}
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
              renderBeforeResults={sepet}
            />
          );
        })()}

        {activeDrug && (
          <DrugCard drug={activeDrug} onClose={() => setActiveDrug(null)} />
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
          <InteractionResults
            interactions={interactions}
            unknownDrugs={unknownDrugs}
          />
        )}

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
    </div>
  );
}
