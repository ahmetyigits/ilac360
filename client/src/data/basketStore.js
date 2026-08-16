// Sepet kalıcılığı + paylaşılabilir listeler — tamamen cihazda.
// localStorage'da yalnızca KİMLİKLER tutulur (ilaç id'leri + besin anahtarları);
// adlar her açılışta güncel veriden yeniden çözülür.
// Paylaşım: ?d=id1,id2&f=greyfurt,alkol — sunucuya hiçbir şey gitmez.
// ?d= ayrıştırması yalnız-rakam kalır: eski linkler aynen çalışır, eski
// istemciler bilmedikleri ?f= parametresini yok sayar.

const BASKET_KEY_V1 = 'basket_v1';
const BASKET_KEY = 'basket_v2';
const FOOD_KEY_RE = /^[a-z0-9-]{1,40}$/;
const MAX_ITEMS = 10;

export function saveBasket(items) {
  try {
    const d = items.filter((x) => !x.isFood).map((x) => String(x.id));
    const f = items.filter((x) => x.isFood).map((x) => x.foodKey);
    localStorage.setItem(BASKET_KEY, JSON.stringify({ d, f }));
  } catch {
    // localStorage kapalıysa kalıcılık sessizce devre dışı kalır
  }
}

// → { drugIds: string[], foodKeys: string[] } — v1'den sessiz migrasyon yapar.
export function loadBasket() {
  try {
    const raw = localStorage.getItem(BASKET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        drugIds: (Array.isArray(parsed?.d) ? parsed.d : []).filter((x) => /^\d+$/.test(String(x))).map(String),
        foodKeys: (Array.isArray(parsed?.f) ? parsed.f : []).filter((x) => FOOD_KEY_RE.test(String(x))).map(String),
      };
    }
    // v1: düz id dizisi — bir kez okunur, ilk saveBasket v2 yazar
    const v1 = localStorage.getItem(BASKET_KEY_V1);
    if (v1) {
      const ids = JSON.parse(v1);
      return {
        drugIds: Array.isArray(ids) ? ids.filter((x) => /^\d+$/.test(String(x))).map(String) : [],
        foodKeys: [],
      };
    }
  } catch {
    // bozuk veri → boş sepet
  }
  return { drugIds: [], foodKeys: [] };
}

// Geriye dönük uyumluluk (eski çağıranlar için): yalnız ilaç id'leri
export function loadBasketIds() {
  return loadBasket().drugIds;
}

// ?d=123,456 → ['123','456'] (yalnız rakamsal id'ler; kötü girdi elenir)
export function parseSharedIds(search) {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get('d');
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

// ?f=greyfurt,alkol → ['greyfurt','alkol'] (anahtar biçimi doğrulanır;
// katalog kontrolü çağıranda — foodStore.getFoodsByKeys)
export function parseSharedFoodKeys(search) {
  try {
    const raw = new URLSearchParams(search).get('f');
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => FOOD_KEY_RE.test(s))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

// ?drug=123 → tek ilaç detay deep-link'i (SEO sayfaları buraya bağlanır)
export function parseSharedDrugId(search) {
  try {
    const raw = new URLSearchParams(search).get('drug');
    return raw && /^\d+$/.test(raw.trim()) ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function buildShareUrl(items) {
  const ids = items.filter((x) => !x.isFood).map((x) => String(x.id)).join(',');
  const foods = items.filter((x) => x.isFood).map((x) => x.foodKey).join(',');
  // URLSearchParams virgülü %2C yapar; id'ler (rakam) ve besin anahtarları
  // ([a-z0-9-]) kodlama gerektirmez — okunabilir/eski biçimle uyumlu kalınır.
  const parts = [];
  if (ids) parts.push(`d=${ids}`);
  if (foods) parts.push(`f=${foods}`);
  return `${location.origin}${location.pathname}?${parts.join('&')}`;
}

// Paylaşım parametreleri tüketildikten sonra URL temizlenir: yenilemede
// tekrar içe aktarma ve yanlışlıkla yeniden paylaşma olmaz.
export function clearShareParams() {
  try {
    history.replaceState(null, '', location.pathname);
  } catch {
    // history API yoksa önemli değil
  }
}
