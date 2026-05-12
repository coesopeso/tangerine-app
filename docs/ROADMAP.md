# 🛣 ROADMAP — Tangerine PWA v5.2

> MVP necessario per "abbandonare Excel". Post-MVP per nice-to-have. Backlog per ipotesi future.

---

## 🚦 STATO ATTUALE

```
PHASE: REALIGN CODE ↔ DOCS (TASK #1 in corso)
DONE:  Bozza React 19 + Tailwind 4 + Supabase nel repo coesopeso/tangerine-app
       (App.tsx monolitico, 4 tabelle test, design Revolut, no PIN, motore fiscale semplificato)
NOW:   Allineamento docs v5.2 + migrazione schema completo + PIN auth
       + refactor componenti + motore fiscale corretto + Edge Functions + deploy Vercel
```

---

## 🏗 MVP — Sprint plan

### Sprint 1 — Allineamento codice ↔ docs v5.2 (TASK #1, in corso)

- [x] Docs v5.2 allineate (questo step)
- [ ] Migrazione SQL Supabase: drop 4 tabelle test, create ~12 tabelle target con RLS, seed Augusto
- [ ] PIN auth 6 cifre sopra Supabase Auth + lockout
- [ ] Refactor `App.tsx` monolitico in moduli (auth, onboarding, dashboard, entrate, uscite, secchielli, profile)
- [ ] Wizard onboarding 5 step (vedi `MIGRATION.md`)
- [ ] Edge Function `compute-mese` con scenari A-J tutti verdi
- [ ] Verifica match esatto Marzo 2026 Augusto (incassato_piva 1300, tasse 50.70, quota_socio 264.35, INPS 384.31, zavorra 435.01)
- [ ] Deploy Vercel + test multi-device

### Sprint 2 — Estensione CRUD core (post-realign)

- [ ] CRUD `cliente` con vista stats
- [ ] CRUD `categoria` + `sottocategoria` con dropdown e seed
- [ ] CRUD `secchiello` user (oltre a quelli di sistema) con target opzionale
- [ ] Edge Function `conguaglio-socio`
- [ ] Edge Function `compute-anno` con KPI annuali

### Sprint 3 — UI base (1-2 settimane)

- [ ] Bottom sheet Quick Add (tastierino custom)
- [ ] Lista transazioni con swipe (opzione B confermata in `UX_RULES.md`)
- [ ] Dashboard Mese con KPI principali
- [ ] Tema light/dark/auto
- [ ] Toast + animazioni base

### Sprint 4 — Fisco e Patrimonio (1-2 settimane)

- [ ] CRUD `scadenza_fiscale` + pre-popolamento per `tipo_inps` (vedi `CALENDAR.md`)
- [ ] Notifiche PWA scadenze
- [ ] CRUD `secchiello` + `allocazione_secchiello` + progresso
- [ ] CRUD `pac_dettaglio` con calcolo costi annualizzati (vedi `INVESTMENTS.md`)
- [ ] Dashboard Anno con grafici (vedi `UX_RULES.md` sezione grafici)

### Sprint 5 — Polish e import/export (1 settimana)

- [ ] Import CSV (fatture, spese, PAC, clienti, secchielli)
- [ ] Export CSV zippato
- [ ] Accessibilità WCAG AA
- [ ] PWA manifest + service worker + push notifications
- [ ] Test fiscale completo contro scenari A-J
- [ ] Onboarding documentato + screenshots

### Definition of Done MVP

> L'utente usa l'app per **4 settimane senza aprire Excel** e i numeri sono corretti al centesimo.

---

## 🎁 POST-MVP

In ordine di priorità:

- [ ] Export Google Sheets nativo (API v4 + service account)
- [ ] Aggiornamento prezzi automatico per ETF/azioni quotate
- [ ] Ricorrenze (affitto, abbonamenti) — generazione spese automatica
- [ ] Smezzamento socio: report PDF da inviare al partner
- [ ] Proiezioni annuali: "se continui così, a Dicembre avrai…"
- [ ] Suggerimenti contestuali: "Stai andando verso la soglia INPS, attenzione"
- [ ] Multi-anno: confronto YoY, dashboard storica
- [ ] OCR scontrini (foto → spesa)
- [ ] Sync banca PSD2 (Tink, Fabrick)
- [ ] Versioning profile (per cambio aliquota a metà anno)

---

## 🗑 BACKLOG (non urgente o da rivalutare)

- App nativa iOS (no, salvo evidenza forte: PWA è la scelta)
- Multi-utente / commercialista accesso
- Fatturazione elettronica integrata (SDI)
- Calcolo F24 generato direttamente

---

## ⚖️ PRIORITÀ ASSOLUTE

1. **Correttezza calcoli fiscali** (scenari A-J)
2. **Stabilità schema dati** (no breaking changes senza migration)
3. **UX velocità** (quick add <5s, dashboard <3s)
4. **Indipendenza dati** (export sempre disponibile)
5. **Costi annui <30 €**

---

## 🚫 ANTI-CAOS

NON fare:
- Sprint con feature multiple non correlate
- Modifiche allo schema DB senza migration testata
- Refactor durante sprint feature
- Aggiunta dipendenze npm senza valutare alternative leggere
- Decisioni di stack a metà sprint

---

## 🔗 DOCUMENTI CORRELATI

- Tutto deriva da `MASTERGUIDE.md`
- Stato task: `TASKS.md`
- Storia modifiche: `CHANGELOG.md`

---

## VERSION

```
v5.2 — Sprint 1 = realign code↔docs, sprint successivi su Supabase
```
