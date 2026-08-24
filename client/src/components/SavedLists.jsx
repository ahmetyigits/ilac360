import { useState } from 'react';
import { Bookmark, Star, X, Check, Plus } from 'lucide-react';

// Kayıtlı listeler + favori ilaçlar paneli — tamamen cihazda (listsStore).
// Yalnız gösterilecek bir şey varsa render edilir (boşken görünmez).
export default function SavedLists({ savedLists, favorites, canSave, onSaveCurrent, onLoadList, onDeleteList, onAddFavorite, embedded = true }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const hasAnything = canSave || savedLists.length > 0 || favorites.length > 0;
  if (!hasAnything) return null;

  const commitSave = () => {
    onSaveCurrent(name.trim());
    setName('');
    setNaming(false);
  };

  return (
    <div className={embedded ? 'mt-4 pt-4 border-t border-border-light space-y-3' : 'space-y-3'}>
      {/* Kaydet satırı */}
      {canSave && (
        naming ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSave();
                if (e.key === 'Escape') { setNaming(false); setName(''); }
              }}
              maxLength={60}
              placeholder="Liste adı (ör. Annemin ilaçları)"
              aria-label="Liste adı"
              className="flex-1 min-w-0 px-3 py-2 rounded-[10px] border border-border bg-card text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              onClick={commitSave}
              aria-label="Listeyi kaydet"
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-accent text-white text-[13px] font-semibold hover:bg-accent-deep transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Kaydet
            </button>
            <button
              onClick={() => { setNaming(false); setName(''); }}
              aria-label="Vazgeç"
              className="px-2 py-2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNaming(true)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent-deep transition-colors cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" /> Bu listeyi kaydet
          </button>
        )
      )}

      {/* Kayıtlı listeler */}
      {savedLists.length > 0 && (
        <div>
          <p className="font-mono text-[10.5px] tracking-[.12em] uppercase text-text-muted mb-1.5">Kayıtlı Listelerim</p>
          <div className="flex flex-wrap gap-2">
            {savedLists.map((list) => {
              const count = list.d.length + list.f.length;
              return (
                <div key={list.id} className="flex items-center rounded-xl text-[13px] font-medium bg-card-inset border border-border">
                  <button
                    onClick={() => onLoadList(list)}
                    aria-label={`${list.name} listesini yükle`}
                    title={`${list.name} — ${count} öge · yükle`}
                    className="flex items-center gap-1.5 pl-3 py-2 rounded-l-xl text-text-primary hover:text-accent transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="truncate max-w-40">{list.name}</span>
                    <span className="font-mono text-[10.5px] text-text-muted">{count}</span>
                  </button>
                  <button
                    onClick={() => onDeleteList(list.id)}
                    aria-label={`${list.name} listesini sil`}
                    className="px-2.5 py-2 rounded-r-xl text-[15px] leading-none text-text-muted hover:text-risk-high transition-colors cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Favori ilaçlar (hızlı ekle) */}
      {favorites.length > 0 && (
        <div>
          <p className="font-mono text-[10.5px] tracking-[.12em] uppercase text-text-muted mb-1.5">Favori İlaçlarım</p>
          <div className="flex flex-wrap gap-2">
            {favorites.map((drug) => (
              <button
                key={drug.id}
                onClick={() => onAddFavorite(drug)}
                aria-label={`${drug.name} listeye ekle`}
                title={`${drug.name} — listeye ekle`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium bg-card-inset border border-border text-text-primary hover:border-accent/40 hover:text-accent transition-colors cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                <span className="truncate max-w-40">{drug.name}</span>
                <Plus className="w-3.5 h-3.5 text-text-muted shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
