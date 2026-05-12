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
