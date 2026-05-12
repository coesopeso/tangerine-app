# 🧮 FISCAL_ENGINE — Tangerine PWA v5.2

> **Sezione critica.** Mai modificare senza far passare TUTTI gli scenari A-J. Bug del v4 e v5 documentati e corretti.

---

## 📖 GLOSSARIO

| Termine | Definizione |
|---|---|
| **Lordo** | Importo della fattura, nessuna deduzione |
| **Imponibile (singola fattura)** | `Lordo × Coefficiente_Redditività` |
| **Imponibile YTD** | Somma imponibili fatture INCASSATE da Gennaio al mese N incluso |
| **Tasse mese** | `Lordo × coefficiente × aliquota` — solo INCASSATO, solo `FATTURA P.IVA` |
| **INPS Fisso Mensile (Artigiani / Commercianti)** | Quota fissa, **una sola volta al mese, sempre**, anche a zero incassi. Artigiani 2026 = €384,31. Commercianti 2026 = €376,78. |
| **INPS Eccedenza (Artig./Comm.)** | Differenziale: `(MAX(0; YTD_n − soglia) − MAX(0; YTD_(n-1) − soglia)) × 0.24`. Soglia imponibile Artigiani 2026 = €18.415 (≈ €23.608 lordo a coeff 0.78). |
| **INPS Gestione Separata** | `Imponibile_mese × inps_aliquota_gs` (no fisso, no soglia) |
| **Zavorra Fiscale Mese (DA ACCANTONARE)** | `Tasse_mese + INPS_Fisso_mese + INPS_Eccedenza_mese`. **NON include la quota socio** (vedi sotto). |
| **Quota Socio Simulata** | `Lordo × coefficiente × inps_aliquota_socio_simulata` (default 0.2607 GS). Solo su fatture `con_socio=true` E `tipo=FATTURA P.IVA`. **Va in un secchiello dedicato "QUOTA SOCIO conguaglio", non nella zavorra.** |
| **Da Accantonare (per fattura)** | `Lordo × coefficiente × aliquota` — solo tasse fattura. INPS fisso resta indipendente. |
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
| Solo regime Commerciante | v4-v5 | **Triforcazione ARTIGIANI / COMMERCIANTI / GESTIONE_SEPARATA** (Artigiani e Commercianti condividono la formula, cambiano i default) |
| Quota socio sommata alla zavorra "Da Accantonare" | v4-v5 | **Quota socio in secchiello dedicato**, conguaglio annuale. Mai nella zavorra. |
| Socio applicato anche su entrate private | v4-v5 | Socio solo su `tipo=FATTURA P.IVA`, mai su `entrata_netta` |
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
  coefficiente_redditivita: number;       // es. 0.78 Artigiani
  aliquota_imposta: number;               // 0.05 startup / 0.15 standard
  tipo_inps: 'ARTIGIANI' | 'COMMERCIANTI' | 'GESTIONE_SEPARATA';
  inps_minimale_annuo: number;            // Artigiani 2026: 18415
  inps_fisso_mensile: number;             // Artigiani 2026: 384.31
  inps_aliquota_eccedenza: number;        // 0.24
  inps_aliquota_gs: number;               // 0.2607 GS con altra copertura
  inps_aliquota_socio_simulata: number;   // default 0.2607 (= GS)
};

type Fattura = {
  data_incasso: Date | null;
  lordo: number;
  stato: 'PROGRAMMATO' | 'FATTURATO' | 'INCASSATO';  // FATTURATO = emessa, non ancora incassata
  tipo: 'FATTURA_PIVA' | 'ENTRATA_PRIVATA';  // ENTRATA_PRIVATA → mai tasse, mai socio
  con_socio: boolean;                          // ignorato se tipo=ENTRATA_PRIVATA
};

type RiepilogoMese = {
  mese: number;
  incassato_piva: number;          // solo FATTURA_PIVA INCASSATO
  incassato_privato: number;       // ENTRATA_PRIVATA INCASSATO (no fiscale)
  imponibile_mese: number;
  imponibile_ytd: number;
  tasse_mese: number;
  inps_fisso_mese: number;
  inps_eccedenza_mese: number;
  zavorra_fiscale_mese: number;    // = tasse + inps_fisso + inps_eccedenza
  quota_socio_mese: number;        // simulata, va in secchiello "QUOTA SOCIO"
};

export function calcolaRiepilogoAnno(
  fatture: Fattura[],
  profile: Profile
): RiepilogoMese[] {
  const riepiloghi: RiepilogoMese[] = [];
  let imponibile_ytd_precedente = 0;

  for (let m = 1; m <= 12; m++) {
    const incassoMese = fatture.filter(f =>
      f.stato === 'INCASSATO' &&
      f.data_incasso &&
      f.data_incasso.getMonth() + 1 === m &&
      f.data_incasso.getFullYear() === profile.anno_fiscale
    );

    const fatturePiva   = incassoMese.filter(f => f.tipo === 'FATTURA_PIVA');
    const entratePrivate = incassoMese.filter(f => f.tipo === 'ENTRATA_PRIVATA');

    const incassato_piva     = fatturePiva.reduce((s, f) => s + f.lordo, 0);
    const incassato_privato  = entratePrivate.reduce((s, f) => s + f.lordo, 0);

    // Solo FATTURA_PIVA produce imponibile fiscale
    const imponibile_mese = incassato_piva * profile.coefficiente_redditivita;
    const imponibile_ytd  = imponibile_ytd_precedente + imponibile_mese;

    // Tasse: lordo × coeff × aliquota (solo FATTURA_PIVA)
    const tasse_mese = incassato_piva * profile.coefficiente_redditivita * profile.aliquota_imposta;

    let inps_fisso_mese = 0;
    let inps_eccedenza_mese = 0;

    if (profile.tipo_inps === 'ARTIGIANI' || profile.tipo_inps === 'COMMERCIANTI') {
      // INPS fisso: SEMPRE, anche zero incassi
      inps_fisso_mese = profile.inps_fisso_mensile;

      // Eccedenza: differenziale su YTD
      const eccedenza_corrente = Math.max(0, imponibile_ytd - profile.inps_minimale_annuo);
      const eccedenza_precedente = Math.max(0, imponibile_ytd_precedente - profile.inps_minimale_annuo);
      inps_eccedenza_mese = (eccedenza_corrente - eccedenza_precedente) * profile.inps_aliquota_eccedenza;
    } else {
      // GESTIONE_SEPARATA: niente fisso, percentuale secca su imponibile
      inps_eccedenza_mese = imponibile_mese * profile.inps_aliquota_gs;
    }

    const zavorra_fiscale_mese = tasse_mese + inps_fisso_mese + inps_eccedenza_mese;

    // QUOTA SOCIO simulata: solo FATTURA_PIVA con con_socio=true.
    // NON entra nella zavorra. Va nel secchiello "QUOTA SOCIO conguaglio".
    const quota_socio_mese = fatturePiva
      .filter(f => f.con_socio)
      .reduce((s, f) =>
        s + f.lordo * profile.coefficiente_redditivita * profile.inps_aliquota_socio_simulata,
      0);

    riepiloghi.push({
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
    });

    imponibile_ytd_precedente = imponibile_ytd;
  }

  return riepiloghi;
}
```

---

## 🤝 LOGICA SOCIO — Conguaglio annuale

> Il socio **non è un account**. È una quota di alcune fatture P.IVA che intestiamo al socio "di fatto". Augusto emette fattura intera, incassa intero, ma il 50% è dovuto al socio. Su quel 50% l'app simula la fiscalità che il socio dovrebbe pagare in proprio (Gestione Separata) e la **trattiene in un secchiello dedicato** per restituirla al socio a fine anno con conguaglio.

### Regole

1. **Flag per fattura**: `con_socio: boolean` su `fattura`. Settabile su qualsiasi `tipo` (UI non blocca), ma rilevante fiscalmente solo se `tipo=FATTURA_PIVA`.
2. **Mai su entrate private**: anche se l'utente flagga `con_socio=SI` su un `ENTRATA_PRIVATA`, la simulazione resta 0 (non è reddito fiscalmente rilevante per Augusto, quindi non lo è nemmeno per il socio). Il flag su entrata privata serve solo a marcare visivamente "questa entrata l'ho divisa col socio".
3. **Quota Socio Simulata** (per fattura):
   ```
   quota_socio = lordo × coefficiente × inps_aliquota_socio_simulata
              = lordo × 0.78 × 0.2607        (default Artigiani 2026)
   ```
   Esempio: fattura 250 € con socio → 250 × 0.78 × 0.2607 = **50,84 €** trattenuti.
4. **Destinazione**: alla creazione/aggiornamento di una fattura `INCASSATO` con `con_socio=true`, l'app crea automaticamente un'`allocazione_secchiello` sul secchiello `QUOTA_SOCIO` di importo `quota_socio_mese`.
5. **Esclusa dalla zavorra**: la quota socio **non** entra in `Da Accantonare` (che resta solo Tasse + INPS Augusto). È un debito separato verso il socio.
6. **Conguaglio fine anno**:
   - L'utente registra in app il totale tasse reali pagate dal socio sulla sua quota
   - Δ = totale_trattenuto − tasse_reali_socio
     - Δ > 0 → bonifico al socio con causale `"Conguaglio spese fiscali <ANNO>"`
     - Δ < 0 → richiesta integrazione al socio
   - Il secchiello viene azzerato e si riparte
7. **Smezzamento del netto** (info al socio): per trasparenza, mostrare anche
   ```
   netto_socio_stimato = (lordo / 2) − (lordo × coeff × (aliquota + aliquota_socio_simulata)) / 2
   ```
   Questo è il netto che il socio "porta a casa" dopo la sua fiscalità simulata.

---

## ✅ SCENARI DI TEST OBBLIGATORI

Ogni implementazione deve passare TUTTI questi scenari. Vedi `TESTING.md` per protocollo esecuzione.

> **Profile di riferimento "Augusto"** usato negli scenari: ARTIGIANI, coeff=0.78, aliquota=0.05, inps_minimale_annuo=18415, inps_fisso_mensile=384.31, inps_aliquota_eccedenza=0.24, inps_aliquota_socio_simulata=0.2607.

### Scenario A — Artigiani, fattura P.IVA singola, no socio
- 1 fattura `FATTURA_PIVA` INCASSATO 5000 € a Gennaio, `con_socio=false`
- **Atteso**: incassato_piva=5000, imponibile=3900, tasse=`5000×0.78×0.05=195`, inps_fisso=384.31, inps_eccedenza=0, **zavorra=579.31**, quota_socio=0

### Scenario B — Artigiani, due fatture stesso mese
- 2 fatture `FATTURA_PIVA` INCASSATE 3000 € a Gennaio, no socio
- **Atteso**: incassato_piva=6000, imponibile=4680, tasse=234, **inps_fisso=384.31** (NON ×2!), inps_eccedenza=0, zavorra=618.31

### Scenario C — Artigiani, superamento soglia a metà anno
- Fatture P.IVA 3000 €/mese INCASSATE Gen-Ago (coeff 0.78)
- Mese 8: imponibile_YTD=18720 → eccedenza=18720−18415=**305 €** già a Agosto
- INPS eccedenza Agosto: `305 × 0.24 = 73.20` (prima volta che si supera)
- 9° fattura 3000 € a Settembre: imponibile_YTD=21060
- Eccedenza Settembre (differenziale): `(21060−18415) − (18720−18415) = 2340` → INPS var = `2340 × 0.24 = 561.60`
- **Atteso a Settembre**: zavorra = 117 + 384.31 + 561.60 = **1062.91**

### Scenario D — Fattura non incassata = zero accrual
- 1 fattura `FATTURATO` 10000 €
- **Atteso**: incassato=0, tasse=0, inps_eccedenza=0
- `inps_fisso=384.31` (Artigiani). Tax Safe negativo se nessuna spesa compensata. Quota socio=0 (non incassato).

### Scenario E — Inserimento retroattivo
- Stato: 8 fatture INCASSATE Gen-Ago, riepilogo Settembre già visualizzato
- Aggiungo retroattivamente 1 fattura INCASSATA 5000 € a Marzo
- **Atteso**: tutto il riepilogo da Marzo in poi ricalcolato da zero. Nessuno stato YTD persistito.

### Scenario F — Artigiani, zero incassi a Gennaio (caso reale Augusto 2026)
- 0 fatture P.IVA INCASSATE a Gennaio
- **Atteso**: incassato_piva=0, imponibile=0, tasse=0, **inps_fisso=384.31**, inps_eccedenza=0, **zavorra=384.31**
- Tax Safe Gennaio = `0 − 384.31 − spese − allocazioni` → **NEGATIVO**. È realtà fiscale.

### Scenario G — Gestione Separata, fattura singola
- Profile: GESTIONE_SEPARATA, coeff=0.78, aliquota=0.05, aliquota_gs=0.2607
- 1 fattura `FATTURA_PIVA` INCASSATO 5000 € a Gennaio
- **Atteso**: imponibile=3900, tasse=195, inps_fisso=0, **inps_eccedenza=3900×0.2607=1016.73**, zavorra=1211.73

### Scenario H — Gestione Separata, zero incassi
- 0 fatture INCASSATE
- **Atteso**: incassato=0, tasse=0, **inps_fisso=0, inps_eccedenza=0, zavorra=0**
- Tax Safe = solo spese sottratte. Nessun debito previdenziale (a differenza Artig./Comm.).

### Scenario I — Quota socio simulata (caso reale Augusto Marzo 2026)
- ARTIGIANI, profile sopra
- Fatture INCASSATE Marzo:
  - PIADINA 250 € `FATTURA_PIVA` `con_socio=true`
  - DNG 550 € `FATTURA_PIVA` `con_socio=true`
  - ROBE 500 € `FATTURA_PIVA` `con_socio=true`
  - FRUTTETO 900 € `ENTRATA_PRIVATA` `con_socio=false`
  - PIADINA 200 € `ENTRATA_PRIVATA`, GOBBO 150 € `ENTRATA_PRIVATA`, DONG 200 € `ENTRATA_PRIVATA`
- Calcoli:
  - incassato_piva = 250+550+500 = **1300**
  - incassato_privato = 900+200+150+200 = 1450
  - imponibile = 1300 × 0.78 = 1014
  - tasse = 1300 × 0.78 × 0.05 = **50,70**
  - inps_fisso = **384,31** (Artigiani)
  - inps_eccedenza = 0 (sotto soglia)
  - zavorra = 50,70 + 384,31 = **435,01**  ← match esatto cella DA ACCANTONARE Excel
  - quota_socio_mese = (250+550+500) × 0.78 × 0.2607 = **264,3498**  ← match esatto Excel
- **Verifica**: la quota socio NON è dentro la zavorra. Va nel secchiello QUOTA_SOCIO.

### Scenario J — Entrata privata flaggata `con_socio=true` (verifica esclusione)
- ARTIGIANI, 1 entrata `ENTRATA_PRIVATA` 400 € con `con_socio=true` (caso Aprile FRUTTETO)
- **Atteso**: incassato_privato=400, tasse=0, inps_eccedenza_var=0, **quota_socio=0** (il flag è solo etichetta visiva, non genera simulazione)

---

## 🚨 REGOLE INVIOLABILI

1. **Mai persistere** `tasse_mese`, `inps_eccedenza_mese`, `imponibile_ytd`, `quota_socio_mese`. Calcolare al volo.
2. **Mai filtrare per stato diverso da `INCASSATO`** quando si calcolano accrual.
3. **INPS fisso Artigiani/Commercianti**: indipendente dagli incassi.
4. **INPS GS**: dipendente dagli incassi (zero incassi → zero INPS GS).
5. **Tasse e quota socio**: solo su `tipo=FATTURA_PIVA`. Mai su `ENTRATA_PRIVATA`, indipendentemente dal flag `con_socio`.
6. **Quota socio mai nella zavorra "Da Accantonare"**. Va sempre nel secchiello dedicato.
7. **Cambio anno fiscale**: tutto il sistema riparte. YTD si azzera. Secchiello QUOTA_SOCIO va in conguaglio.
8. **Cambio coefficiente/aliquota a metà anno**: bloccare con conferma esplicita. Idealmente versionare profile.

---

## 🔗 DOCUMENTI CORRELATI

- Modello dati: `DATA_MODEL.md`
- Test esecuzione: `TESTING.md`
- Bug noti correlati: `ERROR_HANDBOOK.md`

---

## VERSION

```
v5.2 — Augusto Artigiani 2026, stato FATTURATO, scenari A-J inclusi Marzo Augusto + entrata privata flaggata
```
