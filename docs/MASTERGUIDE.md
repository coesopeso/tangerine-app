# 🧭 MASTERGUIDE — Tangerine PWA v5.1

> **Caricare per primo in ogni sessione LLM.** Questo file contiene missione, obiettivi, regole globali. Tutto il resto deriva da qui.

---

## 🎯 MISSIONE

Tangerine è lo strumento personale che permette a un freelance forfettario italiano di sapere ogni giorno, in 3 secondi, quanto può davvero spendere senza compromettere tasse, INPS e obiettivi di risparmio. **Sostituisce completamente il foglio Excel** per la gestione quotidiana, lasciandolo solo come export di backup.

---

## 🏆 OBIETTIVI PRIMARI (in priorità)

| # | Obiettivo | Significa |
|---|---|---|
| **O1** | Verità fiscale al centesimo | Mai un calcolo sbagliato. Dubbi interpretativi dichiarati, non nascosti. |
| **O2** | Sostituire Excel completamente | Dopo 1 mese, l'utente non apre più il foglio per la gestione. |
| **O3** | Inserimento spesa in 3 tap | Importo → categoria → conferma. <5 secondi. Caso d'uso n.1. |
| **O4** | Dashboard leggibile a colpo d'occhio | Aprendo l'app: incassato mese, da accantonare, Tax Safe. Senza scroll. |
| **O5** | Calendario fiscale con notifiche | 30/15/7/1 giorni prima di ogni scadenza. Niente sorprese. |
| **O6** | CRUD totale | Categorie, sottocategorie, secchielli, clienti, entrate, uscite. Niente liste hardcoded. |
| **O7** | Distinzione netta programmato vs effettivo | Per entrate (3 stati) e spese (2 stati). Solo effettivo entra nei calcoli fiscali. |
| **O8** | Tracking investimenti completo | PAC con TER, costi, SRI, costo annualizzato in €. L'app deve "gridare" se i costi sono alti. |
| **O9** | Anagrafica clienti con storico e upselling | Lista, fatturato per cliente, delta vs ultima fattura. |
| **O10** | Indipendenza e portabilità dati | Export CSV in qualsiasi momento. Spostabile altrove in 1 giorno. |
| **O11** | Costo annuo trascurabile | <30 €/anno totali. No App Store, no abbonamenti. |

---

## 🚫 NON-OBIETTIVI

| # | Non facciamo | Perché |
|---|---|---|
| **N1** | App per società di capitali / commercialisti | Solo forfettario, una P.IVA, una persona |
| **N2** | App multi-utente / sociale | Solo me. Lo smezzamento socio è un calcolo, non un account. |
| **N3** | App di trading | Tracking, non analisi. Niente alert compra/vendi. |
| **N4** | Sync banca PSD2 in v1 | Inserimento manuale o copia statement. v2 eventuale. |
| **N5** | App nativa iOS/Android | PWA installabile. No App Store, no 99$/anno Apple. |
| **N6** | Sostituto del commercialista | Per dichiarazione finale → commercialista. App = pianificazione. |
| **N7** | Budget app generalista | Focus regime forfettario italiano, ottimizzato per quello. |

---

## 📐 REGOLE GLOBALI (valgono ovunque)

### Linguistiche
- **UI**: italiano. **Codice**: TypeScript inglese. **Commenti**: italiano se utili.
- **Foglio**: formule italiane separatore `;` (es. `=SOMMA.SE(...;...;...)`). Mai `,`.

### Tecniche
- **Mai hardcoded** parametri fiscali. Sempre da `profile` (DB) o `SETUP` (foglio).
- **Mai persistere** campi calcolati (tasse, inps_var). Sempre on-the-fly da fatture grezze + profile.
- **Mai inventare** aliquote, soglie, scadenze. Chiedere o referenziare normativa.
- **Patch chirurgica > riscrittura.** Modifiche < 5 file/funzioni non richiedono rewrite.

### Fiscali
- **Principio di Cassa**: tasse e INPS variabile solo su `stato = INCASSATO`.
- **Eccezione INPS Fisso (Commerciante)**: matura sempre, anche con zero incassi.
- **Single Source of Truth**: questo set di documenti. Codice/foglio difformi vanno corretti.

---

## 📊 METRICHE DI SUCCESSO

- ≥1 spesa registrata al giorno per ≥80% dei giorni del mese
- A fine mese il dato app combacia col foglio entro 1 €
- Sorprese fiscali a giugno/novembre: zero
- Tempo medio inserimento spesa: <5 secondi
- Tempo medio per leggere stato finanziario: <3 secondi dall'apertura
- Dopo 2 mesi: il foglio Excel non viene più aperto se non per export

---

## 🔗 LINK A DOCUMENTI CORRELATI

- **Architettura, stack tecnico** → `ARCHITECTURE.md`
- **Modello dati DB** → `DATA_MODEL.md`
- **Calcoli fiscali e scenari test** → `FISCAL_ENGINE.md`
- **UI, palette, componenti** → `UX_RULES.md`
- **Endpoint REST** → `API.md`
- **PAC e secchielli** → `INVESTMENTS.md`
- **Scadenze fiscali** → `CALENDAR.md`
- **Onboarding e import** → `MIGRATION.md`
- **Bug noti** → `ERROR_HANDBOOK.md`
- **Test protocols** → `TESTING.md`
- **Roadmap** → `ROADMAP.md`
- **Regole specifiche LLM** → `LLM_RULES.md`

---

## VERSION

```
v5.1 — Master Architecture, app standalone
```
