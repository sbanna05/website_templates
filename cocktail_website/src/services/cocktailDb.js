/**
 * Thin client for TheCocktailDB (free public API, test key "1").
 * https://www.thecocktaildb.com/api.php
 *
 * Responses are normalised into the app's own shape and cached in
 * sessionStorage, so the UI never depends on the API's field names.
 */
const API_URL = "https://www.thecocktaildb.com/api/json/v1/1";
const IMAGE_URL = "https://www.thecocktaildb.com/images";
const CACHE_PREFIX = "cocktaildb:v1:";
const MAX_INGREDIENTS = 15;

/** Drink photo at a given preview size ("small" ≈100px, "medium" ≈350px, "large" ≈700px). */
export const drinkImage = (url, size) => (size ? `${url}/${size}` : url);

/** Bottle / ingredient photo, e.g. ingredientImage("Campari"). */
export const ingredientImage = (name, size = "Medium") =>
  `${IMAGE_URL}/ingredients/${encodeURIComponent(name)}-${size}.png`;

export function toCocktail(raw) {
  const ingredients = [];
  for (let n = 1; n <= MAX_INGREDIENTS; n++) {
    const name = raw[`strIngredient${n}`]?.trim();
    if (!name) continue;
    const measure = raw[`strMeasure${n}`]?.trim();
    ingredients.push(measure ? `${measure} ${name}` : name);
  }

  return {
    id: raw.idDrink,
    name: raw.strDrink,
    category: raw.strCategory,
    glass: raw.strGlass,
    instructions: raw.strInstructions,
    image: drinkImage(raw.strDrinkThumb, "medium"),
    imageLarge: drinkImage(raw.strDrinkThumb, "large"),
    ingredients,
  };
}

function readCache(key) {
  try {
    const hit = sessionStorage.getItem(CACHE_PREFIX + key);
    return hit ? JSON.parse(hit) : null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / private mode – caching is optional */
  }
}

async function request(path, { signal } = {}) {
  const res = await fetch(`${API_URL}/${path}`, { signal });
  if (!res.ok) throw new Error(`TheCocktailDB responded ${res.status}`);
  return res.json();
}

export async function getCocktailById(id, options) {
  const cached = readCache(id);
  if (cached) return cached;

  const { drinks } = await request(`lookup.php?i=${encodeURIComponent(id)}`, options);
  if (!drinks?.length) throw new Error(`Cocktail ${id} not found`);

  const cocktail = toCocktail(drinks[0]);
  writeCache(id, cocktail);
  return cocktail;
}

/** Fetches several drinks in parallel; tolerates partial failures, throws only if all fail. */
export async function getCocktailsById(ids, options) {
  const results = await Promise.allSettled(ids.map((id) => getCocktailById(id, options)));
  if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const drinks = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (!drinks.length) throw results[0]?.reason ?? new Error("No cocktails loaded");
  return drinks;
}
