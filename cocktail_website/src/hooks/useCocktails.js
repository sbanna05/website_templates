import { useEffect, useState } from "react";
import { getCocktailsById } from "../services/cocktailDb";

/**
 * Loads cocktails from TheCocktailDB by id.
 * Falls back to `fallback` (local data) when the API is unreachable.
 */
export function useCocktails(ids, fallback = []) {
  const key = ids.join(",");
  const [state, setState] = useState({ key: null, status: "loading", data: [] });

  useEffect(() => {
    const controller = new AbortController();

    getCocktailsById(key.split(","), { signal: controller.signal })
      .then((data) => setState({ key, status: "success", data }))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ key, status: "error", data: [] });
      });

    return () => controller.abort();
  }, [key]);

  const status = state.key === key ? state.status : "loading";
  const data = status === "error" ? fallback : state.data;
  return { status, data };
}
