# 🛣 ROADMAP — Tangerine PWA v5.1

> MVP necessario per "abbandonare Excel". Post-MVP per nice-to-have. Backlog per ipotesi future.

---

## 🚦 STATO ATTUALE

```
PHASE: SPECIFICATION COMPLETE
NEXT:  MVP SPRINT 1 — Setup progetto + schema DB
```

---

## 🏗 MVP — Sprint plan

### Sprint 1 — Fondamenta (1-2 settimane)

- [ ] Setup progetto Replit: Hono + Drizzle + Postgres + React + Vite (artifact `tangerine-pwa`)
- [ ] Schema DB completo (vedi `DATA_MODEL.md`)
- [ ] Auth PIN locale 6 cifre + lockout
- [ ] Wizard onboarding 5 step (vedi `MIGRATION.md`)
- [ ] Endpoint `profile` GET/PUT
- [ ] Layout shell con tab bar 5 voci

### Sprint 2 — Motore fiscale e CRUD core (1-2 settimane)

- [ ] Algoritmo `calcolaRiepilogoAnno` con scenari A-I tutti verdi (vedi `FISCAL_ENGINE.md`)
- [ ] CRUD `fattura` con stati e calcolo on-the-fly
- [ ] CRUD `entrata_netta`
- [ ] CRUD `spesa` + `categoria` + `sottocategoria`
- [ ] CRUD `cliente` con vista stats

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
- [ ] Test fiscale completo contro scenari A-I
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

1. **Correttezza calcoli fiscali** (scenari A-I)
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
v5.1 — Roadmap 5 sprint MVP, post-MVP prioritizzato
```
