# TANGERINE — Documento Unico di Progetto

**Versione:** 5.0
**Data:** Maggio 2026
**Tipologia:** Master document — visione + specs tecniche + motore fiscale + LLM masterguide
**Ambito:** Strumento di gestione finanziaria personale per Partita IVA forfettaria
**Lingua:** Italiano (UI, formule, documentazione). Inglese (codice, identificatori).

---

## INDICE

0. Note di lettura e regole globali
1. Visione e scopo
2. Architettura: Foglio + PWA insieme
3. Modello dati condiviso
4. Motore Fiscale 2026 (corretto)
5. Struttura del Foglio Tangerine v5
6. Specifiche PWA Tangerine
7. Stack tecnico semplificato
8. UX e schermate
9. Scadenze fiscali e calendario
10. Investimenti e PAC
11. LLM Masterguide
12. Error Handbook
13. Roadmap e priorità
14. Changelog

---

## 0 — NOTE DI LETTURA E REGOLE GLOBALI

- **Lingua formule foglio:** italiano, separatore `;`. Esempio corretto: `=SOMMA.SE(E4:E35;"PAGATO";C4:C35)`. Mai `,` come separatore.
- **Lingua codice PWA:** TypeScript, identificatori in inglese.
- **Tutti i parametri fiscali sono variabili.** Mai hardcoded nel codice o nelle formule. Sempre referenziati a `SETUP` (foglio) o alla tabella `profiles` (DB).
- **Regola globale di efficienza:** prima di ogni modifica, valuta se esiste un approccio più economico e meno invasivo. Patch chirurgica > riscrittura completa.
- **Principio di Cassa** governa tutto il modello fiscale: tasse e INPS si calcolano SOLO su entrate effettivamente incassate (Stato = PAGATO). Nessuna eccezione.
- **Single Source of Truth (SSOT):** questo documento. Se foglio o codice divergono dalle specs qui scritte, è il foglio/codice ad essere sbagliato — non il documento.

---

## 1 — VISIONE E SCOPO

### 1.1 Problema

Una Partita IVA forfettaria italiana deve gestire contemporaneamente:

1. **Contabilità fiscale corretta** — accantonamento tasse 5% (o 15%), INPS fisso mensile, INPS eccedenza 24% sopra la soglia.
2. **Pianificazione delle scadenze** — saldo IRPEF + 1° acconto a giugno, 2° acconto a novembre, scadenze INPS trimestrali.
3. **Gestione del netto effettivo** — sapere quanto puoi davvero spendere senza sforare gli accantonamenti.
4. **Tracking spese quotidiane** — categorie, budget, alert.
5. **Risparmio finalizzato** — secchielli (sinking funds) per obiettivi specifici.
6. **Investimenti** — PAC, ETF, crypto, con valore di carico e valore corrente.

I tool generalisti (Notion, Excel, app banca) non gestiscono il regime forfettario italiano. I commercialisti danno il numero finale ma non aiutano la pianificazione mensile.

### 1.2 Soluzione: due strumenti che condividono lo stesso modello

| Strumento | Ruolo | Quando lo uso |
|---|---|---|
| **Foglio Google Sheets** (Tangerine v5) | Verità storica annuale, archivio, dichiarazione | Una volta a settimana da Mac per riconciliare e leggere la dashboard |
| **PWA Tangerine** | Diario quotidiano, quick-add, dashboard mobile | Tutti i giorni dall'iPhone per inserire spese e fatture |

I due strumenti **condividono il modello fiscale e i nomi dei dati**. Possono lavorare anche solo uno dei due — sono compatibili ma indipendenti.

### 1.3 Principi di prodotto

- **Costo zero o quasi**: piani gratuiti, infrastruttura minima.
- **Privacy massima**: niente App Store, niente terzi non necessari, dati solo su servizi che già uso (Google + eventualmente Supabase).
- **Indipendenza dal vendor**: il codice e il foglio sono miei e portabili. Posso passare da Replit a un VPS, o tornare al solo foglio, in qualsiasi momento.
- **Onestà fiscale**: i numeri devono essere precisi al centesimo. Meglio mostrare "da verificare con commercialista" che dare un dato finto.
- **Mobile-first per il quotidiano**: 3 tap per registrare una spesa.

---

## 2 — ARCHITETTURA: FOGLIO + PWA INSIEME

### 2.1 Posizionamento dei due strumenti

```
                ┌──────────────────────────────────┐
                │      MODELLO FISCALE 2026         │
                │  (Sezione 4 di questo documento)  │
                └──────────────────────────────────┘
                         │              │
              ┌──────────┘              └──────────┐
              ▼                                    ▼
    ┌──────────────────────┐          ┌──────────────────────┐
    │  FOGLIO TANGERINE v5 │          │   PWA TANGERINE v5   │
    │   (Google Sheets)    │          │   (Web App mobile)   │
    │                      │          │                      │
    │ - Verità annuale     │          │ - Quick-add quotidiano│
    │ - Dashboard ricca    │          │ - Dashboard sintetica│
    │ - Storico anni       │          │ - Grafici interattivi│
    │ - Export per         │          │ - Notifiche scadenze │
    │   commercialista     │          │ - Calcolo on-the-fly │
    └──────────────────────┘          └──────────────────────┘
```

### 2.2 Tre scenari di adozione

L'utente può scegliere uno qualsiasi di questi tre, e migrare tra essi:

**Scenario A — Solo foglio**
Il foglio v5 patchato copre tutto. Si usa Google Sheets app su iPhone per inserimento occasionale. Costo: zero. Limite: data entry mobile lenta.

**Scenario B — Foglio + Apps Script Web App**
Web app HTML servita da Apps Script, dentro lo stesso ambiente Google. Legge e scrive sul foglio nativamente. Installabile come PWA su iPhone. Costo: zero. Limite: estetica meno raffinata, framework moderni difficili da usare.

**Scenario C — Foglio + PWA esterna (React + Supabase)**
PWA in React ospitata su Replit/Vercel, dati su Supabase. Sync periodico col foglio o foglio usato come export annuale. Costo: 1–3 €/mese. Vantaggio: estetica e UX ottimali. Svantaggio: più componenti da mantenere.

### 2.3 Decisione corrente

**Default raccomandato: Scenario A** (solo foglio) finché non emerge una vera esigenza per la PWA. Si aggiorna a B o C solo se l'inserimento mobile diventa un dolore quotidiano confermato dopo 3 mesi di uso reale.

Quando si passa a B o C, le specs della PWA in questo documento si applicano integralmente — sono identiche, cambia solo il vestito tecnico.

---

## 3 — MODELLO DATI CONDIVISO

Stesso vocabolario nel foglio e nella PWA. I nomi dei campi nel DB sono in `snake_case`, le etichette UI in italiano.

### 3.1 Entità

#### `profile` — Configurazione utente
| Campo | Tipo | Default | Descrizione |
|---|---|---|---|
| `anno_fiscale` | int | 2026 | Anno corrente. Cambia → tutto il sistema riparte. |
| `coefficiente_redditivita` | numeric | 0.78 | Coefficiente ATECO (0.40 / 0.54 / 0.62 / 0.67 / 0.73 / 0.78 / 0.86) |
| `aliquota_imposta` | numeric | 0.05 | 0.05 (5% startup) o 0.15 (15% standard) |
| `inps_minimale_annuo` | numeric | 18808.00 | Soglia INPS oltre cui scatta il 24%. Aggiornare ogni anno. |
| `inps_fisso_mensile` | numeric | 376.78 | Quota fissa mensile (= minimale annuo × 24% / 12 ca.) |
| `inps_aliquota_eccedenza` | numeric | 0.24 | Aliquota INPS sull'eccedenza |
| `liquidita_iniziale` | numeric | 0 | Punto Zero: liquidità all'inizio dell'anno |
| `investimenti_iniziali` | numeric | 0 | Punto Zero: valore investimenti all'inizio dell'anno |
| `pac_mensile_automatico` | numeric | 0 | Quota PAC accantonata in automatico ogni mese |
| `cuscinetto_mensile_automatico` | numeric | 0 | Quota fondo emergenza accantonata in automatico ogni mese |
| `partner_aliquota_default` | numeric | 0.26 | Forfait tasse socio per smezzamento |

#### `fattura` — Entrate da P.IVA
| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `data_emissione` | date | Data fattura |
| `data_incasso` | date | Data effettiva pagamento (NULL se non ancora pagato) |
| `cliente` | text | Nome cliente |
| `lordo` | numeric | Importo fatturato |
| `stato` | enum | `PAGATO` · `DA PAGARE` · `PROGRAMMATO` |
| `has_partner` | boolean | TRUE se ricavo da smezzare con socio |
| `partner_aliquota` | numeric | Override aliquota socio (default da profile) |
| `note` | text | Libero |

> **Importante:** gli accrual fiscali (`tasse`, `inps_fisso`, `inps_var`) non vanno salvati per riga: si **ricalcolano sempre on-the-fly** dal lordo + ytd. Salvarli causa bug di consistency quando inserisci fatture retroattive.

#### `entrata_netta` — Entrate esentasse (vendite usato, rimborsi, regali)
| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `data` | date | Data |
| `voce` | text | Descrizione |
| `importo_netto` | numeric | Importo già al netto |
| `note` | text | Libero |

#### `spesa` — Uscite
| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `data` | date | Data spesa |
| `categoria` | text | Da `lista_categorie` (BUSINESS, AUTO, VITA, SVAGO, INVESTIMENTO, FORMAZIONE, SALUTE) |
| `sottocategoria` | text | Opzionale |
| `importo` | numeric | Sempre positivo |
| `tipo` | enum | `EFFETTIVA` · `PROGRAMMATA` |
| `note` | text | Libero |

#### `secchiello` — Risparmio finalizzato
| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `nome` | text | Es. "Vacanza Giappone", "Fondo Emergenza", "Pensione" |
| `target` | numeric | Obiettivo opzionale |
| `data_target` | date | Scadenza opzionale |

#### `allocazione_secchiello` — Quote mensili
| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `secchiello_id` | uuid | FK |
| `mese` | date | Primo del mese (es. 2026-04-01) |
| `importo` | numeric | Quota allocata |
| `nota` | text | Es. "3a rata" |

#### `investimento` — Posizione asset
| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `tipo` | enum | `ETF` · `CRYPTO` · `AZIONE` · `OBBLIGAZIONE` · `PAC` · `ALTRO` |
| `nome` | text | Es. "VWCE", "BTC", "PAC ETF Mondo" |
| `ticker` | text | Opzionale per asset listati |
| `quantita` | numeric | Unità possedute |
| `prezzo_medio_carico` | numeric | Prezzo medio acquisto in € |
| `prezzo_corrente` | numeric | Aggiornato manualmente o da API |
| `data_aggiornamento_prezzo` | date | Quando ho aggiornato l'ultima volta |

#### `scadenza_fiscale` — Calendario fiscale
| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `tipo` | enum | `SALDO_IRPEF` · `ACCONTO_IRPEF_1` · `ACCONTO_IRPEF_2` · `INPS_TRIM` · `IVA` · `CCIAA` · `ALTRO` |
| `data_scadenza` | date | Data |
| `importo_dovuto` | numeric | Calcolato o inserito |
| `importo_pagato` | numeric | 0 finché non pagato |
| `note` | text | Libero |

### 3.2 Liste valori

```
lista_stato_fattura:    PAGATO | DA PAGARE | PROGRAMMATO
lista_categorie_spesa:  BUSINESS | AUTO | VITA | SVAGO | INVESTIMENTO | FORMAZIONE | SALUTE
lista_tipo_spesa:       EFFETTIVA | PROGRAMMATA
lista_tipo_investimento: ETF | CRYPTO | AZIONE | OBBLIGAZIONE | PAC | ALTRO
```

---

## 4 — MOTORE FISCALE 2026 (CORRETTO)

Questa è la sezione più importante. Tutti i bug del documento v4 precedente sono qui corretti.

### 4.1 Glossario

| Termine | Definizione |
|---|---|
| **Lordo** | Importo della fattura, nessuna deduzione |
| **Imponibile (singola fattura)** | `Lordo × Coefficiente_Redditività` |
| **Imponibile YTD** | Somma degli imponibili di tutte le fatture PAGATE da Gennaio al mese N incluso |
| **Tasse (singola fattura)** | `Imponibile_singolo × Aliquota` — solo se PAGATO |
| **INPS Fisso Mensile** | Quota fissa, **una sola volta al mese**, indipendente dal numero di fatture |
| **INPS Eccedenza Mese N** | `MAX(0; (Imponibile_YTD_N − MAX(Soglia; Imponibile_YTD_(N-1))) × 0.24)` |
| **Zavorra Fiscale Mese** | `Tasse_mese + INPS_Fisso_mese + INPS_Eccedenza_mese` |
| **Netto Reale Mese** | `Incassato_mese − Zavorra_mese + Entrate_Nette_Pure_mese − Spese_Effettive_mese` |
| **Tax Safe** | `Netto_Reale_Mese − Totale_Secchielli_mese − Zavorra_Fiscale` — i soldi davvero liberi |
| **Saving Rate** | `Totale_Secchielli_mese / Incassato_mese` (protetto da IFERROR) |
| **Punto Zero** | Snapshot di liquidità e investimenti al 1° Gennaio dell'anno corrente |

### 4.2 Bug del v4 corretti

| Bug v4 | Correzione v5 |
|---|---|
| INPS fisso accreditato per ogni fattura PAGATO | INPS fisso accreditato **una sola volta per mese**, indipendente da N° fatture. Nel foglio: condizione `CONTA.SE($E$4:E_n;"PAGATO")=1`. Nel codice: somma fissa per mese, non per riga. |
| INPS eccedenza assente nella zavorra mensile | INPS eccedenza calcolato per mese e incluso nella Zavorra. Sotto soglia = 0. |
| Accrual fiscali salvati per riga su DB | Accrual ricalcolati on-the-fly. Mai persistiti. |
| Coefficiente limitato a 0.78/0.40 | Tutti i 7 coefficienti ATECO selezionabili dal profilo |
| INPS Fisso valore 376.78 hardcoded | Parametrizzato in `profile.inps_fisso_mensile` — aggiornabile a inizio anno |
| Doppione colonna Netto / Netto Reale | Una sola colonna |
| Crypto tracker mescolato col fiscale | Spostato in foglio/sezione `INVESTIMENTI` separata |

### 4.3 Algoritmo riferimento (TypeScript)

```typescript
type Profile = {
  anno_fiscale: number;
  coefficiente_redditivita: number;
  aliquota_imposta: number;
  inps_minimale_annuo: number;
  inps_fisso_mensile: number;
  inps_aliquota_eccedenza: number;
};

type Fattura = {
  data_incasso: Date | null;
  lordo: number;
  stato: 'PAGATO' | 'DA PAGARE' | 'PROGRAMMATO';
};

type RiepilogoMese = {
  mese: number; // 1-12
  incassato: number;
  imponibile_mese: number;
  imponibile_ytd: number;
  tasse_mese: number;
  inps_fisso_mese: number;
  inps_eccedenza_mese: number;
  zavorra_fiscale_mese: number;
  // ...
};

function calcolaRiepilogoAnno(
  fatture: Fattura[],
  profile: Profile
): RiepilogoMese[] {
  const riepiloghi: RiepilogoMese[] = [];
  let imponibile_ytd_precedente = 0;
  const soglia = profile.inps_minimale_annuo;

  for (let m = 1; m <= 12; m++) {
    const fattureMese = fatture.filter(f =>
      f.stato === 'PAGATO' &&
      f.data_incasso &&
      f.data_incasso.getMonth() + 1 === m &&
      f.data_incasso.getFullYear() === profile.anno_fiscale
    );

    const incassato = fattureMese.reduce((s, f) => s + f.lordo, 0);
    const imponibile_mese = incassato * profile.coefficiente_redditivita;
    const imponibile_ytd = imponibile_ytd_precedente + imponibile_mese;

    const tasse_mese = imponibile_mese * profile.aliquota_imposta;

    // INPS fisso: una volta al mese SE c'è almeno una fattura PAGATO nel mese
    const inps_fisso_mese = fattureMese.length > 0
      ? profile.inps_fisso_mensile
      : 0;

    // INPS eccedenza: differenziale, basato su YTD
    const eccedenza_corrente = Math.max(0, imponibile_ytd - soglia);
    const eccedenza_precedente = Math.max(0, imponibile_ytd_precedente - soglia);
    const inps_eccedenza_mese =
      (eccedenza_corrente - eccedenza_precedente) * profile.inps_aliquota_eccedenza;

    const zavorra_fiscale_mese = tasse_mese + inps_fisso_mese + inps_eccedenza_mese;

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

### 4.4 Scenari di test (verifica obbligatoria)

**Scenario A — Sotto soglia, fattura singola**
- Profilo: coeff=0.78, aliquota=0.05, soglia=18808, fisso=376.78
- 1 fattura PAGATO da 5000€ a Gennaio
- Atteso: imponibile=3900, tasse=195, inps_fisso=376.78, inps_var=0, zavorra=571.78

**Scenario B — Sotto soglia, due fatture nello stesso mese**
- 2 fatture PAGATE da 3000€ ciascuna a Gennaio
- Atteso: imponibile=4680, tasse=234, **inps_fisso=376.78 (NON 753.56!)**, inps_var=0, zavorra=610.78

**Scenario C — Superamento soglia a metà anno**
- Fatture mensili da 3000€ PAGATE per 8 mesi (Gen-Ago) con coeff 0.78
- Atteso al mese 8: imponibile_YTD=18720 (sotto soglia), inps_var=0
- 9° fattura da 3000€ a Settembre: imponibile_YTD=21060
- Eccedenza Settembre: `(21060-18808) − max(0; 18720-18808) = 2252 − 0 = 2252`
- INPS var Settembre: `2252 × 0.24 = 540.48`
- Atteso a Settembre: zavorra = tasse(117) + fisso(376.78) + var(540.48) = 1034.26

**Scenario D — Fattura DA PAGARE**
- 1 fattura DA PAGARE da 10000€
- Atteso: incassato=0, tasse=0, inps_fisso=0, inps_var=0, zavorra=0
- La fattura compare in "Pipeline Da Incassare" ma non genera accantonamenti.

**Scenario E — Inserimento retroattivo**
- Stato: 8 fatture PAGATE in Gen-Ago, riepilogo Settembre già calcolato
- Aggiungo retroattivamente 1 fattura PAGATA da 5000€ a Marzo
- Atteso: tutto il riepilogo Mar-Set viene **ricalcolato da zero**. Nessuno stato YTD persistito che porta inconsistenze.

---

## 5 — STRUTTURA DEL FOGLIO TANGERINE v5

Modifiche rispetto al v4 (`.gs` allegato).

### 5.1 SETUP — Aggiunte v5

```
B2:  ANNO FISCALE    C2: 2026   ← variabile globale
```

Tutti i `B1` dei fogli mese leggono da qui: `=$nomeMese & " " & SETUP!$C$2`.
Quando cambi anno, cambi un solo numero.

### 5.2 Nuovo foglio: SCADENZE

| Cella | Etichetta | Formula/Valore |
|---|---|---|
| B3:F3 | Header: TIPO · DATA · DOVUTO · PAGATO · STATO | |
| B4 | "Saldo IRPEF + 1° Acconto" | |
| C4 | =DATA(SETUP!$C$2;6;30) | |
| D4 | =DASHBOARD!Imponibile_anno_precedente * SETUP!$C$5 + acconto_50% | (formula da affinare) |
| E4 | input utente | |
| F4 | =SE(E4>=D4;"PAGATO";SE(OGGI()>C4;"SCADUTO";"DA PAGARE")) | |
| B5 | "2° Acconto IRPEF" (30 nov) | |
| B6-B9 | INPS trimestrali (16/05, 20/08, 16/11, 16/02) | |

Formattazione condizionale: rosso se SCADUTO, giallo se mancano <30gg, verde se PAGATO.

### 5.3 Nuovo foglio: INVESTIMENTI

```
B3:I3  Header: TIPO · NOME · TICKER · QUANTITÀ · PREZZO MEDIO · PREZZO CORRENTE · VALORE · P/L · P/L %
B4:I40 Posizioni (manuali; crypto può usare GOOGLEFINANCE)
```

Riepilogo:
- Totale investito (cost basis)
- Valore corrente totale
- P/L assoluto e %
- Allocazione % per tipo

### 5.4 Modifiche ai fogli MESE

- **Eliminato** il doppione colonna Netto (D). Resta solo `H` Netto Reale per riga (utile come "quanto da non spendere").
- **Etichetta cambiata**: la colonna H ora si chiama **"Da Accantonare"** non "Netto Reale", per non illudere.
- **K10 Zavorra Fiscale Mese** ora include INPS eccedenza. Formula:
  ```
  =SOMMA(F4:F35)+G_inps_fisso_mese+DASHBOARD!E_inps_eccedenza_mese
  ```
  dove `DASHBOARD!E_n` è la cella INPS eccedenza del mese N nel cruscotto annuale.
- **Validazione warning**: se `K11 < 0` (Netto Reale negativo), formattazione condizionale rossa + nota "Spese > Incassato".
- **Crypto rimosso** dal foglio MESE e dalla DASHBOARD principale → trasferito in INVESTIMENTI.

### 5.5 Modifiche alla DASHBOARD

- Sezione "Crypto Tracker" rimossa.
- Nuova sezione **"Scadenze Prossimi 90 giorni"**: legge da SCADENZE, mostra le 3 scadenze più vicine con countdown e stato.
- Nuova sezione **"Investimenti — Riepilogo"**: legge da INVESTIMENTI, mostra valore totale, P/L %, allocazione.
- Sezione "Cruscotto Fiscale" — colonna nuova: "Zavorra Effettiva Mese" = tasse + fisso + var. La cella K10 dei fogli mese referenzia questa.
- Grafici nativi: usare `newChart()` per:
  1. Linee — Flussi Mensili (entrate, uscite, accantonamenti) su 12 mesi
  2. Torta — Allocazione spese per categoria YTD
  3. Barre — Andamento Saving Rate mensile
  4. Linee — Imponibile YTD vs Soglia INPS

---

## 6 — SPECIFICHE PWA TANGERINE

(Applicabili nello Scenario B o C — quando si decide di costruire la PWA.)

### 6.1 Schermate

1. **Quick Add Spesa** (default home in mobile)
2. **Quick Add Fattura**
3. **Dashboard Mese**
4. **Dashboard Anno + Grafici**
5. **Scadenze Fiscali**
6. **Investimenti & Secchielli**
7. **Impostazioni** (profile)

### 6.2 Procedures API minime

```
GET  /api/profile
PUT  /api/profile
GET  /api/fatture?anno=&mese=&stato=
POST /api/fatture
PUT  /api/fatture/:id
DELETE /api/fatture/:id
GET  /api/spese?anno=&mese=&categoria=
POST /api/spese
PUT  /api/spese/:id
DELETE /api/spese/:id
GET  /api/entrate-nette?anno=&mese=
POST /api/entrate-nette
GET  /api/secchielli
POST /api/secchielli
POST /api/secchielli/:id/allocazioni
GET  /api/investimenti
PUT  /api/investimenti/:id
GET  /api/scadenze?prossimi_giorni=90
PUT  /api/scadenze/:id
GET  /api/dashboard/mese/:anno/:mese
GET  /api/dashboard/anno/:anno
```

15 endpoint REST. Nessun tRPC. Validazione con Zod sia client che server.

### 6.3 Calcoli sempre on-the-fly

Mai salvare campi calcolati (tasse, inps_var, netto reale). La GET dashboard ricalcola tutto al volo dalle fatture grezze + profile. Costo computazionale trascurabile per uso personale (max ~500 fatture/anno).

---

## 7 — STACK TECNICO SEMPLIFICATO

Stack per Scenario C (PWA esterna). Per Scenario B (Apps Script) lo stack è solo HTML/CSS/JS dentro Apps Script.

| Layer | Tecnologia | Motivazione |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | Standard solido. No React 19 finché non si stabilizza. |
| UI components | shadcn/ui (selettivo, solo i 6-8 che servono) | Niente bundle gigante. |
| Routing | React Router (3 route) o anche niente, solo state | Wouter inutile per 3 pagine. |
| Forms | HTML form nativi + Zod | react-hook-form overkill. |
| State server | TanStack Query | OK per cache REST. |
| Backend | Hono o Express | Hono preferito (più leggero). |
| Validazione | Zod (condivisa client/server) | OK. |
| ORM | Drizzle | OK. |
| Database | Supabase Postgres OPPURE Replit Postgres | Indifferente per uso personale. |
| Auth | PIN locale a 4 cifre + crypto sul client OPPURE Replit Auth | NO Manus OAuth. |
| Hosting | Replit Autoscale | ~1–3 €/mese. |
| PWA | manifest.json + service worker minimo | "Aggiungi a Home" su iPhone. |

**Stack rimosso rispetto al doc v4:**
- tRPC → REST puro (più semplice, debuggabile)
- Manus OAuth → PIN o Replit Auth (meno dipendenze)
- Wouter → niente (3 pagine)
- react-hook-form → form nativi
- shadcn completo → solo i componenti usati

---

## 8 — UX E SCHERMATE

### 8.1 Quick Add Spesa (la schermata più usata)

```
┌────────────────────────┐
│   ← Tangerine          │
│                        │
│       € 0,00           │  ← input numerico grande
│                        │
│   [BUS] [AUTO] [VITA]  │  ← chip categoria (tap singolo)
│   [SVAGO] [INV] ...    │
│                        │
│   📅 Oggi              │  ← data, default oggi
│                        │
│   📝 Nota (opz.)       │
│                        │
│   [    SALVA    ]      │  ← pulsante full-width
└────────────────────────┘
```

3 tap nel caso veloce: importo → categoria → salva. Tutto il resto opzionale.

### 8.2 Dashboard Mese (sintetica)

KPI in card grandi, leggibili dal pollice:
- Incassato mese
- Da Accantonare (zavorra)
- Tax Safe (in evidenza, colorato)
- Saving Rate (con badge: VERDE/GIALLO/ROSSO)
- Stato Mese: emoji o etichetta

### 8.3 Notifiche (Scenario C)

- 30/15/7/1 giorni prima di ogni scadenza fiscale
- Alert quando Tax Safe va negativo
- Promemoria mensile "ricordati di aggiornare i prezzi degli investimenti"

---

## 9 — SCADENZE FISCALI E CALENDARIO

### 9.1 Scadenze fisse forfettario 2026

| Tipo | Data | Cosa |
|---|---|---|
| INPS 1° trim | 16/05/2026 | Fisso trimestrale |
| Saldo IRPEF + 1° Acconto | 30/06/2026 | Tasse anno precedente + 50% acconto |
| INPS 2° trim | 20/08/2026 | Fisso trimestrale |
| INPS 3° trim | 16/11/2026 | Fisso trimestrale |
| 2° Acconto IRPEF | 30/11/2026 | 50% acconto |
| INPS 4° trim | 16/02/2027 | Fisso trimestrale |
| INPS eccedenza saldo | 30/06 anno succ. | Solo se sopra soglia |

### 9.2 Calcolo automatico importi

- **Saldo IRPEF**: imponibile YTD 2025 × aliquota − acconti versati
- **1° e 2° Acconto IRPEF**: 50% delle tasse anno precedente (regola standard, da affinare con commercialista per la tua casistica)
- **INPS Fisso trim**: `inps_fisso_mensile × 3` (controllare con cedolino INPS reale)
- **INPS Eccedenza**: calcolato sul totale eccedenza dell'anno

### 9.3 Stati scadenza

- `FUTURA` (>30gg) → grigio
- `IN AVVICINAMENTO` (8-30gg) → giallo
- `URGENTE` (≤7gg) → arancione
- `SCADUTA` (e non pagata) → rosso
- `PAGATA` → verde, in fondo

---

## 10 — INVESTIMENTI E PAC

### 10.1 Scopo

Vedere a colpo d'occhio nella dashboard generale:
- Quanto ho investito (cost basis)
- Quanto vale oggi
- P/L assoluto e %
- Quanto sto accantonando in PAC ogni mese
- Allocazione per tipo

### 10.2 Aggiornamento prezzi

- **Crypto**: `GOOGLEFINANCE("CURRENCY:BTCEUR")` nel foglio. Nella PWA: API CoinGecko free tier.
- **ETF/Azioni**: input manuale (1 volta al mese) oppure `GOOGLEFINANCE("ticker")` se quotato.
- Campo `data_aggiornamento_prezzo` per sapere quando l'ho aggiornato l'ultima volta.

### 10.3 PAC

Il PAC è una `spesa` con categoria `INVESTIMENTO`, e contemporaneamente alimenta una `allocazione_secchiello` (secchiello "PAC ETF Mondo") + un `investimento`. Quando l'utente registra un PAC nella PWA, l'app fa le 3 scritture in una sola azione.

---

## 11 — LLM MASTERGUIDE

Da incollare come system prompt o prima sezione in ogni richiesta a un LLM che lavora su Tangerine.

### 11.1 Identità

```
Ruolo: Senior Financial Modeler + Full-stack Engineer specializzato in:
- Google Apps Script + Google Sheets (locale italiano)
- React + TypeScript + Postgres per PWA personali
- Diritto tributario italiano per Partite IVA forfettarie

Tono: Conciso, tecnico, zero preamboli. NO "Certamente!", "Ecco il codice",
"Spero che questo aiuti". Output diretto.

Obiettivo primario: Integrità dei calcoli fiscali sopra ogni scelta estetica.
Se conflitto tra layout/UX e formula corretta, vince la formula.

Lingua formule foglio: SEMPRE punto e virgola ; come separatore (locale IT).
Lingua codice: TypeScript, identificatori inglesi, commenti italiano se utili.

Riferimento dati: Prima di generare formule fiscali, consulta sezione 4
(MOTORE FISCALE) di questo documento. Mai usare valori non referenziati a
SETUP/profile.

Regola crediti: Patch chirurgiche a riscritture. Modifiche < 5 celle/funzioni
non richiedono riscrittura completa.
```

### 11.2 Ordine di consultazione del documento

1. Sezione 4 (Motore Fiscale) — verificare formule contro scenari di test
2. Sezione 3 (Modello Dati) — usare nomi campi esatti
3. Sezione 12 (Error Handbook) — controllare se il bug è già noto
4. Sezione richiesta dall'utente

### 11.3 Forbidden List

| ❌ | Motivo |
|---|---|
| Salvare campi fiscali calcolati per riga (`tasse`, `inps_var`) | Bug consistency su inserimenti retroattivi. Calcolare on-the-fly. |
| INPS fisso × N° fatture nel mese | Sbagliato. È sempre quota mensile fissa. |
| `ARRAYFORMULA` su celle fiscali | Debug riga-per-riga impossibile |
| `QUERY()` in fogli IT | Si rompe con separatori `;` |
| Hardcoded `0.05`, `0.78`, `376.78` | Tutto deve referenziare SETUP/profile |
| Inventare soglie INPS non in profile | Chiedere all'utente, non usare valori da training |
| `1/x` non protetto da IFERROR | DIV/0 inevitabile a Gennaio |
| Markdown in output `.gs` | Apps Script non lo interpreta |
| tRPC, Wouter, react-hook-form, Manus OAuth | Stack semplificato in v5 |
| Suggerire App Store / native iOS | PWA è la scelta. 99$/anno Apple non giustificato. |
| Usare `Math.ceil` su tasse senza dirlo all'utente | Arrotondamento per eccesso va dichiarato esplicitamente |

### 11.4 Output format

Per modifiche al foglio `.gs`:
- Tabella `| Cella | Etichetta | Formula/Valore | Tipo |`
- Codice raw, no blocchi markdown, no preamboli

Per modifiche alla PWA:
- Path file completo
- Diff puntuale, non file intero (a meno che richiesto)
- Specifica se serve update di Drizzle schema

### 11.5 Quando l'utente chiede una nuova feature

1. Verificare che esista nella sezione corrispondente di questo documento
2. Se NO: aggiornare prima questo documento, poi implementare
3. Se la feature tocca calcoli fiscali: aggiungere uno scenario di test in sezione 4
4. Se la feature tocca il modello dati: aggiornare sezione 3

---

## 12 — ERROR HANDBOOK

| Errore / Sintomo | Causa | Fix |
|---|---|---|
| INPS calcolato N volte in un mese | Formula `setFormula` per ogni fattura senza condizione `CONTA.SE($E$4:E_n;"PAGATO")=1` | Solo prima fattura PAGATO del mese accredita INPS fisso |
| `#NOME?` su Mac con locale EN | Funzioni IT non riconosciute | Usare `SUMIF` invece di `SOMMA.SE` (richiede locale IT settato in foglio) |
| `#DIV/0!` in Saving Rate a Gennaio | Incassato=0 | Wrappare in `=IFERROR(formula;0)` |
| INPS eccedenza duplicata mese su mese | Manca formula differenziale | Usare `MAX(soglia; IFERROR(D_(n-1);0))` non `MAX(soglia;0)` |
| Tasse calcolate su DA PAGARE | Manca condizione SE | `=SE(E_n="PAGATO";...;0)` |
| Apps Script timeout >5min | Loop con setFormula per cella | Usare `setFormulas(matrix)` batch |
| Fattura inserita retroattivamente non aggiorna mesi successivi | Stato YTD persistito | Ricalcolo on-the-fly da zero |
| PWA Supabase pausa dopo 7gg inattività | Free tier Supabase | Cron ping ogni 5gg o passare a Replit Postgres |
| iOS PWA non riceve notifiche | iOS supporta notifiche PWA solo da iOS 16.4+ e solo se aggiunta a Home Screen | Documentare nel README |
| Tax Safe negativo ma nessun warning | Manca formattazione condizionale | Regola CF: rosso se K16 < 0 |
| Coefficiente cambiato a metà anno | Profile aggiornato senza versionamento | Bloccare modifica del coefficiente; aggiungere `coefficiente_storico[]` se necessario |

---

## 13 — ROADMAP E PRIORITÀ

### Sprint 1 — Foglio Tangerine v5 (priorità ALTA)
- [ ] Aggiunta variabile ANNO in SETUP, refactor `B1` di tutti i mesi
- [ ] Bug INPS fisso (una volta al mese) → audit codice .gs e correzione
- [ ] Aggiunta INPS eccedenza nella zavorra mensile (collegamento DASHBOARD → MESE)
- [ ] Eliminazione doppione Netto/Netto Reale, rinomina "Da Accantonare"
- [ ] Formattazione condizionale Netto Reale negativo
- [ ] Nuovo foglio SCADENZE con calendario fiscale 2026
- [ ] Nuovo foglio INVESTIMENTI; rimozione crypto da DASHBOARD
- [ ] Grafici nativi via `newChart()`
- [ ] Aggiornamento masterguide allineato al codice (questo documento)

### Sprint 2 — Decisione architetturale PWA
- [ ] Test del foglio v5 patchato per 2-4 settimane
- [ ] Decisione: Scenario A, B o C
- [ ] Se B o C: creazione `artifacts/tangerine-pwa`

### Sprint 3 — PWA MVP (solo se Scenario B o C scelto)
- [ ] Schema DB / schema fogli (sezione 3)
- [ ] Endpoint REST `profile` + `fatture` + `spese`
- [ ] Schermata Quick Add Spesa
- [ ] Schermata Dashboard Mese
- [ ] Calcolo on-the-fly motore fiscale (sezione 4) con tutti gli scenari di test verdi

### Sprint 4 — Ricchezza
- [ ] Investimenti, Secchielli, Scadenze
- [ ] Grafici interattivi
- [ ] Notifiche (se possibile su iOS PWA)
- [ ] Dark mode

### Backlog (non urgente)
- [ ] Export CSV per commercialista
- [ ] OCR scontrini (foto → spesa)
- [ ] Sync banca via PSD2 (Tink, Fabrick) — solo se davvero serve
- [ ] Multi-anno, confronto YoY
- [ ] App nativa (NO, salvo evidenza forte)

---

## 14 — CHANGELOG

| Versione | Data | Modifiche principali |
|---|---|---|
| v1 | 2026-04 | Foglio Tangerine, prima versione |
| v2 | 2026-05 | Fix critici formule, batch writes, foglio CONFIG |
| v3 | 2026-05 | Estensione blocchi, Entrate Nette, secchielli cumulativi, setNote |
| v4 | 2026-05 | Stato PROGRAMMATO, dashboard ricca, crypto tracker, dashboard fiscale |
| v4-PWA-bozza | 2026-05 | Bozza PWA con stack overbuilt, motore fiscale buggato (NO PRODUZIONE) |
| **v5 (questo doc)** | **2026-05** | **Doc unico foglio+PWA. Motore fiscale corretto (INPS fisso mensile, ricalcolo on-the-fly). Stack PWA semplificato. Aggiunte: ANNO, SCADENZE, INVESTIMENTI separati, validazioni netto<0, grafici nativi. Rimosse: tRPC, Manus OAuth, Wouter, react-hook-form, Crypto in dashboard fiscale.** |

---

*Fine documento. Aggiornare questo file ad ogni modifica al progetto. Versionare in git.*
