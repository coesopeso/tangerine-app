/**
 * Test scenari A-J di FISCAL_ENGINE.md.
 * Eseguire con: tsx src/lib/fiscal.test.ts (oppure il runner Vitest se aggiunto).
 *
 * Qui usiamo un mini-runner senza dipendenze: stampa OK/KO e sets exit code.
 */
import { calcolaMese, calcolaRiepilogoAnno } from "./fiscal";
import { PROFILE_AUGUSTO_DEFAULT } from "./seed";
import type { Fattura, Profile } from "./types";

const profile: Profile = { ...PROFILE_AUGUSTO_DEFAULT };
const profileGS: Profile = { ...profile, tipo_inps: "GESTIONE_SEPARATA" };

let failed = 0;
const tol = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;
function check(label: string, cond: boolean, detail = "") {
  // eslint-disable-next-line no-console
  console.log(`${cond ? "✅" : "❌"} ${label}${detail ? "  " + detail : ""}`);
  if (!cond) failed++;
}

const f = (over: Partial<Fattura>): Fattura => ({
  id: Math.random().toString(),
  descrizione: "x",
  data_incasso: null,
  lordo: 0,
  tipo: "FATTURA_PIVA",
  stato: "INCASSATO",
  con_socio: false,
  created_at: "",
  ...over,
});

// A — Artigiani, fattura singola, no socio
{
  const r = calcolaMese([f({ data_incasso: "2026-01-15", lordo: 5000 })], [], [], profile, 1);
  check("A: incassato_piva=5000", tol(r.incassato_piva, 5000));
  check("A: tasse=195", tol(r.tasse_mese, 195));
  check("A: inps_fisso=384.31", tol(r.inps_fisso_mese, 384.31));
  check("A: zavorra=579.31", tol(r.zavorra_fiscale_mese, 579.31));
  check("A: quota_socio=0", tol(r.quota_socio_mese, 0));
}

// B — due fatture stesso mese
{
  const r = calcolaMese(
    [f({ data_incasso: "2026-01-10", lordo: 3000 }), f({ data_incasso: "2026-01-20", lordo: 3000 })],
    [], [], profile, 1,
  );
  check("B: inps_fisso=384.31 (NON ×2)", tol(r.inps_fisso_mese, 384.31));
  check("B: zavorra=618.31", tol(r.zavorra_fiscale_mese, 618.31));
}

// C — superamento soglia (Settembre dopo Gen-Ago + extra)
{
  const fatture: Fattura[] = [];
  for (let m = 1; m <= 8; m++) fatture.push(f({ data_incasso: `2026-${String(m).padStart(2, "0")}-15`, lordo: 3000 }));
  fatture.push(f({ data_incasso: "2026-09-15", lordo: 3000 }));
  const anno = calcolaRiepilogoAnno(fatture, [], [], profile);
  // Agosto: ytd=18720 → ecc=305 → inps_var = 305*0.24 = 73.20
  check("C ago: inps_eccedenza=73.20", tol(anno[7].inps_eccedenza_mese, 73.20));
  // Settembre: differenziale (21060-18415) - (18720-18415) = 2340 → 561.60
  check("C set: inps_eccedenza=561.60", tol(anno[8].inps_eccedenza_mese, 561.60));
  check("C set: zavorra=1062.91", tol(anno[8].zavorra_fiscale_mese, 1062.91));
}

// D — fattura non incassata = zero accrual
{
  const r = calcolaMese([f({ stato: "FATTURATO", lordo: 10000, data_incasso: null })], [], [], profile, 1);
  check("D: incassato=0", tol(r.incassato_piva, 0));
  check("D: tasse=0", tol(r.tasse_mese, 0));
  check("D: inps_fisso=384.31", tol(r.inps_fisso_mese, 384.31));
}

// F — zero incassi Gennaio
{
  const r = calcolaMese([], [], [], profile, 1);
  check("F: zavorra=384.31 anche a zero incassi", tol(r.zavorra_fiscale_mese, 384.31));
}

// G — Gestione Separata, fattura singola
{
  const r = calcolaMese([f({ data_incasso: "2026-01-15", lordo: 5000 })], [], [], profileGS, 1);
  check("G: inps_fisso=0", tol(r.inps_fisso_mese, 0));
  check("G: inps_eccedenza=1016.73", tol(r.inps_eccedenza_mese, 1016.73));
  check("G: zavorra=1211.73", tol(r.zavorra_fiscale_mese, 1211.73));
}

// H — GS, zero incassi → zero zavorra
{
  const r = calcolaMese([], [], [], profileGS, 1);
  check("H: zavorra=0 con GS a zero incassi", tol(r.zavorra_fiscale_mese, 0));
}

// I — caso reale Augusto Marzo 2026
{
  const fs: Fattura[] = [
    f({ data_incasso: "2026-03-05", lordo: 250, tipo: "FATTURA_PIVA", con_socio: true, descrizione: "PIADINA" }),
    f({ data_incasso: "2026-03-12", lordo: 550, tipo: "FATTURA_PIVA", con_socio: true, descrizione: "DNG" }),
    f({ data_incasso: "2026-03-20", lordo: 500, tipo: "FATTURA_PIVA", con_socio: true, descrizione: "ROBE" }),
    f({ data_incasso: "2026-03-08", lordo: 900, tipo: "ENTRATA_PRIVATA", descrizione: "FRUTTETO" }),
    f({ data_incasso: "2026-03-14", lordo: 200, tipo: "ENTRATA_PRIVATA", descrizione: "PIADINA priv" }),
    f({ data_incasso: "2026-03-22", lordo: 150, tipo: "ENTRATA_PRIVATA", descrizione: "GOBBO" }),
    f({ data_incasso: "2026-03-28", lordo: 200, tipo: "ENTRATA_PRIVATA", descrizione: "DONG" }),
  ];
  const r = calcolaMese(fs, [], [], profile, 3);
  check("I: incassato_piva=1300", tol(r.incassato_piva, 1300));
  check("I: incassato_privato=1450", tol(r.incassato_privato, 1450));
  check("I: tasse=50.70", tol(r.tasse_mese, 50.70));
  check("I: inps_fisso=384.31", tol(r.inps_fisso_mese, 384.31));
  check("I: inps_eccedenza=0", tol(r.inps_eccedenza_mese, 0));
  check("I: zavorra=435.01 (match Excel)", tol(r.zavorra_fiscale_mese, 435.01));
  check("I: quota_socio=264.3498 (match Excel)", tol(r.quota_socio_mese, 264.3498, 0.001));
}

// J — entrata privata flaggata con_socio → zero
{
  const r = calcolaMese(
    [f({ data_incasso: "2026-04-10", lordo: 400, tipo: "ENTRATA_PRIVATA", con_socio: true })],
    [], [], profile, 4,
  );
  check("J: incassato_privato=400", tol(r.incassato_privato, 400));
  check("J: tasse=0", tol(r.tasse_mese, 0));
  check("J: quota_socio=0 (flag su entrata privata = solo etichetta)", tol(r.quota_socio_mese, 0));
}

if (failed > 0) {
  // eslint-disable-next-line no-console
  console.error(`\n${failed} test FALLITI`);
  process.exit(1);
} else {
  // eslint-disable-next-line no-console
  console.log("\nTutti i test OK");
}
