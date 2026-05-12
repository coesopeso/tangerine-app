/**
 * Motore fiscale — copia 1:1 di src/lib/fiscal.ts.
 * Sorgente di verità deployata su Edge Function così tutti i device
 * vedono gli stessi numeri (vedi docs/API.md).
 *
 * Se modifichi qui, ALLINEA src/lib/fiscal.ts (e fai passare i test
 * scenari A-J in src/lib/fiscal.test.ts).
 */

export type TipoInps = "ARTIGIANI" | "COMMERCIANTI" | "GESTIONE_SEPARATA";
export type TipoFattura = "FATTURA_PIVA" | "ENTRATA_PRIVATA";
export type StatoFattura = "PROGRAMMATO" | "FATTURATO" | "INCASSATO";

export interface Profile {
  anno_fiscale: number;
  coefficiente_redditivita: number;
  aliquota_imposta: number;
  tipo_inps: TipoInps;
  inps_minimale_annuo: number;
  inps_fisso_mensile: number;
  inps_aliquota_eccedenza: number;
  inps_aliquota_gs: number;
  inps_aliquota_socio_simulata: number;
}

export interface Fattura {
  data_incasso: string | null;
  lordo: number;
  tipo: TipoFattura;
  stato: StatoFattura;
  con_socio: boolean;
}

export interface Spesa {
  data: string;
  importo: number;
  tipo: "EFFETTIVA" | "PROGRAMMATA";
}

export interface Allocazione {
  mese: string;
  importo: number;
}

export interface RiepilogoMese {
  mese: number;
  incassato_piva: number;
  incassato_privato: number;
  imponibile_mese: number;
  imponibile_ytd: number;
  tasse_mese: number;
  inps_fisso_mese: number;
  inps_eccedenza_mese: number;
  zavorra_fiscale_mese: number;
  quota_socio_mese: number;
  spese_effettive_mese: number;
  allocazioni_secchielli_mese: number;
  tax_safe_mese: number;
  saving_rate: number;
}

function inMese(d: string | null | undefined, anno: number, mese: number): boolean {
  if (!d) return false;
  const [y, m] = d.split("-").map(Number);
  return y === anno && m === mese;
}

export function calcolaRiepilogoAnno(
  fatture: Fattura[],
  spese: Spesa[],
  allocazioni: Allocazione[],
  profile: Profile,
): RiepilogoMese[] {
  const out: RiepilogoMese[] = [];
  let imp_ytd_prev = 0;
  for (let m = 1; m <= 12; m++) {
    const incassi = fatture.filter(
      (f) => f.stato === "INCASSATO" && inMese(f.data_incasso, profile.anno_fiscale, m),
    );
    const piva = incassi.filter((f) => f.tipo === "FATTURA_PIVA");
    const priv = incassi.filter((f) => f.tipo === "ENTRATA_PRIVATA");

    const incassato_piva = piva.reduce((s, f) => s + Number(f.lordo), 0);
    const incassato_privato = priv.reduce((s, f) => s + Number(f.lordo), 0);

    const imponibile_mese = incassato_piva * profile.coefficiente_redditivita;
    const imponibile_ytd = imp_ytd_prev + imponibile_mese;
    const tasse_mese = imponibile_mese * profile.aliquota_imposta;

    let inps_fisso_mese = 0;
    let inps_eccedenza_mese = 0;
    if (profile.tipo_inps === "ARTIGIANI" || profile.tipo_inps === "COMMERCIANTI") {
      inps_fisso_mese = profile.inps_fisso_mensile;
      const ec_curr = Math.max(0, imponibile_ytd - profile.inps_minimale_annuo);
      const ec_prev = Math.max(0, imp_ytd_prev - profile.inps_minimale_annuo);
      inps_eccedenza_mese = (ec_curr - ec_prev) * profile.inps_aliquota_eccedenza;
    } else {
      inps_eccedenza_mese = imponibile_mese * profile.inps_aliquota_gs;
    }

    const zavorra_fiscale_mese = tasse_mese + inps_fisso_mese + inps_eccedenza_mese;

    const quota_socio_mese = piva
      .filter((f) => f.con_socio)
      .reduce(
        (s, f) =>
          s + Number(f.lordo) * profile.coefficiente_redditivita * profile.inps_aliquota_socio_simulata,
        0,
      );

    const spese_effettive_mese = spese
      .filter((s) => s.tipo === "EFFETTIVA" && inMese(s.data, profile.anno_fiscale, m))
      .reduce((s, x) => s + Number(x.importo), 0);

    const allocazioni_secchielli_mese = allocazioni
      .filter((a) => inMese(a.mese, profile.anno_fiscale, m))
      .reduce((s, a) => s + Number(a.importo), 0);

    const tax_safe_mese =
      incassato_piva +
      incassato_privato -
      zavorra_fiscale_mese -
      spese_effettive_mese -
      allocazioni_secchielli_mese;

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
      tax_safe_mese,
      saving_rate,
    });
    imp_ytd_prev = imponibile_ytd;
  }
  return out;
}
