# ✅ TASKS — Tangerine PWA v5.1

> Task operativi correnti. Aggiornare ad ogni cambio stato.

---

## 📐 REGOLE TASK

Ogni task deve avere:
- ID univoco (`TASK-XXX`)
- Obiettivo chiaro
- File/area coinvolta
- Output atteso
- Stato

### Stati validi
```
TODO | IN_PROGRESS | TESTING | DONE | BLOCKED
```

### Regola d'oro
- Task piccoli, modulari, isolati
- Un task = un sistema coinvolto
- Verificabile prima di chiusura

---

## 📋 TASK CORRENTI

### TASK-000

**Stato**: `DONE`
**Tipo**: PROJECT INITIALIZATION
**Data**: 2026-05-12

**Modifiche**:
- Stesura `TANGERINE_v5_MASTER.md` v5.1 monolitico
- Split in `docs/` modulare (questo set)
- Definizione architettura, modello dati, motore fiscale, UX, esempi PAC

**File creati**:
```
docs/INDEX.md
docs/MASTERGUIDE.md
docs/LLM_RULES.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/FISCAL_ENGINE.md
docs/UX_RULES.md
docs/API.md
docs/INVESTMENTS.md
docs/CALENDAR.md
docs/MIGRATION.md
docs/ERROR_HANDBOOK.md
docs/TESTING.md
docs/ROADMAP.md
docs/TASKS.md
docs/CHANGELOG.md
```

**Note**: tutto il sistema documentale è pronto. Prossimo step: avvio MVP Sprint 1.

---

### TASK-001

**Stato**: `TODO`
**Tipo**: SETUP PROGETTO
**Sprint**: MVP-1

**Obiettivo**: Creare artifact Replit `tangerine-pwa` con stack base funzionante.

**Output atteso**:
- Hono backend in `artifacts/tangerine-pwa/src/api/`
- Vite + React frontend in `artifacts/tangerine-pwa/src/`
- Drizzle config + connessione Postgres Replit
- Tailwind + shadcn (componenti base) configurati
- Hello world routing + PIN auth scaffold

**Vincoli**:
- Nessun tRPC, nessun Wouter, nessun react-hook-form (vedi `LLM_RULES.md`)
- Inter font caricato

---

### TASK-002

**Stato**: `TODO`
**Tipo**: DB SCHEMA
**Sprint**: MVP-1
**Dipende da**: TASK-001

**Obiettivo**: Implementare schema DB completo Drizzle.

**File coinvolti**:
- `artifacts/tangerine-pwa/src/db/schema.ts`
- `artifacts/tangerine-pwa/src/db/migrations/`

**Output atteso**:
- Tutte le tabelle di `DATA_MODEL.md` create
- Enum tipizzati
- Indici consigliati
- Migration 0001 applicata
- Seed con 7 categorie default

---

### TASK-003

**Stato**: `TODO`
**Tipo**: FISCAL ENGINE
**Sprint**: MVP-2
**Dipende da**: TASK-002

**Obiettivo**: Implementare `calcolaRiepilogoAnno` + far passare scenari A-I.

**File coinvolti**:
- `artifacts/tangerine-pwa/src/lib/fiscal/calcolaRiepilogoAnno.ts`
- `artifacts/tangerine-pwa/src/lib/fiscal/__tests__/`

**Output atteso**:
- Funzione tipata come da `FISCAL_ENGINE.md`
- 9 test (A-I) tutti verdi con Vitest
- Esportata e usabile dagli endpoint dashboard

---

## 📦 TEMPLATE PER NUOVI TASK

```markdown
### TASK-XXX

**Stato**: TODO
**Tipo**: <SETUP | FEATURE | BUG_FIX | REFACTOR | DOCS>
**Sprint**: <MVP-N | POST-MVP>
**Dipende da**: <TASK-YYY>

**Obiettivo**: <una riga>

**File coinvolti**:
- path/to/file

**Output atteso**:
- punto 1
- punto 2

**Vincoli**:
- vincolo 1
```

---

## VERSION

```
v5.1 — Foundation tasks, ready for MVP Sprint 1
```
