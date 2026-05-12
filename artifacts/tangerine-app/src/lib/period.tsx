/**
 * Periodo globale dell'app — un solo stato condiviso da Dashboard, Mesi e
 * qualsiasi altra schermata che mostri dati nel tempo.
 *
 * Sostituisce la coppia (anno, mese) sparsa in App.tsx + le selezioni locali
 * dentro le singole pagine. Persiste su localStorage così la scelta resta tra
 * sessioni.
 *
 * Sei tipi di periodo, in ordine di "ampiezza":
 *   - MESE         : un singolo mese (anchor: anno + mese)
 *   - TRIMESTRE    : 3 mesi (anchor: anno + mese del trimestre)
 *   - ANNO_YTD     : da gennaio al mese corrente (solo se anno corrente)
 *   - ANNO_INTERO  : tutti i 12 mesi dell'anno
 *   - CUSTOM       : da una data a un'altra (yyyy-mm-dd, può attraversare anni)
 *   - TUTTI        : dal 2020 (o min disponibile) all'oggi
 *
 * Helper esportati:
 *   - mesiInPeriodo()       → lista di {anno,mese} coperti dal periodo
 *   - labelPeriodo()        → stringa user-facing in italiano
 *   - periodoPrecedente()   → periodo "stessa forma" a ritroso (per i delta)
 *   - periodoSuccessivo()   → idem in avanti (per le frecce navigazione)
 *   - PeriodProvider/usePeriod → React context
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { nomeMese } from "@/lib/format";

export type PeriodKind =
  | "MESE"
  | "TRIMESTRE"
  | "ANNO_YTD"
  | "ANNO_INTERO"
  | "CUSTOM"
  | "TUTTI";

export interface Period {
  kind: PeriodKind;
  /** Anchor anno (per MESE/TRIM/ANNO_*). Per CUSTOM/TUTTI: 1° anno coperto. */
  anno: number;
  /** Per MESE: il mese (1-12). Per TRIM: il primo mese del trimestre.
   *  Per gli altri: indicativo, non usato dal motore. */
  mese: number;
  /** CUSTOM: data inizio inclusa (yyyy-mm-dd) */
  from?: string;
  /** CUSTOM: data fine inclusa (yyyy-mm-dd) */
  to?: string;
}

export interface MeseRef {
  anno: number;
  mese: number;
}

// ─── helpers ────────────────────────────────────────────────────

const MIN_ANNO_TUTTI = 2020;

export function mesiInPeriodo(p: Period, oggi: Date = new Date()): MeseRef[] {
  switch (p.kind) {
    case "MESE":
      return [{ anno: p.anno, mese: p.mese }];
    case "TRIMESTRE": {
      const trim = Math.ceil(p.mese / 3);
      return [trim * 3 - 2, trim * 3 - 1, trim * 3].map((m) => ({
        anno: p.anno,
        mese: m,
      }));
    }
    case "ANNO_YTD": {
      const lastM = p.anno === oggi.getFullYear() ? oggi.getMonth() + 1 : 12;
      return Array.from({ length: lastM }, (_, i) => ({
        anno: p.anno,
        mese: i + 1,
      }));
    }
    case "ANNO_INTERO":
      return Array.from({ length: 12 }, (_, i) => ({ anno: p.anno, mese: i + 1 }));
    case "CUSTOM": {
      if (!p.from || !p.to) return [];
      return mesiTraDate(p.from, p.to);
    }
    case "TUTTI": {
      const out: MeseRef[] = [];
      const end = oggi.getFullYear();
      for (let y = MIN_ANNO_TUTTI; y <= end; y++) {
        const last = y === end ? oggi.getMonth() + 1 : 12;
        for (let m = 1; m <= last; m++) out.push({ anno: y, mese: m });
      }
      return out;
    }
  }
}

function mesiTraDate(from: string, to: string): MeseRef[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  if (!fy || !fm || !ty || !tm) return [];
  const out: MeseRef[] = [];
  let y = fy;
  let m = fm;
  let safety = 0;
  while ((y < ty || (y === ty && m <= tm)) && safety++ < 600) {
    out.push({ anno: y, mese: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function labelPeriodo(p: Period): string {
  switch (p.kind) {
    case "MESE":
      return `${nomeMese(p.mese)} ${p.anno}`;
    case "TRIMESTRE":
      return `Q${Math.ceil(p.mese / 3)} ${p.anno}`;
    case "ANNO_YTD": {
      const annoCorrente = new Date().getFullYear();
      if (p.anno === annoCorrente) return `${p.anno} (anno in corso)`;
      // Per anni passati YTD coincide con anno intero, ma manteniamo l'etichetta
      // esplicita "gen → dic" per chiarire che è una vista cumulativa.
      return `${p.anno} (gen → dic)`;
    }
    case "ANNO_INTERO":
      return `Anno ${p.anno}`;
    case "CUSTOM":
      return p.from && p.to
        ? `${formatBreve(p.from)} → ${formatBreve(p.to)}`
        : "Periodo personalizzato";
    case "TUTTI":
      return "Tutti i dati";
  }
}

function formatBreve(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String(y).slice(-2)}`;
}

export function periodoPrecedente(p: Period): Period | null {
  switch (p.kind) {
    case "MESE": {
      const m = p.mese === 1 ? 12 : p.mese - 1;
      const a = p.mese === 1 ? p.anno - 1 : p.anno;
      return { kind: "MESE", anno: a, mese: m };
    }
    case "TRIMESTRE": {
      const trim = Math.ceil(p.mese / 3);
      const prevTrim = trim === 1 ? 4 : trim - 1;
      const prevAnno = trim === 1 ? p.anno - 1 : p.anno;
      return { kind: "TRIMESTRE", anno: prevAnno, mese: prevTrim * 3 - 2 };
    }
    case "ANNO_YTD":
    case "ANNO_INTERO":
      return { kind: p.kind, anno: p.anno - 1, mese: 1 };
    case "CUSTOM": {
      if (!p.from || !p.to) return null;
      // Aritmetica calendario in UTC per evitare drift su DST.
      const fromD = parseIsoUTC(p.from);
      const toD = parseIsoUTC(p.to);
      if (!fromD || !toD) return null;
      const giorniLen =
        Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1; // +1 perché inclusivo
      const newTo = addUTCDays(fromD, -1);
      const newFrom = addUTCDays(newTo, -(giorniLen - 1));
      return {
        kind: "CUSTOM",
        anno: newFrom.getUTCFullYear(),
        mese: newFrom.getUTCMonth() + 1,
        from: isoDateUTC(newFrom),
        to: isoDateUTC(newTo),
      };
    }
    case "TUTTI":
      return null;
  }
}

export function periodoSuccessivo(p: Period): Period | null {
  switch (p.kind) {
    case "MESE": {
      const m = p.mese === 12 ? 1 : p.mese + 1;
      const a = p.mese === 12 ? p.anno + 1 : p.anno;
      return { kind: "MESE", anno: a, mese: m };
    }
    case "TRIMESTRE": {
      const trim = Math.ceil(p.mese / 3);
      const nextTrim = trim === 4 ? 1 : trim + 1;
      const nextAnno = trim === 4 ? p.anno + 1 : p.anno;
      return { kind: "TRIMESTRE", anno: nextAnno, mese: nextTrim * 3 - 2 };
    }
    case "ANNO_YTD":
    case "ANNO_INTERO":
      return { kind: p.kind, anno: p.anno + 1, mese: 1 };
    default:
      return null;
  }
}

function parseIsoUTC(s: string): Date | null {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}
function addUTCDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}
function isoDateUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** True quando il Period è applicabile senza generare comportamenti degeneri. */
export function periodoValido(p: Period): boolean {
  if (p.kind !== "CUSTOM") return true;
  if (!p.from || !p.to) return false;
  return p.from <= p.to;
}

/** Default sensato quando l'utente cambia tipo di periodo nel picker. */
export function defaultsForKind(
  kind: PeriodKind,
  prev: Period,
  oggi: Date = new Date(),
): Partial<Period> {
  switch (kind) {
    case "CUSTOM": {
      // Inizializza al mese corrente del periodo precedente (1°-ultimo giorno)
      const a = prev.anno;
      const m = prev.mese;
      const last = new Date(a, m, 0).getDate();
      return {
        from: `${a}-${String(m).padStart(2, "0")}-01`,
        to: `${a}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
      };
    }
    case "TUTTI":
      return { anno: oggi.getFullYear(), mese: oggi.getMonth() + 1 };
    case "ANNO_YTD":
    case "ANNO_INTERO":
      return { mese: 1 };
    case "TRIMESTRE": {
      // Allinea al primo mese del trimestre già "selezionato"
      const trim = Math.ceil(prev.mese / 3);
      return { mese: trim * 3 - 2 };
    }
    default:
      return {};
  }
}

// ─── React Context ──────────────────────────────────────────────

interface PeriodCtx {
  period: Period;
  setPeriod: (p: Period) => void;
}

const PeriodContext = createContext<PeriodCtx | null>(null);

const STORAGE_KEY = "tangerine.period.v1";

function defaultPeriod(): Period {
  const now = new Date();
  return { kind: "MESE", anno: now.getFullYear(), mese: now.getMonth() + 1 };
}

function loadPersisted(): Period | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.kind !== "string" || typeof p?.anno !== "number") return null;
    return p as Period;
  } catch {
    return null;
  }
}

function persist(p: Period) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* quota / privacy mode: ignoro */
  }
}

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriodState] = useState<Period>(() => loadPersisted() ?? defaultPeriod());
  useEffect(() => persist(period), [period]);
  const setPeriod = useCallback((p: Period) => setPeriodState(p), []);
  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>{children}</PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodCtx {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod() chiamato fuori da <PeriodProvider>");
  return ctx;
}
