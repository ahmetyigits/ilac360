import { useState, useEffect } from 'react';
import { getFoodItems } from '../data/api';

// Besin/içecek çipleri — İlaç-Besin etkileşim sorgusunun giriş yüzeyi.
// Tek tık sepete ekler; ekli olan çip basılı/pasif görünür. Yazı yazmadan
// çalışması bilinçli: girişsiz-anında kullanım farkını görünür kılar.
export default function FoodPicker({ selectedItems, onAdd, onMaxReached, maxItems = 10 }) {
  const [foods, setFoods] = useState([]);

  useEffect(() => {
    let stale = false;
    getFoodItems()
      .then((items) => { if (!stale) setFoods(items); })
      .catch(() => {}); // katalog yüklenemezse bölüm sessizce görünmez
    return () => { stale = true; };
  }, []);

  if (foods.length === 0) return null;

  const selectedIds = new Set(selectedItems.map((d) => d.id));
  const isFull = selectedItems.length >= maxItems;

  return (
    <div className="mt-4">
      <p className="font-mono text-[10.5px] tracking-[.12em] uppercase text-text-muted mb-2">
        Besin ve içecek ekle
        <span className="normal-case tracking-normal ml-2 text-[10px]">ilaçlarınızla etkileşimini görün</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {foods.map((food) => {
          const added = selectedIds.has(food.id);
          return (
            <button
              key={food.id}
              onClick={() => {
                if (added) return;
                if (isFull) { onMaxReached?.(); return; }
                onAdd(food);
              }}
              disabled={added}
              title={added ? 'Listede' : food.longName}
              aria-pressed={added}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[12.5px] font-medium border transition-all ${
                added
                  ? 'bg-accent-soft border-accent-light text-text-muted cursor-default'
                  : 'bg-card-inset border-border hover:border-accent/40 hover:bg-accent-soft/60 text-text-primary cursor-pointer'
              }`}
            >
              <span aria-hidden="true">{food.emoji}</span>
              {food.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
