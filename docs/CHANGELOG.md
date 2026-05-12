# 📝 CHANGELOG — Tangerine PWA

> Storia modifiche del progetto. Format: data + entry + scope.

---

## 📐 REGOLE

### Cosa registrare
- Modifiche allo schema dati
- Nuove feature
- Bug fix
- Modifiche al motore fiscale
- Modifiche a UX/UI con impatto strutturale
- Nuovi documenti
- Cambi versione

### Cosa NON registrare
- Refactor cosmetici
- Typo fix
- Riordino interno file
- Conversazioni/decisioni (queste vanno in TASKS o doc relativi)

### Format obbligatorio
```
## YYYY-MM-DD — TASK-XXX (o "doc only")
**Tipo**: <SCHEMA | FEATURE | BUG | DOCS | UX | ARCH>
**Cosa**: descrizione
**File coinvolti**: lista
**Doc aggiornati**: lista
```

---

## 📅 ENTRIES

## 2026-05-12 — v5.1.1 patch fiscale (allineamento Excel)

**Tipo**: SCHEMA / BUG / DOCS
**Cosa**: Allineata la contabilità fiscale dei docs al foglio Excel `new_personal_finance_26.xlsx` (fonte di verità). Correzioni:

1. **Regime INPS**: aggiunto `ARTIGIANI` (default Mauri) accanto a `COMMERCIANTI` e `GESTIONE_SEPARATA`. Stessa formula tra Artig./Comm., default diversi (Artigiani 2026: fisso €384,31/mese, soglia imponibile €18.415).
2. **Logica socio** finalmente codificata correttamente:
   - Flag `con_socio` per fattura (rinominato da `has_partner`)
   - Quota socio simulata = `lordo × coeff × 0.2607`
   - **Si applica SOLO a `tipo=FATTURA_PIVA`**. Mai su `ENTRATA_PRIVATA` anche se flaggata.
   - **Va in secchiello dedicato `QUOTA_SOCIO`**, NON nella zavorra "Da Accantonare"
   - Conguaglio annuale: trattenuto vs tasse reali socio → bonifico differenza
3. **Tabella `entrata_netta` deprecata**: unificata in `fattura.tipo` (`FATTURA_PIVA` | `ENTRATA_PRIVATA`), coerente col foglio (una sola lista entrate con colonna TIPO).
4. **Formula tasse esplicitata**: `lordo × coefficiente × aliquota` (non solo `imponibile × aliquota`).
5. **Scenari test** A-J riallineati ai numeri reali Excel (es. Marzo Mauri: zavorra 435,01 €, quota socio 264,35 € — match esatto).
6. **Seed dati** aggiornato in `MIGRATION.md`: 10 categorie con budget mensile dal foglio SETUP, 6 secchielli user + 2 di sistema (`QUOTA_SOCIO` obbligatorio, `FONDO_TASSE` opzionale).

**File coinvolti**:
- `docs/FISCAL_ENGINE.md` (glossario, bug storici, algoritmo, scenari A-J, regole)
- `docs/DATA_MODEL.md` (profile, fattura, deprecazione entrata_netta, enum, secchielli sistema)
- `docs/MASTERGUIDE.md` (regole fiscali, profile Mauri)
- `docs/MIGRATION.md` (step 1 INPS, categorie, secchielli, CSV fatture)
- `docs/CHANGELOG.md` (questo entry)

**Breaking changes** vs v5.1:
- enum `tipo_inps`: `COMMERCIANTE` → split in `ARTIGIANI` / `COMMERCIANTI`
- `fattura.has_partner` → `fattura.con_socio`
- `fattura.partner_aliquota` → rimosso (ora `profile.inps_aliquota_socio_simulata`)
- nuovo `fattura.tipo` enum (default `FATTURA_PIVA`)
- `entrata_netta` deprecata (migrare righe in `fattura` con `tipo=ENTRATA_PRIVATA`)

---

## 2026-05-12 — TASK-000

**Tipo**: DOCS / ARCH
**Cosa**: Split del documento monolitico `TANGERINE_v5_MASTER.md` in struttura `docs/` modulare. Ogni file ha scopo specifico per minimizzare token caricati nel contesto LLM. Aggiunto `INDEX.md` come bussola con mappa task → file.

**File creati**:
- `docs/INDEX.md`
- `docs/MASTERGUIDE.md`
- `docs/LLM_RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/FISCAL_ENGINE.md`
- `docs/UX_RULES.md`
- `docs/API.md`
- `docs/INVESTMENTS.md`
- `docs/CALENDAR.md`
- `docs/MIGRATION.md`
- `docs/ERROR_HANDBOOK.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`
- `docs/TASKS.md`
- `docs/CHANGELOG.md`

**File rimossi**:
- `TANGERINE_v5_MASTER.md` (sostituito da `docs/`, recuperabile via git)

---

## 2026-05-12 — v5.1 release

**Tipo**: ARCH / FEATURE
**Cosa**: Versione 5.1 del progetto. App standalone diventa strumento principale, foglio diventa export.

**Cambi principali rispetto a v5**:
- App standalone, foglio = export passivo (non più diario parallelo)
- Obiettivi O1-O11 espliciti, Non-obiettivi N1-N7
- INPS fisso accantonato sempre per Commerciante (anche zero incassi)
- Biforcazione `tipo_inps`: COMMERCIANTE / GESTIONE_SEPARATA
- Modello dati esteso:
  - `cliente` con anagrafica + storico + delta upselling
  - `pac_dettaglio` con costi (TER, ingresso, SRI)
  - `secchiello` con target opzionale (importo + data)
  - CRUD totale per categorie/sottocategorie/secchielli/clienti
- Stati fattura a 3: `PROGRAMMATO` / `EMESSO_DA_INCASSARE` / `INCASSATO` (+ `IN_RITARDO` derivato)
- UX dettagliata stile Revolut migliorato:
  - Palette Tangerine (#F97316 / #FB923C)
  - Tab bar 5 voci con + centrale grande arancione
  - Swipe B su transazioni (sx elimina, dx editing)
  - Grafici Recharts con assi sempre visibili
- Esempi PAC Mediolanum Cina + India popolati con calcoli costi
- Sezione migrazione da Excel + template CSV
- Roadmap MVP/Post-MVP a 5 sprint

---

## 2026-05 — v5

**Tipo**: ARCH
**Cosa**: Doc unico foglio + PWA. Motore fiscale corretto (INPS fisso mensile, ricalcolo on-the-fly). Stack semplificato: React + Hono + Drizzle + Replit Postgres.

---

## 2026-05 — v4-PWA-bozza (DEPRECATA)

**Tipo**: ARCH
**Cosa**: Bozza PWA con stack overbuilt (tRPC, Manus OAuth, etc.) e motore fiscale buggato. **Non andata in produzione.**

---

## 2026-05 — v4

**Tipo**: FEATURE
**Cosa**: Stato `PROGRAMMATO`, dashboard ricca, crypto tracker. Foglio Tangerine v4.

---

## 2026-05 — v3

**Tipo**: FEATURE
**Cosa**: Estensione blocchi, Entrate Nette, secchielli cumulativi.

---

## 2026-05 — v2

**Tipo**: BUG / FEATURE
**Cosa**: Fix critici formule, batch writes, foglio CONFIG.

---

## 2026-04 — v1

**Tipo**: PROJECT INIT
**Cosa**: Foglio Tangerine, prima versione.

---

## 📦 TEMPLATE PER NUOVI ENTRY

```markdown
## YYYY-MM-DD — TASK-XXX

**Tipo**: SCHEMA | FEATURE | BUG | DOCS | UX | ARCH
**Cosa**: descrizione concisa
**File coinvolti**:
- file1
- file2
**Doc aggiornati**:
- DATA_MODEL.md
- API.md
**Note**: dettagli rilevanti
```

---

## VERSION

```
v5.1.1 — Allineamento Excel: Artigiani, logica socio, fattura.tipo
```
