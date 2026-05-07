# REGOLE DI SVILUPPO: PROGETTO "TANGERINE"
## Contratto Operativo per l'AI (Manus / Gemini)

Questo documento stabilisce le regole inviolabili per lo sviluppo della Progressive Web App (PWA) **Tangerine**. Qualsiasi modifica al codice, aggiunta di funzionalità o correzione di bug deve rigorosamente aderire a queste linee guida.

---

### 1. Fonti di Verità (SSOT)
L'AI deve consultare i file presenti nella cartella `tangerine_context/` prima di ogni operazione:
*   **Logica Fiscale:** Fare riferimento a `FISCAL_ENGINE.md`. Nessuna allucinazione matematica è permessa.
*   **Specifiche Tecniche:** Seguire l'architettura e lo schema database definiti in `TECHNICAL_SPEC.md`.
*   **Verifica:** Testare ogni calcolo contro gli scenari definiti in `FISCAL_ENGINE.md`.

---

### 2. Principi di Sviluppo (Senior Dev Approach)
1.  **Modularità:** Scrivere componenti React piccoli, riutilizzabili e ben commentati.
2.  **Sicurezza (Vault):** Implementare Row Level Security (RLS) su Supabase per ogni tabella. I dati devono essere accessibili solo all'utente autenticato.
3.  **Privacy (Stealth):** L'app deve funzionare come PWA (installabile da browser) e non richiedere pubblicazione su App Store.
4.  **Costo Zero:** Utilizzare esclusivamente i piani gratuiti di Supabase e Vercel.

---

### 3. Workflow Operativo (Manus WebDev)
*   **Generazione UI:** Creare interfacce pulite con TailwindCSS.
*   **Logica Fiscale:** Procedere per piccoli passi (iterativo). Ogni funzione di calcolo deve essere verificata manualmente dall'utente.
*   **Database:** Usare le tabelle e i tipi definiti in `TECHNICAL_SPEC.md`.
*   **Nuove Feature:** Prima di aggiungere una funzione (es. inserimento manuale spese), aggiornare `TECHNICAL_SPEC.md` e `FISCAL_ENGINE.md`.

---

### 4. Verifica e Test
Ogni funzione critica, specialmente il "Net-Split Engine", deve essere accompagnata da una spiegazione passo-passo del calcolo effettuato per permettere la verifica manuale da parte dell'utente.

---

**NOTA PER L'AI:** Se una richiesta dell'utente entra in conflitto con queste regole (es. calcoli fiscali errati o architetture costose), l'AI deve segnalare il conflitto e suggerire la correzione basata sulla documentazione ufficiale del progetto.
