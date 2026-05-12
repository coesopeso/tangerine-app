# ✅ TASKS — Tangerine PWA v5.2

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
- Split in `docs/` modulare
- Definizione architettura, modello dati, motore fiscale, UX, esempi PAC

---

### TASK-004 (= "Allineamento codice GitHub a docs v5.2")

**Stato**: `IN_PROGRESS`
**Tipo**: REALIGN CODE ↔ DOCS
**Data avvio**: 2026-05-12
**Plan file**: `.local/tasks/realign-code-to-docs-v52.md`

**Obiettivo**: Portare il repo `coesopeso/tangerine-app` in linea con i docs v5.2 (stack Supabase + Vercel + Edge Functions, motore fiscale corretto, PIN auth, wizard onboarding, design Revolut conservato).

**Step**:
1. ✅ Docs v5.2 (questo allineamento)
2. ⏳ Configurazione secrets Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
3. ⏳ Migrazione SQL Supabase (~12 tabelle + RLS + seed Augusto)
4. ⏳ Auth PIN 6-cifre sopra Supabase Auth (anonimo + email upgrade)
5. ⏳ Refactor `App.tsx` in componenti
6. ⏳ Wizard onboarding 5 step
7. ⏳ Motore fiscale corretto (algoritmo `FISCAL_ENGINE.md`)
8. ⏳ Edge Function `compute-mese`
9. ⏳ Verifica scenari A-J (in particolare Marzo 2026 Augusto)
10. ⏳ Deploy Vercel

**Out of scope**: PAC dettaglio, investimenti non-PAC, scadenze fiscali, import CSV, Google Sheets, PWA installabile.

---

### TASK-005 (preview, post realign)

**Stato**: `TODO`
**Tipo**: FEATURE
**Sprint**: post-MVP-1
**Dipende da**: TASK-004

**Obiettivo**: CRUD `cliente` con vista stats (fatturato YTD, ultima fattura, delta upselling).

---

### TASK-006 (preview)

**Stato**: `TODO`
**Tipo**: FEATURE
**Sprint**: post-MVP-1
**Dipende da**: TASK-004

**Obiettivo**: Edge Function `conguaglio-socio` + UI per chiusura annuale secchiello `QUOTA_SOCIO`.

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
v5.2 — TASK-004 realign code↔docs in corso, TASK-001..003 v5.1 (Hono/Drizzle) deprecati
```
