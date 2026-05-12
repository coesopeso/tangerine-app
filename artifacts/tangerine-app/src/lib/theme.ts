/**
 * Tema colore accent — 6 preset selezionabili dall'utente.
 *
 * - L'attributo `data-theme` su `<html>` rimappa la variabile CSS `--primary`
 *   (e `--accent`, `--ring`, gli aloni ambient) tramite i blocchi definiti
 *   in `index.css`. `arancio` è il preset di default e coincide con `:root`.
 * - Persistito in `localStorage` (per applicarlo subito al boot, prima della
 *   hydrate) e su `profile.tema_colore` (per seguire l'utente tra device).
 */

export const TEMA_COLORI = ["arancio", "blu", "verde", "rosso", "viola", "grigio"] as const;
export type TemaColore = (typeof TEMA_COLORI)[number];

export const TEMA_COLORE_LABEL: Record<TemaColore, string> = {
  arancio: "Arancio",
  blu: "Blu",
  verde: "Verde",
  rosso: "Rosso",
  viola: "Viola",
  grigio: "Grigio",
};

/** Swatch hex usati nel selettore in Impostazioni (corrisponde a --primary). */
export const TEMA_COLORE_SWATCH: Record<TemaColore, string> = {
  arancio: "#E85002",
  blu: "#2F7BF3",
  verde: "#22A85A",
  rosso: "#DC4040",
  viola: "#8B5CF6",
  grigio: "#9CA3AF",
};

const LS_KEY = "tangerine.tema_colore";

export function isTemaColore(v: unknown): v is TemaColore {
  return typeof v === "string" && (TEMA_COLORI as readonly string[]).includes(v);
}

export function getStoredTema(): TemaColore {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (isTemaColore(v)) return v;
  } catch {
    /* localStorage non disponibile (SSR/private mode) */
  }
  return "arancio";
}

/** Imposta `data-theme` su <html> e (se richiesto) persiste in localStorage. */
export function applyTema(t: TemaColore, persist = true): void {
  const html = document.documentElement;
  if (t === "arancio") html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", t);
  if (persist) {
    try {
      localStorage.setItem(LS_KEY, t);
    } catch {
      /* ignore */
    }
  }
}
