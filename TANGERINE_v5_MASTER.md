# TANGERINE — Documento Unico di Progetto

**Versione:** 5.1
**Data:** Maggio 2026
**Tipologia:** Master document — missione + obiettivi + specs tecniche + motore fiscale + UX + LLM masterguide
**Ambito:** Strumento di gestione finanziaria personale per Partita IVA forfettaria italiana
**Lingua:** Italiano (UI, formule, documentazione, comunicazione utente). Inglese (codice, identificatori, API).

---

## INDICE

0. Note di lettura e regole globali
1. Missione, obiettivi e non-obiettivi
2. Architettura: app standalone + foglio come export
3. Modello dati condiviso
4. Motore Fiscale 2026 (corretto e biforcato)
5. Foglio Tangerine v5 (ruolo di export/backup)
6. Specifiche PWA Tangerine
7. Stack tecnico semplificato
8. UX e schermate (stile Revolut migliorato)
9. Scadenze fiscali e calendario
10. Investimenti, PAC e secchielli
11. Migrazione da Excel (onboarding utente esistente)
12. LLM Masterguide
13. Error Handbook
14. Roadmap MVP / Post-MVP
15. Changelog

---

## 0 — NOTE DI LETTURA E REGOLE GLOBALI

- **Lingua formule foglio**: italiano, separatore `;`. Esempio corretto: `=SOMMA.SE(E4:E35;"PAGATO";C4:C35)`. Mai `,` come separatore.
- **Lingua codice PWA**: TypeScript, identificatori inglesi, commenti italiano se utili.
- **Tutti i parametri fiscali sono variabili.** Mai hardcoded nel codice o nelle formule. Sempre referenziati a `SETUP` (foglio) o tabella `profile` (DB).
- **Regola di efficienza**: prima di ogni modifica, valuta se esiste un approccio più economico e meno invasivo. Patch chirurgica > riscrittura.
- **Principio di Cassa** governa il modello fiscale: tasse e INPS variabile si calcolano SOLO su entrate effettivamente incassate (`stato = INCASSATO`). L'INPS fisso è eccezione: matura sempre.
- **Single Source of Truth**: questo documento. Se foglio o codice divergono dalle specs scritte qui, è il foglio/codice ad essere sbagliato.
- **Mai inventare valori fiscali**: se non sai una soglia, un'aliquota o una scadenza, chiedi all'utente o referenzia documento ufficiale. Mai usare valori "da training data".

---

## 1 — MISSIONE, OBIETTIVI E NON-OBIETTIVI

### 1.1 Missione

> Tangerine è lo strumento personale che permette a un freelance forfettario italiano di sapere ogni giorno, in 3 secondi, quanto può davvero spendere senza compromettere tasse, INPS e obiettivi di risparmio. Sostituisce completamente il foglio Excel per la gestione quotidiana, lasciandolo solo come export di backup.

### 1.2 Obiettivi primari (in ordine di priorità)

| # | Obiettivo | Cosa significa |
|---|---|---|
| **O1** | Verità fiscale al centesimo | L'app non sbaglia mai un calcolo di tasse o INPS. Se c'è un dubbio interpretativo lo dichiara, non lo nasconde dietro un numero finto. |
| **O2** | Sostituire Excel completamente | Dopo 1 mese d'uso, l'utente non deve più aprire il foglio per la gestione quotidiana. Il foglio resta come archivio annuale generato dall'app. |
| **O3** | Inserimento spesa in 3 tap, ogni giorno | Importo → categoria → conferma. <5 secondi totali. Caso d'uso n.1 dell'app. |
| **O4** | Dashboard leggibile a colpo d'occhio | Aprendo l'app vedo: incassato mese, da accantonare, Tax Safe. Senza scroll. |
| **O5** | Calendario fiscale con notifiche | 30/15/7/1 giorni prima di ogni scadenza vedo un avviso. Niente sorprese a giugno o novembre. |
| **O6** | CRUD totale | Categorie, sottocategorie, secchielli, clienti, entrate, uscite: tutti aggiungibili, modificabili, eliminabili. Niente liste hardcoded. |
| **O7** | Distinzione netta programmato vs effettivo | Per entrate (PROGRAMMATO/EMESSO_DA_INCASSARE/INCASSATO) e per spese (PROGRAMMATA/EFFETTIVA). Solo l'effettivo entra nei calcoli fiscali. |
| **O8** | Tracking investimenti completo | PAC con dati prodotto (TER, costi ingresso, SRI), valore corrente, P/L, costo annualizzato in €. L'app deve "gridare" quando i costi sono alti. |
| **O9** | Anagrafica clienti con storico e upselling | Lista clienti, fatturato per cliente, segnalazione delta vs ultima fattura ("+50% sull'ultima"). |
| **O10** | Indipendenza e portabilità dati | Export CSV in qualsiasi momento. Export Google Sheets periodico. Possibile spostare l'app altrove in 1 giorno. |
| **O11** | Costo annuo trascurabile | <30 €/anno totali. No App Store, no abbonamenti aggiuntivi. |

### 1.3 Non-obiettivi (cosa NON facciamo)

| # | Non-obiettivo | Perché |
|---|---|---|
| **N1** | App per commercialisti o società di capitali | Solo regime forfettario, una P.IVA, una persona. Niente IVA, niente fatturazione elettronica integrata, niente F24 generati. |
| **N2** | App multi-utente o sociale | Solo me. Lo smezzamento socio è un calcolo, non un account condiviso. |
| **N3** | App di trading o consulenza investimenti | Tracking, non analisi. Niente alert "compra/vendi". |
| **N4** | Sync banca PSD2 | Non in v1. Inserimento manuale o copia da statement. Eventuale v2. |
| **N5** | App nativa iOS/Android | PWA installabile da browser. Niente App Store, niente 99$/anno Apple. |
| **N6** | Sostituto del commercialista | Per dichiarazione finale e casi dubbi → commercialista. L'app è per pianificazione mensile e controllo continuo. |
| **N7** | Budget app generalista | Focus regime forfettario italiano. Categorie, calcoli e dashboard ottimizzati per quel caso. |

### 1.4 Metriche di successo

- Registro almeno 1 spesa al giorno per ≥80% dei giorni del mese
- A fine mese il dato app combacia col foglio entro 1 €
- Sorprese fiscali a giugno/novembre: zero
- Tempo medio inserimento spesa: <5 secondi
- Tempo medio per leggere stato finanziario: <3 secondi dall'apertura
- Dopo 2 mesi: il foglio Excel non viene più aperto se non per export

---

## 2 — ARCHITETTURA: APP STANDALONE + FOGLIO COME EXPORT

### 2.1 Posizionamento

```
                ┌──────────────────────────────────┐
                │      MODELLO FISCALE 2026         │
                │  (Sezione 4 di questo documento)  │
                └──────────────────────────────────┘
                              │
                              ▼
                ┌──────────────────────────────────┐
                │   PWA TANGERINE v5.1              │
                │   STRUMENTO PRINCIPALE            │
                │                                   │
                │ - Quick-add quotidiano            │
                │ - Dashboard mese + anno           │
                │ - Calcolo on-the-fly              │
                │ - CRUD totale                     │
                │ - Notifiche scadenze              │
                │ - PWA installabile su iPhone      │
                └──────────────────────────────────┘
                              │
                              ▼ (export periodico, manuale o automatico)
                ┌──────────────────────────────────┐
                │   FOGLIO GOOGLE SHEETS            │
                │   ARCHIVIO PASSIVO                │
                │                                   │
                │ - Generato dall'app               │
                │ - Read-only di fatto              │
                │ - Per commercialista o backup     │
                └──────────────────────────────────┘
```

**Cambio rispetto a v5**: il foglio non è più "verità annuale" né "diario parallelo". È un **output dell'app**, generato su richiesta. L'utente smette di mantenerlo a mano dopo l'onboarding.

### 2.2 Stack di adozione

Default unico raccomandato: **PWA standalone su Replit + Postgres + foglio export**.

Stack alternativo "zero costi" (Apps Script Web App dentro Google) descritto in v5 sezione 2.2 → **deprecato in v5.1** perché l'utente ha esplicitato voler abbandonare il foglio. Non perdere tempo a costruire un'app dentro lo stesso ambiente che si vuole abbandonare.

---

## 3 — MODELLO DATI CONDIVISO

Nomi DB in `snake_case` inglese. Etichette UI in italiano.

### 3.1 Entità

#### `profile` — Configurazione utente (record singolo)

| Campo | Tipo | Default | Descrizione |
|---|---|---|---|
| `anno_fiscale` | int | 2026 | Anno corrente. Cambia → tutto il sistema riparte. |
| `coefficiente_redditivita` | numeric | 0.78 | ATECO: 0.40 / 0.54 / 0.62 / 0.67 / 0.73 / 0.78 / 0.86 |
| `aliquota_imposta` | numeric | 0.05 | 0.05 (5% startup, primi 5 anni) o 0.15 (15% standard) |
| `tipo_inps` | enum | `COMMERCIANTE` | `COMMERCIANTE` (include Artigiani — fisso + eccedenza) o `GESTIONE_SEPARATA` (% secca su imponibile) |
| `inps_minimale_annuo` | numeric | 18808.00 | Soglia INPS oltre cui scatta eccedenza. Solo per Commercianti. Aggiornare ogni anno. |
| `inps_fisso_mensile` | numeric | 376.78 | Quota fissa mensile Commercianti. Solo se tipo_inps=COMMERCIANTE. |
| `inps_aliquota_eccedenza` | numeric | 0.24 | Aliquota INPS sull'eccedenza (Commercianti) |
| `inps_aliquota_gs` | numeric | 0.2607 | Aliquota Gestione Separata. 0.2607 (~26,07%) con altra copertura/pensionato; 0.24 (~24%) con sola GS. Solo se tipo_inps=GESTIONE_SEPARATA. |
| `liquidita_iniziale` | numeric | 0 | Punto Zero: liquidità all'inizio dell'anno fiscale |
| `investimenti_iniziali` | numeric | 0 | Punto Zero: valore investimenti all'inizio dell'anno |
| `pac_mensile_automatico` | numeric | 0 | Quota PAC accantonata in automatico ogni mese |
| `cuscinetto_mensile_automatico` | numeric | 0 | Quota fondo emergenza automatica |
| `partner_aliquota_default` | numeric | 0.26 | Forfait tasse socio per smezzamento (override per fattura) |
| `tema` | enum | `AUTO` | `LIGHT` / `DARK` / `AUTO` (segue sistema) |
| `created_at` | timestamp | now() | |
| `updated_at` | timestamp | now() | |

#### `cliente` — Anagrafica clienti

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `nome` | text | Es. "Studio Rossi", "Mario Bianchi" |
| `partita_iva` | text | Opzionale |
| `codice_fiscale` | text | Opzionale |
| `email` | text | Opzionale |
| `telefono` | text | Opzionale |
| `note` | text | Libero |
| `attivo` | boolean | TRUE di default. FALSE = nascosto da dropdown ma storico preservato |
| `created_at` | timestamp | |

Vista calcolata `cliente_stats`:
- `fatturato_ytd`: somma lordo fatture INCASSATE anno corrente
- `fatturato_anno_precedente`: idem anno prec.
- `numero_fatture_ytd`: count
- `ultima_fattura_data` e `ultima_fattura_lordo`
- `delta_vs_ultima_pct`: per badge upselling

#### `fattura` — Entrate da P.IVA

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `cliente_id` | uuid | FK `cliente`. Nullable per casi una tantum. |
| `numero_fattura` | text | Opzionale (es. "2026/042") |
| `data_emissione` | date | Data emissione fattura |
| `data_scadenza_pagamento` | date | Quando dovrebbe arrivare il pagamento |
| `data_incasso` | date | Data effettiva pagamento (NULL se non ancora pagato) |
| `descrizione` | text | Es. "Consulenza marketing Aprile" |
| `lordo` | numeric | Importo fatturato |
| `stato` | enum | `PROGRAMMATO` / `EMESSO_DA_INCASSARE` / `INCASSATO`. Stato derivato `IN_RITARDO` calcolato runtime. |
| `has_partner` | boolean | TRUE se ricavo da smezzare con socio |
| `partner_aliquota` | numeric | Override aliquota socio (default da profile) |
| `note` | text | Libero |
| `created_at` | timestamp | |

> **Stati**:
> - `PROGRAMMATO`: prevista, non ancora emessa
> - `EMESSO_DA_INCASSARE`: emessa, in attesa di pagamento
> - `INCASSATO`: pagata. **Solo qui scattano gli accantonamenti fiscali.**
> - `IN_RITARDO` (calcolato): `EMESSO_DA_INCASSARE` AND `data_scadenza_pagamento < oggi`. Mostrato in rosso, non è uno stato salvato.

> **Importante**: gli accrual fiscali NON si salvano per riga. Si **ricalcolano on-the-fly** dal lordo + ytd. Vedi sezione 4.

#### `entrata_netta` — Entrate esentasse

Vendite usato, regali, rimborsi, refund. **Non generano accantonamento tasse né INPS variabile**. L'INPS fisso resta dovuto perché matura indipendentemente dagli incassi.

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `data` | date | Data |
| `voce` | text | Descrizione |
| `importo_netto` | numeric | Importo già al netto |
| `categoria` | text | Opzionale (es. VENDITA_USATO, REGALO, RIMBORSO, REFUND, ALTRO) |
| `note` | text | Libero |
| `created_at` | timestamp | |

#### `spesa` — Uscite

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `data` | date | Data spesa |
| `categoria_id` | uuid | FK `categoria` |
| `sottocategoria_id` | uuid | FK `sottocategoria` (opzionale) |
| `importo` | numeric | Sempre positivo |
| `tipo` | enum | `EFFETTIVA` / `PROGRAMMATA` |
| `descrizione` | text | Libero, breve |
| `note` | text | Libero, lungo |
| `created_at` | timestamp | |

#### `categoria` — Categorie spese (CRUD)

| Campo | Tipo | Default seed | Descrizione |
|---|---|---|---|
| `id` | uuid | | PK |
| `nome` | text | | Es. "BUSINESS", "AUTO", "VITA", "SVAGO", "INVESTIMENTO", "FORMAZIONE", "SALUTE" |
| `colore_hex` | text | | Per UI (es. "#3B82F6") |
| `icona` | text | | Nome icona Lucide (es. "Briefcase", "Car", "Heart") |
| `ordine` | int | | Per ordinamento in UI |
| `attiva` | boolean | TRUE | FALSE = nascosta in dropdown, spese storiche preservate |

Seed iniziale: 7 categorie (BUSINESS blu, AUTO verde scuro, VITA rosa, SVAGO giallo, INVESTIMENTO viola, FORMAZIONE teal, SALUTE rosso). Utente può aggiungere/modificare/disattivare.

#### `sottocategoria`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `categoria_id` | uuid | FK |
| `nome` | text | Es. sotto AUTO: "Carburante", "Assicurazione", "Tagliando", "Pedaggi" |
| `attiva` | boolean | |

#### `secchiello` — Risparmio finalizzato (CRUD)

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `nome` | text | Es. "Vacanza Giappone", "Fondo Emergenza", "Pensione" |
| `colore_hex` | text | Per UI |
| `icona` | text | Nome icona Lucide |
| `target_importo` | numeric | OPZIONALE. Obiettivo in € |
| `target_data` | date | OPZIONALE. Scadenza obiettivo |
| `archiviato` | boolean | TRUE = obiettivo raggiunto/abbandonato. Storia preservata. |
| `created_at` | timestamp | |

Vista calcolata `secchiello_stats`:
- `accumulato_totale`: somma `allocazione_secchiello.importo`
- `progresso_pct`: se ha target, `accumulato/target * 100`
- `quota_mensile_suggerita`: se ha target+data, `(target - accumulato) / mesi_rimanenti`

#### `allocazione_secchiello` — Quote mensili al secchiello

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `secchiello_id` | uuid | FK |
| `mese` | date | Primo del mese |
| `importo` | numeric | Quota allocata |
| `nota` | text | Es. "3a rata" |

#### `pac_dettaglio` — PAC con tracking costi/rendimento

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `nome` | text | Nome breve es. "Mediolanum Cina" |
| `nome_completo` | text | Nome ufficiale es. "Mediolanum Chinese Road Opportunity L" |
| `isin` | text | Es. "IE00BJYLJ716" |
| `emittente` | text | Es. "Mediolanum International Funds Limited" |
| `categoria_morningstar` | text | Es. "Azionari Paesi Emergenti" |
| `data_apertura` | date | Inizio PAC |
| `versamento_mensile` | numeric | Quota PAC mensile (es. 75 €) |
| `versato_totale` | numeric | Totale versato finora |
| `investito_netto` | numeric | Versato meno costi ingresso |
| `quote_possedute` | numeric | Numero quote |
| `prezzo_medio_carico` | numeric | Prezzo medio per quota |
| `prezzo_quota_corrente` | numeric | Aggiornato manualmente o da API |
| `data_aggiornamento_prezzo` | date | Quando aggiornato l'ultima volta |
| `costo_ingresso_pct` | numeric | Es. 0.03 (3%) |
| `ter_annuo_pct` | numeric | Total Expense Ratio annuo, es. 0.0292 (2,92%) |
| `sri_rischio` | int | 1-7 (Synthetic Risk Indicator) |
| `tipo_quote` | enum | `ACCUMULAZIONE` / `DISTRIBUZIONE` |
| `note` | text | |
| `archiviato` | boolean | TRUE se chiuso/riscattato |

Calcoli derivati (sempre on-the-fly):
- `controvalore = quote_possedute * prezzo_quota_corrente`
- `pl_assoluto = controvalore - versato_totale`
- `pl_percentuale = pl_assoluto / versato_totale`
- `costo_ingresso_anno_corrente = versamento_mensile * 12 * costo_ingresso_pct`
- `costo_gestione_anno_corrente = controvalore * ter_annuo_pct`
- `costo_totale_anno_corrente = costo_ingresso_anno + costo_gestione_anno`
- `incidenza_costi_pct = costo_totale_anno / (versamento_mensile * 12)` ← cifra "shock"
- Badge:
  - VERDE se `incidenza_costi_pct < 0.03`
  - GIALLO se `0.03 ≤ incidenza_costi_pct < 0.05`
  - ARANCIONE se `0.05 ≤ incidenza_costi_pct < 0.08`
  - ROSSO se `incidenza_costi_pct ≥ 0.08`

#### `investimento` — Asset diversi dai PAC (ETF, crypto, azioni one-shot)

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `tipo` | enum | `ETF` / `CRYPTO` / `AZIONE` / `OBBLIGAZIONE` / `ALTRO` |
| `nome` | text | |
| `ticker` | text | Opzionale |
| `quantita` | numeric | |
| `prezzo_medio_carico` | numeric | |
| `prezzo_corrente` | numeric | |
| `data_aggiornamento_prezzo` | date | |
| `note` | text | |
| `archiviato` | boolean | |

#### `scadenza_fiscale` — Calendario fiscale

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `tipo` | enum | `SALDO_IRPEF` / `ACCONTO_IRPEF_1` / `ACCONTO_IRPEF_2` / `INPS_TRIM` / `INPS_ECCEDENZA` / `IVA` / `CCIAA` / `ALTRO` |
| `data_scadenza` | date | |
| `descrizione` | text | Es. "1° Acconto IRPEF 2026" |
| `importo_dovuto` | numeric | Calcolato o inserito |
| `importo_pagato` | numeric | 0 finché non pagato |
| `data_pagamento` | date | NULL se non pagato |
| `note` | text | |

Stato derivato:
- `PAGATA` se `importo_pagato >= importo_dovuto`
- `SCADUTA` se `data_scadenza < oggi` AND non pagata
- `URGENTE` se `data_scadenza` entro 7 gg
- `IN_AVVICINAMENTO` se entro 30 gg
- `FUTURA` altrimenti

### 3.2 Liste enum

```
stato_fattura:    PROGRAMMATO | EMESSO_DA_INCASSARE | INCASSATO
tipo_spesa:       EFFETTIVA | PROGRAMMATA
tipo_inps:        COMMERCIANTE | GESTIONE_SEPARATA
tipo_investimento: ETF | CRYPTO | AZIONE | OBBLIGAZIONE | ALTRO
tipo_scadenza:    SALDO_IRPEF | ACCONTO_IRPEF_1 | ACCONTO_IRPEF_2 |
                  INPS_TRIM | INPS_ECCEDENZA | IVA | CCIAA | ALTRO
tipo_quote_pac:   ACCUMULAZIONE | DISTRIBUZIONE
tema:             LIGHT | DARK | AUTO
```

---

## 4 — MOTORE FISCALE 2026 (CORRETTO E BIFORCATO)

Sezione critica. Tutti i bug noti del v4 e i punti deboli del v5 sono qui corretti.

### 4.1 Glossario

| Termine | Definizione |
|---|---|
| **Lordo** | Importo della fattura, nessuna deduzione |
| **Imponibile (singola fattura)** | `Lordo × Coefficiente_Redditività` |
| **Imponibile YTD** | Somma imponibili di tutte le fatture INCASSATE da Gennaio al mese N incluso |
| **Tasse mese** | `Imponibile_mese × Aliquota` — solo su INCASSATO |
| **INPS Fisso Mensile (Commerciante)** | Quota fissa, **una sola volta al mese, sempre**, anche a zero incassi |
| **INPS Eccedenza Commerciante** | Differenziale: `(MAX(0; YTD_n − soglia) − MAX(0; YTD_(n-1) − soglia)) × 0.24` |
| **INPS Gestione Separata** | `Imponibile_mese × inps_aliquota_gs` (no fisso, no soglia) |
| **Zavorra Fiscale Mese** | `Tasse_mese + INPS_Fisso_mese + INPS_Eccedenza_mese` |
| **Da Accantonare (per fattura)** | `Lordo × (1 − coefficiente×aliquota)` — quota teorica da non spendere. **NON è il netto reale.** |
| **Tax Safe Mese** | `Incassato_mese − Zavorra_mese + Entrate_Nette_pure_mese − Spese_EFFETTIVE_mese − Allocazioni_secchielli_mese`. Può essere negativo (es. Gennaio a zero incassi: −376,78 €). |
| **Saving Rate** | `Allocazioni_secchielli_mese / Incassato_mese`. Wrap in IFERROR per Gennaio 0 incassi. |
| **Punto Zero** | Snapshot liquidità + investimenti al 1° Gennaio anno fiscale corrente. |

### 4.2 Bug del v4 e v5 corretti

| Bug origine | Versione | Correzione v5.1 |
|---|---|---|
| INPS fisso × N° fatture nel mese | v4 | INPS fisso 1 volta al mese |
| INPS fisso solo se ≥1 fattura PAGATA nel mese | v5 | **INPS fisso sempre, anche a zero incassi** (è debito previdenziale che matura comunque). Conseguenza voluta: Gennaio a 0 incassi → Tax Safe negativo, è realtà. |
| INPS eccedenza assente nella zavorra | v4 | Inclusa, con formula differenziale corretta |
| Solo regime Commerciante supportato | v4-v5 | **Biforcazione COMMERCIANTE / GESTIONE_SEPARATA** |
| Accrual fiscali persistiti per riga | v4 | Mai persistiti. Ricalcolati on-the-fly. |
| Coefficiente limitato a 0.78/0.40 | v4 | Tutti i 7 coefficienti ATECO selezionabili |
| INPS fisso 376.78 hardcoded | v4 | Parametrizzato in `profile.inps_fisso_mensile` |
| Doppione colonna Netto | v4 | Una sola colonna "Da Accantonare" |
| Crypto in dashboard fiscale | v4 | Spostato in sezione INVESTIMENTI separata |
| Inserimento retroattivo non aggiorna mesi successivi | v4 | Ricalcolo on-the-fly da zero |

### 4.3 Algoritmo riferimento (TypeScript)

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
      // INPS fisso: SEMPRE, anche a zero incassi (debito previdenziale maturato)
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
      // GS: nessun fisso, percentuale secca su imponibile mese
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

### 4.4 Scenari di test (verifica obbligatoria)

Ogni implementazione deve passare TUTTI questi scenari prima di andare in uso reale.

**Scenario A — Commerciante, sotto soglia, fattura singola**
- Profile: COMMERCIANTE, coeff=0.78, aliquota=0.05, soglia=18808, fisso=376.78
- 1 fattura INCASSATO da 5000 € a Gennaio
- Atteso: imponibile=3900, tasse=195, inps_fisso=376.78, inps_var=0, zavorra=571.78

**Scenario B — Commerciante, due fatture stesso mese**
- 2 fatture INCASSATE da 3000 € a Gennaio
- Atteso: incassato=6000, imponibile=4680, tasse=234, **inps_fisso=376.78** (NON 753.56!), inps_var=0, zavorra=610.78

**Scenario C — Commerciante, superamento soglia a metà anno**
- Fatture 3000 €/mese INCASSATE per 8 mesi (Gen-Ago) con coeff 0.78
- Mese 8: imponibile_YTD=18720 (sotto soglia), inps_var=0
- 9° fattura 3000 € a Settembre: imponibile_YTD=21060
- Eccedenza Settembre: `(21060−18808) − max(0; 18720−18808) = 2252`
- INPS var Settembre: `2252 × 0.24 = 540.48`
- Atteso a Settembre: zavorra = 117 + 376.78 + 540.48 = **1034.26**

**Scenario D — Fattura non incassata = zero accrual**
- 1 fattura `EMESSO_DA_INCASSARE` da 10000 €
- Atteso: incassato=0, tasse=0, inps_var=0
- **Ma `inps_fisso=376.78`** (per Commerciante). Tax Safe negativo se nessuna spesa compensata.

**Scenario E — Inserimento retroattivo**
- Stato: 8 fatture INCASSATE Gen-Ago, riepilogo Settembre già visualizzato
- Aggiungo retroattivamente 1 fattura INCASSATA 5000 € a Marzo
- Atteso: tutto il riepilogo da Marzo in poi viene **ricalcolato da zero**. Nessuno stato YTD persistito.

**Scenario F — Commerciante, zero incassi a Gennaio**
- 0 fatture INCASSATE a Gennaio
- Atteso: incassato=0, imponibile=0, tasse=0, **inps_fisso=376.78**, inps_var=0, **zavorra=376.78**
- Tax Safe Gennaio = `0 − 376.78 − spese − allocazioni_secchielli` → **NEGATIVO**. È realtà fiscale, è giusto così.

**Scenario G — Gestione Separata, sotto qualsiasi soglia (GS non ha soglia)**
- Profile: GESTIONE_SEPARATA, coeff=0.78, aliquota=0.05, aliquota_gs=0.2607
- 1 fattura INCASSATO 5000 € a Gennaio
- Atteso: imponibile=3900, tasse=195, inps_fisso=0, **inps_var=3900×0.2607=1016.73**, zavorra=1211.73

**Scenario H — Gestione Separata, zero incassi**
- 0 fatture INCASSATE
- Atteso: incassato=0, tasse=0, **inps_fisso=0, inps_var=0, zavorra=0**
- Tax Safe = solo spese sottratte. Nessun debito previdenziale maturato (a differenza Commerciante).

**Scenario I — Smezzamento socio**
- COMMERCIANTE, fattura INCASSATA 2000 € con `has_partner=true`, `partner_aliquota=0.26`
- Atteso lato fiscale principale: imponibile=1560, tasse=78, inps_fisso=376.78
- `partner_share` (info al socio): `1000 − (1000 × 0.78 × (0.05 + 0.26)) = 1000 − 241.80 = 758.20 €` da bonificare al socio

---

## 5 — FOGLIO TANGERINE v5 (RUOLO DI EXPORT)

In v5.1 il foglio NON è più mantenuto a mano. È **generato dall'app** su richiesta.

### 5.1 Quando si genera

- Manuale: bottone "Esporta in Google Sheets" nelle Impostazioni
- Automatico (opzionale): cron mensile (1° del mese alle 02:00) che rigenera il foglio dell'anno corrente

### 5.2 Cosa contiene

- 1 foglio `SETUP` (parametri profile in sola lettura)
- 12 fogli `MESE_01`…`MESE_12` con elenco fatture, spese, riepilogo mensile (tutti calcolati, non da modificare)
- 1 foglio `DASHBOARD` con KPI annuali e grafici
- 1 foglio `SCADENZE` con calendario fiscale
- 1 foglio `INVESTIMENTI` con PAC e altri asset
- 1 foglio `CLIENTI` con anagrafica e fatturato per cliente

### 5.3 Implementazione

API Google Sheets v4 + service account. L'app crea/aggiorna lo Sheet e condivide il link.

> **Nota implementativa**: per MVP è accettabile un export in CSV multipli (un .csv per entità) zippato e scaricabile. L'integrazione Google Sheets nativa è feature post-MVP.

---

## 6 — SPECIFICHE PWA TANGERINE

### 6.1 Schermate (tab bar a 5 voci)

| Tab | Schermata principale | Cosa contiene |
|---|---|---|
| 🏠 Casa | Dashboard Mese | KPI mese: incassato, zavorra, Tax Safe, saving rate. Prossime scadenze. |
| 📋 Spese | Lista transazioni | Spese + entrate del mese, con filtri. Swipe per modificare/eliminare. |
| ➕ Quick Add | Bottom sheet | Quick-add spesa (default), toggle a fattura/entrata netta. |
| 📅 Fisco | Scadenze + Anno | Calendario scadenze, dashboard annuale, grafici, imponibile YTD vs soglia. |
| 💰 Patrimonio | Investimenti + Secchielli | PAC con costi, secchielli con progresso, valore totale patrimonio. |

Schermate di profondità (non in tab):
- Impostazioni (profile, tema, esporta dati, anno fiscale, parametri INPS)
- Anagrafica clienti (lista + dettaglio + storico fatture)
- CRUD categorie e sottocategorie
- Dettaglio PAC (con grafico P/L e proiezione costi)
- Dettaglio secchiello (con timeline allocazioni)
- Dettaglio cliente (storico fatturato, delta upselling)

### 6.2 Endpoint REST

```
# Profile
GET    /api/profile
PUT    /api/profile

# Clienti
GET    /api/clienti?attivo=true
POST   /api/clienti
PUT    /api/clienti/:id
DELETE /api/clienti/:id (soft: attivo=false se ha fatture)
GET    /api/clienti/:id/stats

# Fatture
GET    /api/fatture?anno=&mese=&stato=&cliente_id=
POST   /api/fatture
PUT    /api/fatture/:id
DELETE /api/fatture/:id
PATCH  /api/fatture/:id/stato {nuovo_stato, data_incasso?}

# Entrate nette
GET    /api/entrate-nette?anno=&mese=
POST   /api/entrate-nette
PUT    /api/entrate-nette/:id
DELETE /api/entrate-nette/:id

# Spese
GET    /api/spese?anno=&mese=&categoria_id=&tipo=
POST   /api/spese
PUT    /api/spese/:id
DELETE /api/spese/:id

# Categorie e sottocategorie
GET    /api/categorie
POST   /api/categorie
PUT    /api/categorie/:id
DELETE /api/categorie/:id (soft se ha spese)
GET    /api/categorie/:id/sottocategorie
POST   /api/sottocategorie
PUT    /api/sottocategorie/:id
DELETE /api/sottocategorie/:id

# Secchielli
GET    /api/secchielli?archiviato=false
POST   /api/secchielli
PUT    /api/secchielli/:id
DELETE /api/secchielli/:id
POST   /api/secchielli/:id/allocazioni
GET    /api/secchielli/:id/allocazioni?anno=

# PAC
GET    /api/pac?archiviato=false
POST   /api/pac
PUT    /api/pac/:id
DELETE /api/pac/:id
PATCH  /api/pac/:id/prezzo {prezzo_quota_corrente, data}

# Investimenti (non-PAC)
GET    /api/investimenti
POST   /api/investimenti
PUT    /api/investimenti/:id
DELETE /api/investimenti/:id

# Scadenze
GET    /api/scadenze?prossimi_giorni=90
POST   /api/scadenze
PUT    /api/scadenze/:id
PATCH  /api/scadenze/:id/paga {importo, data}

# Dashboard (calcoli on-the-fly)
GET    /api/dashboard/mese/:anno/:mese
GET    /api/dashboard/anno/:anno
GET    /api/dashboard/patrimonio

# Export
POST   /api/export/csv
POST   /api/export/google-sheets (post-MVP)
```

Tutte le mutation validate con **Zod schema condiviso client/server**.

### 6.3 Calcoli sempre on-the-fly

Mai persistere campi calcolati. La GET dashboard ricalcola tutto al volo da fatture grezze + profile. Costo computazionale trascurabile (~500 fatture/anno max).

---

## 7 — STACK TECNICO SEMPLIFICATO

| Layer | Tecnologia | Note |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | No React 19 (non stabile a maggio 2026) |
| Styling | Tailwind CSS 3 | |
| UI components | shadcn/ui (selettivo) | Solo i componenti usati: Button, Card, Input, Select, Sheet, Dialog, Toast, Badge, Tabs |
| Routing | React Router 6 (3-4 route principali) | |
| Forms | HTML form + Zod | No react-hook-form |
| State server | TanStack Query v5 | |
| Icone | Lucide React | |
| Charts | Recharts | Configurabili con assi visibili (vedi sezione 8) |
| Animazioni | Framer Motion (selettivo) | Solo bottom sheet e tab transition |
| Backend | Hono | Più leggero di Express, type-safe |
| Validazione | Zod (schema condiviso) | |
| ORM | Drizzle ORM | |
| Database | Replit PostgreSQL | Niente Supabase (no pause dopo 7gg) |
| Auth | PIN locale 6 cifre + Replit Auth opzionale | No Manus OAuth, no Clerk |
| Hosting | Replit Autoscale | ~15-30 €/anno |
| PWA | manifest.json + service worker minimo | "Aggiungi a Home" su iPhone |
| Font | Inter (self-hosted o Google Fonts) | tabular-nums per numeri |

**Esplicitamente esclusi (non usare)**:
- tRPC → REST puro (più semplice, debuggabile da curl)
- Manus OAuth → PIN o Replit Auth
- Wouter → React Router (più features con poco peso)
- react-hook-form → form nativi
- Supabase → Replit Postgres (no pause)
- shadcn completo → solo componenti necessari

---

## 8 — UX E SCHERMATE (STILE REVOLUT MIGLIORATO)

Stile funzionale Revolut (densità, tab bar, bottom sheet, swipe), identità Tangerine (arancione, leggibilità maggiore, grafici chiari).

### 8.1 Tema e palette

**Toggle**: `LIGHT` / `DARK` / `AUTO` (default AUTO, segue sistema).

**Palette LIGHT**:
- Background: `#FFFFFF`
- Surface (card): `#F7F7F8`
- Border: `#E5E7EB`
- Testo primario: `#0A0A0A`
- Testo secondario: `#6B7280`
- Accento Tangerine: `#F97316` (arancione)
- Successo: `#10B981`
- Warning: `#F59E0B`
- Errore: `#EF4444`

**Palette DARK**:
- Background: `#0A0A0A`
- Surface: `#1A1A1C`
- Border: `#2D2D30`
- Testo primario: `#FAFAFA`
- Testo secondario: `#A1A1AA`
- Accento Tangerine: `#FB923C` (arancione leggermente più chiaro per contrasto)
- Successo, warning, errore: simili

**Categorie spese (colori tenui per icone, non sfondi)**:
- BUSINESS: `#3B82F6` (blu)
- AUTO: `#16A34A` (verde scuro)
- VITA: `#EC4899` (rosa)
- SVAGO: `#EAB308` (giallo)
- INVESTIMENTO: `#8B5CF6` (viola)
- FORMAZIONE: `#14B8A6` (teal)
- SALUTE: `#EF4444` (rosso)

### 8.2 Tipografia

- Font: **Inter** (free, leggibilissimo)
- Numeri: sempre `font-variant-numeric: tabular-nums` per allineamento
- Importi grandi: `font-weight: 700`, dimensione 32-48px
- Body: 16px minimum
- Metadata secondari: 14px minimum
- Mai testo sotto 14px

### 8.3 Componenti chiave

**Tab bar (sempre visibile in basso)**

```
┌──────────────────────────────────────────────────┐
│                                                   │
│   Contenuto schermata                             │
│                                                   │
│                                                   │
├──────────────────────────────────────────────────┤
│  🏠     📋    [ ➕ ]    📅     💰                 │
│  Casa  Spese          Fisco  Patrimonio          │
└──────────────────────────────────────────────────┘
```

- 5 tab con icone Lucide + label
- Tab centrale (➕) è 20% più grande, sfondo arancione Tangerine, sempre in evidenza
- Tab attiva: icona arancione + label arancione
- Altezza tab bar: 64px (88px con safe area iOS)

**Bottom sheet quick-add spesa (apre tap su ➕)**

```
┌──────────────────────────────────────────────────┐
│                                                   │
│  ───── (handle)                                   │
│                                                   │
│              € 0,00                               │ ← input grande
│                                                   │
│  Tastierino numerico custom in-app                │
│  ┌───┬───┬───┐                                   │
│  │ 1 │ 2 │ 3 │                                   │
│  ├───┼───┼───┤                                   │
│  │ 4 │ 5 │ 6 │                                   │
│  ├───┼───┼───┤                                   │
│  │ 7 │ 8 │ 9 │                                   │
│  ├───┼───┼───┤                                   │
│  │ , │ 0 │ ⌫ │                                   │
│  └───┴───┴───┘                                   │
│                                                   │
│  Categorie (scrollabili orizzontale, ultime 3 in evidenza) │
│  [BUSINESS] [SVAGO] [AUTO] [VITA] [INV] ...      │
│                                                   │
│  📅 Oggi (default, tap per cambiare)              │
│  📝 Nota (opzionale)                              │
│                                                   │
│  [          SALVA          ]                      │ ← full-width arancione
└──────────────────────────────────────────────────┘
```

- Toggle in alto per cambiare tipo: Spesa / Fattura / Entrata netta
- Salva → toast verde 2s, bottom sheet si chiude, torna a schermata di prima

**Riga transazione**

- Altezza 64px (più alta di Revolut per leggibilità)
- Layout: `[icona categoria 32x32] [descrizione + categoria · data] [importo grande tabular]`
- Importi spesa: rossi (no segno meno, basta colore)
- Importi entrata: verdi
- Raggruppamento per giorno con header sticky "Oggi · 5 maggio"

**Interazioni riga transazione (opzione B confermata)**

| Gesto | Azione |
|---|---|
| Tap | Apre bottom sheet con dettagli completi (read) + bottoni Modifica/Elimina |
| Swipe sinistra | Elimina con conferma "Annulla" toast 5s (stile Mail iOS) — non popup invasivo |
| Swipe destra | Apre bottom sheet in modalità editing |
| Long press | Menu contestuale: Duplica · Cambia categoria veloce · Sposta a un altro giorno |

**Card KPI dashboard**

- Fondo `surface`, angoli 16px
- Label in alto (testo secondario, 14px, uppercase tracking-wide)
- Numero grande in mezzo (32px, tabular)
- Variazione vs mese precedente in basso (badge verde/rosso con freccia)

### 8.4 Grafici (correzione vs Revolut: massima leggibilità)

Libreria: **Recharts**.

Regole:
- **Assi sempre visibili** (X = mese o data, Y = importo)
- **Griglia tenue ma presente** (`strokeDasharray="3 3"`, opacity 0.3)
- **Label valori sui punti chiave** (max, min, ultimo punto)
- **Tooltip al tap** che mostra valore esatto + delta vs periodo precedente
- **Legenda sempre visibile** in alto, non solo on-hover
- Colori dalla palette categoria
- Mai grafici "decorativi" senza valori leggibili
- Sparkline solo se accompagnate da numero esatto

Grafici minimi nell'app:
1. Dashboard Mese: barre orizzontali "Spese per categoria"
2. Dashboard Anno: linea "Imponibile YTD vs Soglia INPS" (con linea soglia rossa)
3. Dashboard Anno: barre "Saving Rate mensile" (con badge colorato sopra ogni barra)
4. Dashboard Anno: linea multipla "Incassato vs Spese vs Zavorra" 12 mesi
5. Dettaglio PAC: linea "Valore vs Versato" + tooltip P/L per data
6. Dettaglio secchiello: barre cumulative allocazioni mensili

### 8.5 Animazioni

- Spring leggere su tab change (Framer Motion `type: "spring", stiffness: 300, damping: 30`)
- Bottom sheet: slide up con spring
- Toast: fade + slide
- Rispetto `prefers-reduced-motion`: animazioni disabilitate o ridotte

### 8.6 Accessibilità

- Contrasto minimo WCAG AA in entrambi i temi
- Aree tap minime 44x44px
- Etichette ARIA su icone-only buttons
- Focus visibile per navigazione tastiera
- Numeri annunciati correttamente da screen reader (con simbolo €)

---

## 9 — SCADENZE FISCALI E CALENDARIO

### 9.1 Scadenze fisse forfettario 2026

| Tipo | Data | Cosa |
|---|---|---|
| INPS 1° trim (Commerciante) | 16/05/2026 | Fisso trimestrale |
| Saldo IRPEF + 1° Acconto | 30/06/2026 | Tasse anno precedente + 50% acconto |
| INPS 2° trim (Commerciante) | 20/08/2026 | Fisso trimestrale |
| INPS 3° trim (Commerciante) | 16/11/2026 | Fisso trimestrale |
| 2° Acconto IRPEF | 30/11/2026 | 50% acconto |
| INPS 4° trim (Commerciante) | 16/02/2027 | Fisso trimestrale |
| INPS Eccedenza saldo | 30/06 anno succ. | Solo se sopra soglia (Commerciante) |
| INPS Gestione Separata | Mensile/F24 | Solo se tipo_inps=GS — pagamento periodico |

L'app **pre-popola** automaticamente queste scadenze per l'anno corrente (basate su `tipo_inps`), con importi `0` finché non calcolati o inseriti.

### 9.2 Calcolo automatico importi

- **Saldo IRPEF**: `imponibile_anno_precedente × aliquota − acconti_versati`
- **1° e 2° Acconto IRPEF**: `tasse_anno_precedente × 0.50` (regola standard, da affinare con commercialista)
- **INPS Fisso trim**: `inps_fisso_mensile × 3`
- **INPS Eccedenza saldo**: somma `inps_eccedenza_mese` di tutto l'anno
- **INPS GS**: somma mensile imponibile × aliquota_gs

### 9.3 Notifiche

- 30 / 15 / 7 / 1 giorni prima
- Push notification PWA (iOS 16.4+, Android e Desktop ovunque)
- In-app: badge sulla tab "Fisco" con conteggio scadenze imminenti
- Email opzionale (se configurata in Impostazioni)

### 9.4 Stati visuali

- `FUTURA` (>30gg) → grigio
- `IN_AVVICINAMENTO` (8-30gg) → giallo
- `URGENTE` (≤7gg) → arancione
- `SCADUTA` (e non pagata) → rosso pulsante
- `PAGATA` → verde, in fondo alla lista

---

## 10 — INVESTIMENTI, PAC E SECCHIELLI

### 10.1 PAC: il caso "soldi che ti costano molto"

L'app deve essere brutalmente onesta sui costi dei PAC. Per ogni PAC mostrare in card:

```
┌─────────────────────────────────────────────────┐
│  Mediolanum Cina                          🟡    │
│  Azionari Paesi Emergenti · SRI 5/7              │
│                                                  │
│  Controvalore        2.460,26 €                 │
│  Versato totale      2.250,00 €                 │
│  ─────────────────────────────                  │
│  P/L                 +210,26 €  (+9,34%)        │
│                                                  │
│  ⚠️  Costo annualizzato: ~80 €/anno              │
│  (3,7% del versato annuo)                        │
│                                                  │
│  [Vedi dettaglio]                                │
└─────────────────────────────────────────────────┘
```

Badge colore basato su `incidenza_costi_pct` (vedi sezione 3.1).

### 10.2 Esempi concreti dell'utente (popolare al primo accesso)

**PAC 1 — Mediolanum Chinese Road Opportunity L**

```typescript
{
  nome: "Mediolanum Cina",
  nome_completo: "Mediolanum Chinese Road Opportunity L",
  isin: "IE00BJYLJ716",
  emittente: "Mediolanum International Funds Limited",
  categoria_morningstar: "Azionari Paesi Emergenti",
  data_apertura: "2024-10-09",
  versamento_mensile: 75.00,
  versato_totale: 2250.00,
  investito_netto: 2234.85,
  quote_possedute: 458.66,
  prezzo_medio_carico: 4.87,
  prezzo_quota_corrente: 5.364,
  data_aggiornamento_prezzo: "2026-05-05",
  costo_ingresso_pct: 0.03,
  ter_annuo_pct: 0.0292,
  sri_rischio: 5,
  tipo_quote: "ACCUMULAZIONE"
}
```

Calcoli derivati:
- controvalore = 458.66 × 5.364 = **2.460,26 €**
- pl_assoluto = 2460.26 − 2250.00 = **+210,26 €**
- pl_percentuale = +9,34%
- costo_ingresso_anno = 75 × 12 × 0.03 = **27,00 €/anno**
- costo_gestione_anno = 2460.26 × 0.0292 = **71,84 €/anno**
- costo_totale_anno = **98,84 €/anno**
- incidenza_costi_pct = 98.84 / 900 = **10,98%** → badge ROSSO

**PAC 2 — Mediolanum India Opportunities L A**

```typescript
{
  nome: "Mediolanum India",
  nome_completo: "Mediolanum India Opportunities L A Euro",
  isin: "IE000K6M66I3",
  emittente: "Mediolanum International Funds Limited",
  categoria_morningstar: "Azionari Paesi Emergenti",
  data_apertura: "2024-10-09",
  versamento_mensile: 75.00,
  versato_totale: 2250.00,
  investito_netto: 2234.85,
  quote_possedute: 337.011,
  prezzo_medio_carico: 6.63,
  prezzo_quota_corrente: 5.489,
  data_aggiornamento_prezzo: "2026-05-05",
  costo_ingresso_pct: 0.03,
  ter_annuo_pct: 0.0300, // ~3% TER stimato
  sri_rischio: 4,
  tipo_quote: "ACCUMULAZIONE"
}
```

Calcoli derivati:
- controvalore = 337.011 × 5.489 = **1.849,85 €**
- pl_assoluto = 1849.85 − 2250.00 = **−400,15 €**
- pl_percentuale = **−17,78%**
- costo_ingresso_anno = 27,00 €
- costo_gestione_anno = 1849.85 × 0.03 = 55,50 €
- costo_totale_anno = **82,50 €/anno**
- incidenza_costi_pct = 82.50 / 900 = **9,17%** → badge ROSSO

**Riepilogo PAC totale (mostrato in dashboard Patrimonio):**
- Versato totale: 4.500 €
- Controvalore totale: 4.310,11 €
- P/L totale: −189,89 € (−4,22%)
- **Costo totale annuo stimato: ~181 €/anno** (10,1% del versato annuo)
- Avviso: "I tuoi PAC ti costano 181 €/anno in commissioni. Per essere in pari devono rendere almeno il 10% lordo annuo."

### 10.3 Aggiornamento prezzi

- **MVP**: input manuale del `prezzo_quota_corrente` (1 volta al mese, 30 secondi)
- **Post-MVP**: API gratuita per ETF/azioni quotate; per fondi Mediolanum probabilmente sempre manuale (no API pubblica)

### 10.4 Secchielli

- Tipologie tipiche: Fondo Emergenza, Vacanza X, Pensione, Acquisto Casa, Auto Nuova
- CRUD completo
- Target opzionale (importo + data)
- Se ha target: barra progresso + "ti mancano X € in Y mesi → quota mensile suggerita Z €/mese"
- Se non ha target: solo accumulato visualizzato
- Allocazioni mensili: utente le inserisce in QuickAdd (toggle "Allocazione secchiello") o l'app le suggerisce in automatico se `cuscinetto_mensile_automatico` o `pac_mensile_automatico` sono settati

### 10.5 PAC come spesa + allocazione + investimento

Quando l'utente registra "PAC mensile 75 € a Mediolanum Cina", in una sola azione l'app crea:
1. Una `spesa` con categoria INVESTIMENTO, importo 75 €
2. Un'`allocazione_secchiello` (se collegato a un secchiello "PAC Cina")
3. Aggiorna `pac_dettaglio.versato_totale += 75` e `quote_possedute += 75 / prezzo_quota_corrente`

Single source of truth: `spesa` è il record principale, le altre sono derivate/collegate.

---

## 11 — MIGRAZIONE DA EXCEL (ONBOARDING UTENTE ESISTENTE)

L'utente arriva con un foglio Tangerine v4 popolato. Il primo accesso all'app fa l'onboarding.

### 11.1 Wizard onboarding (5 step)

**Step 1 — Setup parametri fiscali**
- Anno fiscale (default 2026)
- Coefficiente ATECO (dropdown 7 valori)
- Aliquota imposta (5% / 15%)
- Tipo INPS (Commerciante / Gestione Separata)
- Se Commerciante: minimale annuo (default 18808), fisso mensile (default 376.78)
- Se GS: aliquota GS (default 26.07%)

**Step 2 — Punto Zero**
- Liquidità al 1° Gennaio anno corrente (manuale)
- Investimenti al 1° Gennaio (manuale)

**Step 3 — Categorie spese**
- Mostra le 7 categorie default
- Permette di aggiungere/rimuovere/rinominare prima di iniziare

**Step 4 — Import dati storici (opzionale)**
- Upload CSV con fatture e spese dell'anno corrente già registrate
- Formato CSV definito e documentato (template scaricabile)
- L'app importa, mostra anteprima, conferma

**Step 5 — Primo PAC (se utente ha investimenti)**
- Form pre-compilato per PAC 1 (l'app suggerisce di importare i 2 Mediolanum se rileva files PRIIP allegati)
- Skippabile

Dopo wizard → dashboard mese corrente popolata e funzionante.

### 11.2 Template CSV import

`fatture.csv`:
```
data_emissione,data_incasso,cliente_nome,descrizione,lordo,stato,has_partner
2026-01-15,2026-02-10,Studio Rossi,Consulenza Gennaio,2500.00,INCASSATO,false
```

`spese.csv`:
```
data,categoria,sottocategoria,descrizione,importo,tipo
2026-04-03,SVAGO,Ristorante,Cena con amici,42.50,EFFETTIVA
```

`pac.csv`:
```
nome,isin,data_apertura,versamento_mensile,versato_totale,quote_possedute,prezzo_medio_carico,prezzo_quota_corrente,ter_annuo_pct,costo_ingresso_pct
Mediolanum Cina,IE00BJYLJ716,2024-10-09,75.00,2250.00,458.66,4.87,5.364,0.0292,0.03
```

---

## 12 — LLM MASTERGUIDE

Da incollare come system prompt o prima sezione in ogni richiesta a un LLM che lavora su Tangerine.

### 12.1 Identità

```
Ruolo: Senior Financial Modeler + Full-stack Engineer specializzato in:
- React + TypeScript + PostgreSQL per PWA personali
- Hono backend, Drizzle ORM, Zod validation
- Diritto tributario italiano per Partite IVA forfettarie
- UX mobile-first stile Revolut migliorato

Tono: Conciso, tecnico, zero preamboli. NO "Certamente!", "Ecco il codice",
"Spero che questo aiuti". Output diretto.

Obiettivo primario: Integrità dei calcoli fiscali sopra ogni scelta estetica.
Se conflitto tra layout/UX e formula corretta, vince la formula.

Lingua codice: TypeScript, identificatori inglesi.
Lingua UI: italiano.
Formule foglio (se generate): sempre `;` come separatore.

Riferimento dati: Prima di generare formule fiscali, consulta sezione 4
(MOTORE FISCALE) di questo documento. Mai usare valori non referenziati a
profile. Mai inventare aliquote o soglie.

Regola crediti: Patch chirurgiche > riscritture. Modifiche < 5 file/funzioni
non richiedono rewrite di file interi.
```

### 12.2 Ordine di consultazione

1. Sezione 1 (Missione + Obiettivi) — verificare che la richiesta sia in scope
2. Sezione 4 (Motore Fiscale) — verificare formule contro scenari di test A-I
3. Sezione 3 (Modello Dati) — usare nomi campi esatti
4. Sezione 8 (UX) — rispettare palette, tipografia, componenti
5. Sezione 13 (Error Handbook) — controllare se il bug è già noto
6. Sezione 14 (Roadmap) — verificare priorità MVP vs Post-MVP

### 12.3 Forbidden List

| ❌ | Motivo |
|---|---|
| Salvare campi fiscali calcolati per riga (`tasse`, `inps_var`) | Bug consistency su inserimenti retroattivi. Calcolare on-the-fly. |
| INPS fisso × N° fatture | Sbagliato. È quota mensile fissa. |
| INPS fisso solo se ≥1 fattura nel mese | Sbagliato. Per Commerciante matura sempre. |
| Hardcoded `0.05`, `0.78`, `376.78`, `0.24`, `18808` | Tutto referenzia profile |
| Inventare soglie/aliquote non in profile | Chiedere all'utente |
| `1/x` non protetto (DIV/0) | IFERROR sempre |
| tRPC, Wouter, react-hook-form, Manus OAuth, Supabase, Clerk | Stack v5.1 li esclude |
| Suggerire App Store / nativo iOS | PWA è la scelta |
| Font diversi da Inter | Inter è standard del progetto |
| Numeri senza `tabular-nums` | Allineamento si rompe |
| Grafici senza assi/label | Sezione 8.4 lo vieta esplicitamente |
| Modal centrali quando è possibile bottom sheet | Bottom sheet preferito su mobile |
| Liste hardcoded di categorie/secchielli/clienti | Tutto CRUD |
| Mescolare investimenti con dashboard fiscale | Sezione separata Patrimonio |
| Calcolare accrual su fatture non INCASSATE | Solo INCASSATO genera accrual fiscali |

### 12.4 Output format

Per modifiche al codice:
- Path file completo
- Diff puntuale, non file intero (a meno che richiesto)
- Specifica se serve update Drizzle schema (e includi la migration)
- Specifica se serve update Zod schema condiviso

Per nuove feature:
1. Verifica che esista nelle sezioni di questo documento
2. Se NO: aggiorna prima questo documento, poi implementa
3. Se tocca calcoli fiscali: aggiungi scenario di test in sezione 4.4
4. Se tocca modello dati: aggiorna sezione 3
5. Se tocca UX: rispetta sezione 8

### 12.5 Quando l'utente chiede una nuova feature

```
1. È in scope (sezione 1 obiettivi)? Se NO → suggerisci di aggiungerla
   come obiettivo o di scartarla come non-obiettivo.
2. Esiste già nel modello dati? Se NO → estendi sezione 3.
3. Tocca il motore fiscale? Se SÌ → aggiungi scenario di test prima di
   scrivere codice.
4. Implementa in piccoli step verificabili.
5. Testa contro scenari esistenti A-I prima di considerare fatto.
```

---

## 13 — ERROR HANDBOOK

| Errore / Sintomo | Causa | Fix |
|---|---|---|
| Tax Safe negativo a Gennaio | INPS fisso accantonato senza incassi | **Comportamento corretto, non bug.** L'INPS è dovuto comunque. UI deve mostrare nota esplicativa. |
| INPS calcolato N volte in un mese | INPS fisso × n° fatture | Usare 1 sola volta per mese (vedi algoritmo 4.3) |
| INPS eccedenza duplicata mese su mese | Manca formula differenziale | Usare `MAX(0, ytd_n − soglia) − MAX(0, ytd_(n-1) − soglia)` |
| Tasse calcolate su fattura non INCASSATA | Manca filtro `stato === 'INCASSATO'` | Filtrare prima del calcolo |
| Fattura inserita retroattivamente non aggiorna mesi successivi | Stato YTD persistito | Ricalcolo on-the-fly da zero |
| `#DIV/0!` in Saving Rate a Gennaio | Incassato=0 | IFERROR / try-catch |
| Coefficiente cambiato a metà anno | Profile aggiornato senza versionamento | UI deve avvisare e impedire (o richiedere conferma esplicita) |
| Fondo PAC mostrato in profitto ma utente perde | Ignorati i costi annualizzati | Mostrare sempre `costo_totale_anno` accanto a P/L |
| Categoria eliminata e spese storiche orfane | Hard delete | Soft delete: `attiva = false`, spese storiche preservate |
| Cliente eliminato con fatture | Hard delete | Soft delete `attivo = false` |
| iOS PWA non riceve notifiche | iOS supporta notifiche PWA solo da 16.4+ e solo se installata da Home Screen | Documentare nel wizard onboarding |
| Replit app va in sleep | Piano gratuito | Usare Replit Autoscale (~15 €/anno) |
| Numeri non allineati nella lista transazioni | Manca tabular-nums | `font-variant-numeric: tabular-nums` su importi |
| Bottom sheet non si chiude su iOS | Manca handler swipe-down | Implementare gesture handler nativo |
| Push notification non arriva su iOS | Browser non in foreground | Service worker deve gestire `push` event correttamente |

---

## 14 — ROADMAP MVP / POST-MVP

### 14.1 MVP — Necessario per "abbandonare Excel"

**Sprint 1 — Fondamenta (1-2 settimane)**
- [ ] Setup progetto: Hono + Drizzle + Postgres + React + Vite
- [ ] Schema DB completo (sezione 3)
- [ ] Auth PIN locale 6 cifre
- [ ] Wizard onboarding (sezione 11.1)
- [ ] Endpoint `profile` GET/PUT

**Sprint 2 — Motore fiscale e CRUD core (1-2 settimane)**
- [ ] Algoritmo `calcolaRiepilogoAnno` con scenari A-I tutti verdi
- [ ] CRUD `fattura` con stati e calcolo on-the-fly
- [ ] CRUD `entrata_netta`
- [ ] CRUD `spesa` + `categoria` + `sottocategoria`
- [ ] CRUD `cliente` con vista stats

**Sprint 3 — UI base (1-2 settimane)**
- [ ] Tab bar 5 voci
- [ ] Schermata Quick Add (bottom sheet, tastierino custom)
- [ ] Lista transazioni con swipe (opzione B)
- [ ] Dashboard Mese con KPI principali
- [ ] Tema light/dark/auto

**Sprint 4 — Fisco e Patrimonio (1-2 settimane)**
- [ ] CRUD `scadenza_fiscale` + pre-popolamento automatico
- [ ] Notifiche PWA scadenze
- [ ] CRUD `secchiello` + `allocazione_secchiello` + progresso
- [ ] CRUD `pac_dettaglio` con calcolo costi annualizzati
- [ ] Dashboard Anno con grafici (sezione 8.4)

**Sprint 5 — Polish e import/export (1 settimana)**
- [ ] Import CSV (fatture, spese, PAC)
- [ ] Export CSV
- [ ] Toast, animazioni, accessibilità
- [ ] PWA manifest + service worker
- [ ] Test fiscale completo contro scenari A-I

**Definition of Done MVP**: l'utente usa l'app per 4 settimane senza aprire Excel e i numeri sono corretti.

### 14.2 Post-MVP

- [ ] Export Google Sheets nativo (API v4)
- [ ] Aggiornamento prezzi automatico per ETF/azioni quotate
- [ ] Ricorrenze (affitto, abbonamenti) — generazione spese automatica
- [ ] OCR scontrini (foto → spesa)
- [ ] Sync banca PSD2 (Tink, Fabrick)
- [ ] Multi-anno: confronto YoY, dashboard storica
- [ ] Smezzamento socio: report PDF da inviare
- [ ] Proiezioni: "se continui così, a Dicembre avrai..."
- [ ] Suggerimenti: "Stai andando verso la soglia INPS, attenzione"

### 14.3 Backlog (non urgente o da rivalutare)

- App nativa iOS (no, salvo evidenza forte)
- Multi-utente / commercialista accesso
- Fatturazione elettronica integrata
- Calcolo F24

---

## 15 — CHANGELOG

| Versione | Data | Modifiche principali |
|---|---|---|
| v1 | 2026-04 | Foglio Tangerine, prima versione |
| v2 | 2026-05 | Fix critici formule, batch writes, foglio CONFIG |
| v3 | 2026-05 | Estensione blocchi, Entrate Nette, secchielli cumulativi |
| v4 | 2026-05 | Stato PROGRAMMATO, dashboard ricca, crypto tracker |
| v4-PWA-bozza | 2026-05 | Bozza PWA con stack overbuilt, motore fiscale buggato (NO PRODUZIONE) |
| v5 | 2026-05 | Doc unico foglio+PWA. Motore fiscale corretto (INPS fisso mensile, ricalcolo on-the-fly). Stack semplificato. |
| **v5.1 (questo doc)** | **2026-05** | **App standalone con foglio come export. Missione e obiettivi O1-O11 espliciti. Non-obiettivi N1-N7. INPS fisso sempre (anche zero incassi). Biforcazione Commerciante/Gestione Separata. Modello dati esteso: clienti con upselling, pac_dettaglio con costi, secchielli con target, CRUD totale. UX dettagliata stile Revolut migliorato (palette, tipografia, tab bar 5 voci, swipe B, grafici leggibili). Esempi PAC Mediolanum Cina/India popolati. Sezione migrazione da Excel. LLM Masterguide aggiornata con forbidden list estesa. Roadmap MVP/Post-MVP. Stati fattura a 3 (PROGRAMMATO/EMESSO_DA_INCASSARE/INCASSATO).** |

---

*Fine documento. Aggiornare a ogni modifica strutturale al progetto. Versionare in git.*
