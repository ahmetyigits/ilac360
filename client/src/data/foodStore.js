// Besin/içecek katalogu (data/food-items.json) — İlaç-Besin etkileşim
// sorgusunun picker/sepet katmanı. Kural içeriği taşımaz; kurallar
// drug-warnings.json'daki foodKeys etiketli kayıtlardır (warningMatcher).

import { dataUrl } from './drugStore.js';

let foodItems = [];
let byKey = new Map();
let loadPromise = null;

function index(items) {
  foodItems = items;
  byKey = new Map(items.map((f) => [f.key, f]));
}

export function loadFoods() {
  if (loadPromise) return loadPromise;
  loadPromise = dataUrl('food-items.json')
    .then((url) => fetch(url))
    .then((r) => (r.ok ? r.json() : []))
    .then((items) => {
      index(Array.isArray(items) ? items : []);
      return foodItems;
    })
    .catch((err) => {
      // Geçici hata memoize edilmesin; sonraki çağrı yeniden denesin.
      loadPromise = null;
      throw err;
    });
  return loadPromise;
}

// Test kancası: fetch olmadan katalog enjekte etmek için.
export function setFoodsForTest(items) {
  index(items);
  loadPromise = Promise.resolve(foodItems);
}

export function getFoodList() {
  return foodItems;
}

export function getFoodByKey(key) {
  return byKey.get(key) || null;
}

// Paylaşım linkindeki/localStorage'daki anahtarları çözer; katalogda
// olmayanlar (bozuk/eski link) sessizce ayrılır.
export function getFoodsByKeys(keys) {
  const foods = [];
  const invalidKeys = [];
  for (const key of keys) {
    const f = byKey.get(key);
    if (f) foods.push(f);
    else invalidKeys.push(key);
  }
  return { foods, invalidKeys };
}

// Sepet ögesi biçimi: ilaçlarla aynı listede yaşar; id 'f:' önekiyle sayısal
// ilaç id'leriyle asla çakışmaz. isFood bayrağı UI ve analiz map'inde kullanılır.
export function toBasketItem(food) {
  return {
    id: `f:${food.key}`,
    isFood: true,
    foodKey: food.key,
    name: food.name,
    emoji: food.emoji,
    longName: food.longName || food.name,
  };
}
