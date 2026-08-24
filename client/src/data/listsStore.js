// Kayıtlı listeler + favori ilaçlar — tamamen cihazda (localStorage).
// Sepet (basketStore) gibi yalnız KİMLİK saklanır: liste = {d:[ilaç id], f:[besin
// anahtarı]}; adlar yüklerken güncel veriden çözülür. Sunucuya hiçbir şey gitmez.

const LISTS_KEY = 'saved_lists_v1';
const FAV_KEY = 'fav_drugs_v1';
const MAX_LISTS = 20;
const MAX_FAVS = 50;
const MAX_ITEMS = 10;
const FOOD_KEY_RE = /^[a-z0-9-]{1,40}$/;
const ID_RE = /^\d+$/;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage kapalıysa kalıcılık sessizce devre dışı kalır
  }
}

// --- Kayıtlı listeler ---

// Bozuk/eski kayıtları ayıklayıp normalize eder; adlar burada TUTULMAZ,
// yalnız kimlikler — çağıran (App) id'leri güncel veriden çözer.
export function getSavedLists() {
  const arr = readJSON(LISTS_KEY, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((l) => l && typeof l === 'object')
    .map((l) => ({
      id: String(l.id || ''),
      name: String(l.name || '').slice(0, 60),
      savedAt: Number(l.savedAt) || 0,
      d: (Array.isArray(l.d) ? l.d : []).filter((x) => ID_RE.test(String(x))).map(String).slice(0, MAX_ITEMS),
      f: (Array.isArray(l.f) ? l.f : []).filter((x) => FOOD_KEY_RE.test(String(x))).map(String).slice(0, MAX_ITEMS),
    }))
    .filter((l) => l.id && (l.d.length > 0 || l.f.length > 0));
}

// Yeni id: mevcut en büyük sayısal id + 1 (çakışmasız, saat bağımsız).
function nextId(existing) {
  let max = 0;
  for (const l of existing) {
    const n = parseInt(l.id, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

// items = seçili öğeler (App'teki selectedDrugs biçimi: {id, isFood, foodKey}).
// Boş liste kaydedilmez; en yeni başta; MAX_LISTS'i aşınca en eski düşer.
export function saveList(name, items) {
  const lists = getSavedLists();
  const d = items.filter((x) => !x.isFood).map((x) => String(x.id)).filter((x) => ID_RE.test(x)).slice(0, MAX_ITEMS);
  const f = items.filter((x) => x.isFood).map((x) => x.foodKey).filter((x) => FOOD_KEY_RE.test(String(x))).slice(0, MAX_ITEMS);
  if (d.length === 0 && f.length === 0) return null;
  const cleanName = String(name || '').trim().slice(0, 60) || `Liste ${lists.length + 1}`;
  const entry = { id: nextId(lists), name: cleanName, savedAt: Date.now(), d, f };
  writeJSON(LISTS_KEY, [entry, ...lists].slice(0, MAX_LISTS));
  return entry;
}

export function deleteList(id) {
  const next = getSavedLists().filter((l) => l.id !== String(id));
  writeJSON(LISTS_KEY, next);
  return next;
}

export function renameList(id, name) {
  const clean = String(name || '').trim().slice(0, 60);
  if (!clean) return getSavedLists();
  const next = getSavedLists().map((l) => (l.id === String(id) ? { ...l, name: clean } : l));
  writeJSON(LISTS_KEY, next);
  return next;
}

// --- Favori ilaçlar (yalnız ilaç id'leri; besin favorilenmez) ---

export function getFavoriteIds() {
  const arr = readJSON(FAV_KEY, []);
  return Array.isArray(arr) ? arr.filter((x) => ID_RE.test(String(x))).map(String).slice(0, MAX_FAVS) : [];
}

export function isFavorite(id) {
  return getFavoriteIds().includes(String(id));
}

// Ekli değilse ekler, ekliyse çıkarır; güncel favori id listesini döndürür.
export function toggleFavorite(id) {
  const s = String(id);
  if (!ID_RE.test(s)) return getFavoriteIds();
  const cur = getFavoriteIds();
  const next = cur.includes(s) ? cur.filter((x) => x !== s) : [s, ...cur].slice(0, MAX_FAVS);
  writeJSON(FAV_KEY, next);
  return next;
}
