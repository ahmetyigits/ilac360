// Sepet kalıcılığı + paylaşılabilir listeler — tamamen cihazda.
// localStorage'da yalnızca ilaç KİMLİKLERİ tutulur; adlar her açılışta güncel
// veri setinden yeniden çözülür (ürün adı değişirse eskisi taşınmaz).
// Paylaşım: ?d=id1,id2 sorgu parametresi — sunucuya hiçbir şey gitmez.

const BASKET_KEY = 'basket_v1';

export function saveBasket(drugs) {
  try {
    localStorage.setItem(BASKET_KEY, JSON.stringify(drugs.map((d) => String(d.id))));
  } catch {
    // localStorage kapalıysa kalıcılık sessizce devre dışı kalır
  }
}

export function loadBasketIds() {
  try {
    const raw = localStorage.getItem(BASKET_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter((x) => /^\d+$/.test(String(x))).map(String) : [];
  } catch {
    return [];
  }
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
      .slice(0, 10);
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

export function buildShareUrl(drugs) {
  const ids = drugs.map((d) => String(d.id)).join(',');
  return `${location.origin}${location.pathname}?d=${ids}`;
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
