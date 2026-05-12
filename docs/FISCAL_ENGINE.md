# 🧮 FISCAL_ENGINE — Tangerine PWA v5.1

> **Sezione critica.** Mai modificare senza far passare TUTTI gli scenari A-I. Bug del v4 e v5 documentati e corretti.

---

## 📖 GLOSSARIO

| Termine | Definizione |
|---|---|
| **Lordo** | Importo della fattura, nessuna deduzione |
| **Imponibile (singola fattura)** | `Lordo × Coefficiente_Redditività` |
| **Imponibile YTD** | Somma imponibili fatture INCASSATE da Gennaio al mese N incluso |
| **Tasse mese** | `Imponibile_mese × Aliquota` — solo INCASSATO |
| **INPS Fisso Mensile (Commerciante)** | Quota fissa, **una sola volta al mese, sempre**, anche a zero incassi |
| **INPS Eccedenza Commerciante** | Differenziale: `(MAX(0; YTD_n − soglia) − MAX(0; YTD_(n-1) − soglia)) × 0.24` |
| **INPS Gestione Separata** | `Imponibile_mese × inps_aliquota_gs` (no fisso, no soglia) |
| **Zavorra Fiscale Mese** | `Tasse_mese + INPS_Fisso_mese + INPS_Eccedenza_mese` |
| **Da Accantonare (per fattura)** | `Lordo × (1 − coefficiente×aliquota)` — quota teorica. **NON è il netto reale.** |
| **Tax Safe Mese** | `Incassato_mese − Zavorra_mese + Entrate_Nette_pure_mese − Spese_EFFETTIVE_mese − Allocazioni_secchielli_mese` |
| **Saving Rate** | `Allocazioni_secchielli_mese / Incassato_mese` (IFERROR per zero incassi) |
| **Punto Zero** | Snapshot liquidità + investimenti al 1° Gennaio |

---

## 🐛 BUG STORICI CORRETTI

| Bug | Versione | Fix v5.1 |
|---|---|---|
| INPS fisso × N° fatture nel mese | v4 | INPS fisso 1 volta al mese |
| INPS fisso solo se ≥1 fattura PAGATA nel mese | v5 | **INPS fisso sempre**, anche zero incassi. Conseguenza voluta: Gennaio zero incassi → Tax Safe negativo, è realtà fiscale. |
| INPS eccedenza assente nella zavorra | v4 | Inclusa, formula differenziale |
| Solo regime Commerciante | v4-v5 | **Biforcazione COMMERCIANTE / GESTIONE_SEPARATA** |
| Accrual fiscali persistiti per riga | v4 | Mai persistiti. Ricalcolati on-the-fly. |
| Coefficiente limitato a 0.78/0.40 | v4 | Tutti i 7 coefficienti ATECO |
| INPS fisso 376.78 hardcoded | v4 | Parametrizzato in `profile.inps_fisso_mensile` |
| Crypto in dashboard fiscale | v4 | Spostato in INVESTIMENTI |
| Inserimento retroattivo non aggiorna mesi successivi | v4 | Ricalcolo on-the-fly da zero |

---

## 🧩 ALGORITMO DI RIFERIMENTO

```typescript
type Profile = {
  anno_fiscale: number;
  coefficiente_redditivita: number;
  aliquota_imposta: number;
  tipo_inps: 'COMMERCIANTE' | 'GESTIONE_SEPARATA';
  inps_minimale_annuo: number;
  inps_fisso_mensile: number;
  inps_aliquota_eccedenza: number;
  inps_aliquota_gs: number;
};

type Fattura = {
  data_incasso: Date | null;
  lordo: number;
  stato: 'PROGRAMMATO' | 'EMESSO_DA_INCASSARE' | 'INCASSATO';
};

type RiepilogoMese = {
  mese: number;
  incassato: number;
  imponibile_mese: number;
  imponibile_ytd: number;
  tasse_mese: number;
  inps_fisso_mese: number;
  inps_eccedenza_mese: number;
  zavorra_fiscale_mese: number;
};

export function calcolaRiepilogoAnno(
  fatture: Fattura[],
  profile: Profile
): RiepilogoMese[] {
  const riepiloghi: RiepilogoMese[] = [];
  let imponibile_ytd_precedente = 0;

  for (let m = 1; m <= 12; m++) {
    const fattureMese = fatture.filter(f =>
      f.stato === 'INCASSATO' &&
      f.data_incasso &&
      f.data_incasso.getMonth() + 1 === m &&
      f.data_incasso.getFullYear() === profile.anno_fiscale
    );

    const incassato = fattureMese.reduce((s, f) => s + f.lordo, 0);
    const imponibile_mese = incassato * profile.coefficiente_redditivita;
    const imponibile_ytd = imponibile_ytd_precedente + imponibile_mese;

    const tasse_mese = imponibile_mese * profile.aliquota_imposta;

    let inps_fisso_mese = 0;
    let inps_eccedenza_mese = 0;

    if (profile.tipo_inps === 'COMMERCIANTE') {
      // INPS fisso: SEMPRE, anche zero incassi
      inps_fisso_mese = profile.inps_fisso_mensile;

      // Eccedenza: differenziale su YTD
      const eccedenza_corrente = Math.max(
        0,
        imponibile_ytd - profile.inps_minimale_annuo
      );
      const eccedenza_precedente = Math.max(
        0,
        imponibile_ytd_precedente - profile.inps_minimale_annuo
      );
      inps_eccedenza_mese =
        (eccedenza_corrente - eccedenza_precedente) *
        profile.inps_aliquota_eccedenza;
    } else if (profile.tipo_inps === 'GESTIONE_SEPARATA') {
      // GS: niente fisso, percentuale secca su imponibile
      inps_fisso_mese = 0;
      inps_eccedenza_mese = imponibile_mese * profile.inps_aliquota_gs;
    }

    const zavorra_fiscale_mese =
      tasse_mese + inps_fisso_mese + inps_eccedenza_mese;

    riepiloghi.push({
      mese: m,
      incassato,
      imponibile_mese,
      imponibile_ytd,
      tasse_mese,
      inps_fisso_mese,
      inps_eccedenza_mese,
      zavorra_fiscale_mese,
    });

    imponibile_ytd_precedente = imponibile_ytd;
  }

  return riepiloghi;
}
```

---

## ✅ SCENARI DI TEST OBBLIGATORI

Ogni implementazione deve passare TUTTI questi scenari. Vedi `TESTING.md` per protocollo esecuzione.

### Scenario A — Commerciante, sotto soglia, fattura singola
- Profile: COMMERCIANTE, coeff=0.78, aliquota=0.05, soglia=18808, fisso=376.78
- 1 fattura INCASSATO 5000 € a Gennaio
- **Atteso**: imponibile=3900, tasse=195, inps_fisso=376.78, inps_var=0, zavorra=571.78

### Scenario B — Commerciante, due fatture stesso mese
- 2 fatture INCASSATE 3000 € a Gennaio
- **Atteso**: incassato=6000, imponibile=4680, tasse=234, **inps_fisso=376.78** (NON 753.56!), inps_var=0, zavorra=610.78

### Scenario C — Commerciante, superamento soglia a metà anno
- Fatture 3000 €/mese INCASSATE Gen-Ago, coeff 0.78
- Mese 8: imponibile_YTD=18720 (sotto soglia), inps_var=0
- 9° fattura 3000 € a Settembre: imponibile_YTD=21060
- Eccedenza Settembre: `(21060−18808) − max(0; 18720−18808) = 2252`
- INPS var Settembre: `2252 × 0.24 = 540.48`
- **Atteso a Settembre**: zavorra = 117 + 376.78 + 540.48 = **1034.26**

### Scenario D — Fattura non incassata = zero accrual
- 1 fattura `EMESSO_DA_INCASSARE` 10000 €
- **Atteso**: incassato=0, tasse=0, inps_var=0
- Ma `inps_fisso=376.78` (Commerciante). Tax Safe negativo se nessuna spesa compensata.

### Scenario E — Inserimento retroattivo
- Stato: 8 fatture INCASSATE Gen-Ago, riepilogo Settembre già visualizzato
- Aggiungo retroattivamente 1 fattura INCASSATA 5000 € a Marzo
- **Atteso**: tutto il riepilogo da Marzo in poi ricalcolato da zero. Nessuno stato YTD persistito.

### Scenario F — Commerciante, zero incassi a Gennaio
- 0 fatture INCASSATE a Gennaio
- **Atteso**: incassato=0, imponibile=0, tasse=0, **inps_fisso=376.78**, inps_var=0, **zavorra=376.78**
- Tax Safe Gennaio = `0 − 376.78 − spese − allocazioni` → **NEGATIVO**. È realtà fiscale, è giusto.

### Scenario G — Gestione Separata, sotto qualsiasi soglia (GS non ha soglia)
- Profile: GESTIONE_SEPARATA, coeff=0.78, aliquota=0.05, aliquota_gs=0.2607
- 1 fattura INCASSATO 5000 € a Gennaio
- **Atteso**: imponibile=3900, tasse=195, inps_fisso=0, **inps_var=3900×0.2607=1016.73**, zavorra=1211.73

### Scenario H — Gestione Separata, zero incassi
- 0 fatture INCASSATE
- **Atteso**: incassato=0, tasse=0, **inps_fisso=0, inps_var=0, zavorra=0**
- Tax Safe = solo spese sottratte. Nessun debito previdenziale (a differenza Commerciante).

### Scenario I — Smezzamento socio
- COMMERCIANTE, fattura INCASSATA 2000 € con `has_partner=true`, `partner_aliquota=0.26`
- **Atteso lato fiscale principale**: imponibile=1560, tasse=78, inps_fisso=376.78
- `partner_share` (info al socio): `1000 − (1000 × 0.78 × (0.05 + 0.26)) = 1000 − 241.80 = 758.20 €`

---

## 🚨 REGOLE INVIOLABILI

1. **Mai persistere** `tasse_mese`, `inps_var_mese`, `imponibile_ytd`. Calcolare al volo.
2. **Mai filtrare per stato diverso da `INCASSATO`** quando si calcolano accrual.
3. **INPS fisso Commerciante**: indipendente dagli incassi.
4. **INPS GS**: dipendente dagli incassi (zero incassi → zero INPS GS).
5. **Cambio anno fiscale**: tutto il sistema riparte. YTD si azzera.
6. **Cambio coefficiente/aliquota a metà anno**: bloccare con conferma esplicita. Idealmente versionare profile.

---

## 🔗 DOCUMENTI CORRELATI

- Modello dati: `DATA_MODEL.md`
- Test esecuzione: `TESTING.md`
- Bug noti correlati: `ERROR_HANDBOOK.md`

---

## VERSION

```
v5.1 — Biforcazione Commerciante/GS, INPS fisso sempre, scenari A-I
```
