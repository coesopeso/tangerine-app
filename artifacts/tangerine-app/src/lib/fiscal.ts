/**
 * Motore fiscale Tangerine v5.2 — implementa FISCAL_ENGINE.md.
 * Deterministico, funzione pura. Mai persistere i risultati.
 *
 * Scenari A-J validati nel test (lib/fiscal.test.ts).
 * In particolare il caso reale Marzo 2026 di Augusto deve restituire:
 *   incassato_piva = 1300, tasse = 50.70, inps_fisso = 384.31,
 *   zavorra = 435.01, quota_socio_mese = 264.3498
 */
import type { Fattura, Profile, RiepilogoMese, Spesa, AllocazioneSecchiello } from "./types";
import { mesiInPeriodo, type Period, type MeseRef } from "./period";

function inMese(dateIso: string | null | undefined, anno: number, mese: number): boolean {
  if (!dateIso) return false;
  // ISO yyyy-mm-dd (mese 1-12)
  const [y, m] = dateIso.split("-").map(Number);
  return y === anno && m === mese;
}

export function calcolaRiepilogoAnno(
  fatture: Fattura[],
  spese: Spesa[],
  allocazioni: AllocazioneSecchiello[],
  profile: Profile,
  /**
   * Set di id dei secchielli con tipo='TAX'. Le allocazioni verso questi
   * secchielli NON vengono sottratte dal Netto Lordo nel calcolo Tax-safe
   * (sono già parte della zavorra fiscale). Vedi types.ts → TipoSecchiello.
   */
  taxBucketIds: ReadonlySet<string> = new Set(),
): RiepilogoMese[] {
  const out: RiepilogoMese[] = [];
  let imp_ytd_prev = 0;

  for (let m = 1; m <= 12; m++) {
    const incassiMese = fatture.filter(
      (f) => f.stato === "INCASSATO" && inMese(f.data_incasso, profile.anno_fiscale, m),
    );
    const piva = incassiMese.filter((f) => f.tipo === "FATTURA_PIVA");
    const priv = incassiMese.filter((f) => f.tipo === "ENTRATA_PRIVATA");

    const incassato_piva = piva.reduce((s, f) => s + f.lordo, 0);
    const incassato_privato = priv.reduce((s, f) => s + f.lordo, 0);

    const imponibile_mese = incassato_piva * profile.coefficiente_redditivita;
    const imponibile_ytd = imp_ytd_prev + imponibile_mese;
    const tasse_mese = incassato_piva * profile.coefficiente_redditivita * profile.aliquota_imposta;

    let inps_fisso_mese = 0;
    let inps_eccedenza_mese = 0;
    if (profile.tipo_inps === "ARTIGIANI" || profile.tipo_inps === "COMMERCIANTI") {
      inps_fisso_mese = profile.inps_fisso_mensile;
      const ecc_curr = Math.max(0, imponibile_ytd - profile.inps_minimale_annuo);
      const ecc_prev = Math.max(0, imp_ytd_prev - profile.inps_minimale_annuo);
      inps_eccedenza_mese = (ecc_curr - ecc_prev) * profile.inps_aliquota_eccedenza;
    } else {
      inps_eccedenza_mese = imponibile_mese * profile.inps_aliquota_gs;
    }

    const zavorra_fiscale_mese = tasse_mese + inps_fisso_mese + inps_eccedenza_mese;

    // Quota socio: solo FATTURA_PIVA con con_socio. NON entra in zavorra.
    const quota_socio_mese = piva
      .filter((f) => f.con_socio)
      .reduce(
        (s, f) =>
          s + f.lordo * profile.coefficiente_redditivita * profile.inps_aliquota_socio_simulata,
        0,
      );

    const spese_effettive_mese = spese
      .filter((s) => s.tipo === "EFFETTIVA" && inMese(s.data, profile.anno_fiscale, m))
      .reduce((s, x) => s + x.importo, 0);

    const allocMese = allocazioni.filter((a) =>
      inMese(a.mese, profile.anno_fiscale, m),
    );
    const allocazioni_secchielli_mese = allocMese.reduce((s, a) => s + a.importo, 0);
    const allocazioni_tax_mese = allocMese
      .filter((a) => taxBucketIds.has(a.secchiello_id))
      .reduce((s, a) => s + a.importo, 0);
    const allocazioni_discrezionali_mese =
      allocazioni_secchielli_mese - allocazioni_tax_mese;

    // Netto Lordo = "stipendio" del periodo, dopo solo gli obblighi fiscali.
    const netto_lordo_mese =
      incassato_piva + incassato_privato - zavorra_fiscale_mese;

    // Tax-safe = quello che resta davvero, dopo spese e accantonamenti
    // discrezionali (NON i secchielli TAX, già contati nella zavorra).
    const tax_safe_mese =
      netto_lordo_mese - spese_effettive_mese - allocazioni_discrezionali_mese;

    const saving_rate =
      incassato_piva + incassato_privato > 0
        ? allocazioni_secchielli_mese / (incassato_piva + incassato_privato)
        : 0;

    out.push({
      mese: m,
      incassato_piva,
      incassato_privato,
      imponibile_mese,
      imponibile_ytd,
      tasse_mese,
      inps_fisso_mese,
      inps_eccedenza_mese,
      zavorra_fiscale_mese,
      quota_socio_mese,
      spese_effettive_mese,
      allocazioni_secchielli_mese,
      allocazioni_tax_mese,
      allocazioni_discrezionali_mese,
      netto_lordo_mese,
      tax_safe_mese,
      saving_rate,
    });

    imp_ytd_prev = imponibile_ytd;
  }

  return out;
}

export function calcolaMese(
  fatture: Fattura[],
  spese: Spesa[],
  allocazioni: AllocazioneSecchiello[],
  profile: Profile,
  mese: number,
  taxBucketIds: ReadonlySet<string> = new Set(),
): RiepilogoMese {
  const anno = calcolaRiepilogoAnno(fatture, spese, allocazioni, profile, taxBucketIds);
  return anno[mese - 1];
}

/**
 * Riepilogo aggregato su un Period (anche multi-anno o range custom).
 * Internamente cachea il calcolo per anno una sola volta.
 *
 * `per_mese` è la sequenza ordinata dei mesi coperti, ognuno arricchito con
 * `anno` per poter etichettare correttamente grafici e tabelle multi-anno.
 */
export interface RiepilogoMeseConAnno extends RiepilogoMese {
  anno: number;
}

export interface AggregatoPeriodo {
  refs: MeseRef[];
  per_mese: RiepilogoMeseConAnno[];
  fatturato_piva: number;
  entrate_private: number;
  imponibile: number;
  tasse: number;
  inps_fisso: number;
  inps_eccedenza: number;
  zavorra_fiscale: number;
  netto_lordo: number;
  spese_effettive: number;
  alloc_tax: number;
  alloc_discrezionali: number;
  alloc_totali: number;
  tax_safe: number;
  saving_rate: number;
  quota_socio: number;
  /** imponibile_ytd al termine dell'ultimo mese del periodo (utile per soglia INPS). */
  imponibile_ytd_fine: number;
}

export function aggregaPeriodo(
  p: Period,
  fatture: Fattura[],
  spese: Spesa[],
  allocazioni: AllocazioneSecchiello[],
  profile: Profile,
  taxBucketIds: ReadonlySet<string> = new Set(),
): AggregatoPeriodo {
  const refs = mesiInPeriodo(p);
  const anniUnici = Array.from(new Set(refs.map((r) => r.anno)));
  const cache = new Map<number, RiepilogoMese[]>();
  for (const a of anniUnici) {
    const profileScoped =
      profile.anno_fiscale === a ? profile : { ...profile, anno_fiscale: a };
    cache.set(
      a,
      calcolaRiepilogoAnno(fatture, spese, allocazioni, profileScoped, taxBucketIds),
    );
  }
  const per_mese: RiepilogoMeseConAnno[] = refs.map(({ anno, mese }) => {
    const r = cache.get(anno)![mese - 1];
    return { ...r, anno };
  });
  const sum = (k: keyof RiepilogoMese): number =>
    per_mese.reduce((s, r) => s + (r[k] as number), 0);
  const fatturato_piva = sum("incassato_piva");
  const entrate_private = sum("incassato_privato");
  const totale_entrate = fatturato_piva + entrate_private;
  const alloc_totali = sum("allocazioni_secchielli_mese");
  const last = per_mese[per_mese.length - 1];
  return {
    refs,
    per_mese,
    fatturato_piva,
    entrate_private,
    imponibile: sum("imponibile_mese"),
    tasse: sum("tasse_mese"),
    inps_fisso: sum("inps_fisso_mese"),
    inps_eccedenza: sum("inps_eccedenza_mese"),
    zavorra_fiscale: sum("zavorra_fiscale_mese"),
    netto_lordo: sum("netto_lordo_mese"),
    spese_effettive: sum("spese_effettive_mese"),
    alloc_tax: sum("allocazioni_tax_mese"),
    alloc_discrezionali: sum("allocazioni_discrezionali_mese"),
    alloc_totali,
    tax_safe: sum("tax_safe_mese"),
    saving_rate: totale_entrate > 0 ? alloc_totali / totale_entrate : 0,
    quota_socio: sum("quota_socio_mese"),
    imponibile_ytd_fine: last ? last.imponibile_ytd : 0,
  };
}

// ─── Previsione fine anno ───────────────────────────────────────
//
// Stima cosa resterà a fine anno fondendo tre componenti:
//   1. YTD reale: fatture INCASSATO + spese EFFETTIVA dei mesi già passati
//      (incluso il mese corrente).
//   2. Programmate future: fatture in stato PROGRAMMATO/FATTURATO con
//      data_incasso o data_scadenza_pagamento nei mesi rimanenti, e spese
//      tipo PROGRAMMATA datate nei mesi rimanenti.
//   3. Media YTD × moltiplicatore: per ciascun mese rimanente aggiunge un
//      "incasso medio" (e una spesa media) derivati dalla media mensile YTD,
//      con due moltiplicatori: 1.0 (alto/ottimista) e 0.5 (basso/prudente).
//
// Le allocazioni nei secchielli restano quelle reali — non vengono proiettate
// (l'utente le pianifica esplicitamente). Il calcolo riusa
// calcolaRiepilogoAnno() così la non-linearità dell'eccedenza INPS sopra il
// minimale viene gestita correttamente in entrambi gli scenari.

export interface PrevisioneScenario {
  netto_lordo: number;
  tax_safe: number;
  imponibile: number;
}

export interface PrevisioneAnno {
  anno: number;
  mese_corrente: number;
  mesi_rimanenti: number;
  /** Soglia INPS minimale annua (copiata da profile, per comodità UI). */
  soglia_inps: number;
  basso: PrevisioneScenario;
  alto: PrevisioneScenario;
}

export function previsioneAnno(
  anno: number,
  fatture: Fattura[],
  spese: Spesa[],
  allocazioni: AllocazioneSecchiello[],
  profile: Profile,
  taxBucketIds: ReadonlySet<string> = new Set(),
  oggi: Date = new Date(),
): PrevisioneAnno {
  const annoCorrente = oggi.getFullYear();
  // mese_corrente = ultimo mese "consuntivato" dal calendario reale.
  // - anno passato: tutti i 12 mesi sono noti, nessuna media residua.
  // - anno futuro: nessun mese consuntivato, tutta la previsione si basa su
  //   programmate (la media YTD vale 0).
  const mese_corrente =
    anno < annoCorrente ? 12 : anno > annoCorrente ? 0 : oggi.getMonth() + 1;
  const mesi_rimanenti = 12 - mese_corrente;

  const profileAnno =
    profile.anno_fiscale === anno ? profile : { ...profile, anno_fiscale: anno };

  // Calcoliamo subito la media mensile YTD (solo dal reale incassato/speso),
  // così possiamo fabbricare i mesi residui virtuali.
  let ytd_piva = 0;
  let ytd_priv = 0;
  let ytd_spese = 0;
  for (const f of fatture) {
    if (f.stato !== "INCASSATO" || !f.data_incasso) continue;
    const [y, m] = f.data_incasso.split("-").map(Number);
    if (y === anno && m <= mese_corrente) {
      if (f.tipo === "FATTURA_PIVA") ytd_piva += f.lordo;
      else ytd_priv += f.lordo;
    }
  }
  for (const s of spese) {
    if (s.tipo !== "EFFETTIVA") continue;
    const [y, m] = s.data.split("-").map(Number);
    if (y === anno && m <= mese_corrente) ytd_spese += s.importo;
  }
  const denom = Math.max(1, mese_corrente);
  const avg_piva = ytd_piva / denom;
  const avg_priv = ytd_priv / denom;
  const avg_spese = ytd_spese / denom;

  function scenario(mult: number): PrevisioneScenario {
    const fattureScen: Fattura[] = [];
    const speseScen: Spesa[] = [];

    // 1. YTD reale: già incassato/speso nei mesi 1..mese_corrente.
    for (const f of fatture) {
      if (f.stato === "INCASSATO" && f.data_incasso) {
        const [y, m] = f.data_incasso.split("-").map(Number);
        if (y === anno && m <= mese_corrente) fattureScen.push(f);
      }
    }
    for (const s of spese) {
      if (s.tipo === "EFFETTIVA") {
        const [y, m] = s.data.split("-").map(Number);
        if (y === anno && m <= mese_corrente) speseScen.push(s);
      }
    }

    // 2. Programmate future: convertite in "incassi/spese virtuali" datati nel
    // mese atteso, così che il motore le aggreghi normalmente.
    for (const f of fatture) {
      if (f.stato === "INCASSATO") continue;
      const dataAttesa = f.data_incasso ?? f.data_scadenza_pagamento ?? null;
      if (!dataAttesa) continue;
      const [y, m] = dataAttesa.split("-").map(Number);
      if (y === anno && m > mese_corrente) {
        fattureScen.push({ ...f, stato: "INCASSATO", data_incasso: dataAttesa });
      }
    }
    for (const s of spese) {
      if (s.tipo !== "PROGRAMMATA") continue;
      const [y, m] = s.data.split("-").map(Number);
      if (y === anno && m > mese_corrente) {
        speseScen.push({ ...s, tipo: "EFFETTIVA" });
      }
    }

    // 3. Media YTD × mult per ogni mese rimanente. Si somma a quanto già
    // programmato (i programmati sono entrate/spese specifiche; la media è
    // il "rumore di fondo" di un mese tipico).
    for (let m = mese_corrente + 1; m <= 12; m++) {
      const data = `${anno}-${String(m).padStart(2, "0")}-15`;
      if (avg_piva > 0) {
        fattureScen.push({
          id: `__prev_piva_${m}`,
          descrizione: "previsione media YTD",
          data_incasso: data,
          lordo: avg_piva * mult,
          tipo: "FATTURA_PIVA",
          stato: "INCASSATO",
          con_socio: false,
        });
      }
      if (avg_priv > 0) {
        fattureScen.push({
          id: `__prev_priv_${m}`,
          descrizione: "previsione media YTD",
          data_incasso: data,
          lordo: avg_priv * mult,
          tipo: "ENTRATA_PRIVATA",
          stato: "INCASSATO",
          con_socio: false,
        });
      }
      if (avg_spese > 0) {
        speseScen.push({
          id: `__prev_spesa_${m}`,
          descrizione: "previsione media YTD",
          data,
          categoria_id: "",
          importo: avg_spese * mult,
          tipo: "EFFETTIVA",
        });
      }
    }

    const rows = calcolaRiepilogoAnno(
      fattureScen,
      speseScen,
      allocazioni,
      profileAnno,
      taxBucketIds,
    );
    let netto_lordo = 0;
    let tax_safe = 0;
    let imponibile = 0;
    for (const r of rows) {
      netto_lordo += r.netto_lordo_mese;
      tax_safe += r.tax_safe_mese;
      imponibile += r.imponibile_mese;
    }
    return { netto_lordo, tax_safe, imponibile };
  }

  return {
    anno,
    mese_corrente,
    mesi_rimanenti,
    soglia_inps: profile.inps_minimale_annuo,
    basso: scenario(0.5),
    alto: scenario(1.0),
  };
}

export function eur(v: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function nomeMese(m: number): string {
  return [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ][m - 1];
}
