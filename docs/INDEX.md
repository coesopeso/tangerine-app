# 📚 INDEX — Tangerine PWA v5.2

> **Porta d'ingresso del progetto.** Da qui parte tutto. Ogni file ha uno scopo specifico per minimizzare i token caricati nel contesto LLM.

**Versione progetto:** 5.2
**Aggiornato:** 2026-05-12
**Tipo:** PWA standalone (sostituisce Excel) per Partita IVA forfettaria italiana
**Utente:** Augusto (Artigiani, regime forfettario)
**Stack:** React 19 + Vite + Tailwind 4 + Supabase (Postgres + Auth + Edge Functions Deno) + Vercel + Lucide
**Repo:** `github.com/coesopeso/tangerine-app`

---

## 🗂 Struttura documentale

| File | Quando aprirlo | Token approx |
|---|---|---|
| `MASTERGUIDE.md` | Sempre. Missione, obiettivi, regole globali. **Caricalo per primo in ogni sessione LLM.** | ~2k |
| `LLM_RULES.md` | All'inizio di ogni sessione LLM. Forbidden list, output format, ordine di consultazione. | ~1.5k |
| `ARCHITECTURE.md` | Per decisioni di stack, deployment, integrazione foglio. | ~1.5k |
| `DATA_MODEL.md` | Per modificare DB Supabase, RLS, Zod, payload PostgREST/Edge Function. | ~3k |
| `FISCAL_ENGINE.md` | **Per qualsiasi modifica a calcoli fiscali, INPS, tasse.** Contiene scenari test A-J. | ~3k |
| `API.md` | Per pattern accesso dati: PostgREST (supabase-js) + Edge Functions Deno. | ~1.5k |
| `UX_RULES.md` | Per UI, palette, componenti, grafici, animazioni. | ~2.5k |
| `INVESTMENTS.md` | Per PAC, secchielli, calcoli costi/rendimenti. Esempi Mediolanum. | ~2k |
| `CALENDAR.md` | Per scadenze fiscali, notifiche, calcolo acconti. | ~1k |
| `MIGRATION.md` | Per onboarding utente, import CSV, export foglio. | ~1k |
| `ERROR_HANDBOOK.md` | Quando emerge un bug. Controlla qui prima di indagare. | ~1k |
| `TESTING.md` | Per definire/eseguire test su feature implementata. | ~1.5k |
| `ROADMAP.md` | Per priorità, sprint MVP/Post-MVP. | ~1k |
| `TASKS.md` | Stato task operativi correnti. | dinamico |
| `CHANGELOG.md` | Storico modifiche al progetto. | dinamico |

---

## 🚦 Quick Start per LLM

### Per qualsiasi task

1. Carica `MASTERGUIDE.md` + `LLM_RULES.md` (sempre)
2. Carica i file specifici del task (vedi tabella sotto)
3. Esegui modifica chirurgica
4. Aggiorna `CHANGELOG.md` con entry nuova
5. Se hai aggiunto/modificato test: aggiorna `TESTING.md`
6. Se hai chiuso un task: aggiorna `TASKS.md`

### Mappa task → file da caricare

| Tipo task | File da caricare |
|---|---|
| Modifica calcolo fiscale o INPS | MASTERGUIDE + LLM_RULES + FISCAL_ENGINE + DATA_MODEL + TESTING |
| Nuova Edge Function o nuova tabella esposta via PostgREST | MASTERGUIDE + LLM_RULES + API + DATA_MODEL |
| Nuovo campo DB | MASTERGUIDE + LLM_RULES + DATA_MODEL + API |
| Modifica UI / nuovo componente | MASTERGUIDE + LLM_RULES + UX_RULES |
| Aggiunta PAC / investimento | MASTERGUIDE + LLM_RULES + INVESTMENTS + DATA_MODEL |
| Nuova scadenza / notifica | MASTERGUIDE + LLM_RULES + CALENDAR + DATA_MODEL |
| Bug fix | MASTERGUIDE + LLM_RULES + ERROR_HANDBOOK + file area interessata |
| Onboarding / import CSV | MASTERGUIDE + LLM_RULES + MIGRATION + DATA_MODEL |
| Test / QA | MASTERGUIDE + LLM_RULES + TESTING + file area interessata |

---

## ⚠️ Regole d'oro

1. **MASTERGUIDE è la fonte di verità.** Codice/foglio difformi vanno corretti, non viceversa.
2. **FISCAL_ENGINE è intoccabile senza scenari test.** Qualsiasi modifica deve passare A-J.
3. **DATA_MODEL governa nomi.** Mai cambiarli senza aggiornare API + Zod + UI.
4. **CHANGELOG è obbligatorio** per ogni modifica strutturale.
5. **Mai inventare aliquote, soglie, scadenze fiscali.** Chiedere all'utente o referenziare normativa.

---

## 📦 Storico

- **v5.2 (corrente)** — Stack as-built: Supabase + Vercel + Edge Functions. Augusto come utente di riferimento. Palette Revolut. Stati `PROGRAMMATO/FATTURATO/INCASSATO`. Costo 0 €/anno.
- **v5.1.1** — Patch fiscale allineata Excel (Artigiani, logica socio, `fattura.tipo`).
- **v5.1** — App standalone, foglio diventa export, modello dati esteso, INPS fisso sempre.
- **v5** — Doc unico, motore fiscale corretto, stack semplificato.
- **v4** — Solo foglio Tangerine, Apps Script.

Vedi `CHANGELOG.md` per dettaglio completo.
