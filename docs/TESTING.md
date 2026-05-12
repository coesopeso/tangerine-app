# 🧪 TESTING — Tangerine PWA v5.2

> Protocolli di validazione. Zero tolleranza bug nei calcoli fiscali.

---

## 📐 REGOLE DI TESTING

### 1. Test isolati
Ogni test valida:
- una singola funzione
- un singolo modulo
- un singolo scenario specifico

### 2. Ordine di validazione rigido
Non procedere se il precedente fallisce. Ordine:
1. Validazione Zod input
2. Funzioni motore fiscale (scenari A-J) — testabili in puro TypeScript senza DB
3. Edge Functions (`compute-mese`, `compute-anno`, `conguaglio-socio`) — happy path + error cases
4. RLS Supabase: utente A non vede dati utente B
5. UI integration test (componenti critici)
6. E2E flows (wizard onboarding, quick add, dashboard, multi-device login)
7. Stress test (edge cases)

### 3. Zero tolleranza
Il sistema NON è validato finché ci sono:
- Errori `#VALUE!` / `#REF!` / `#DIV/0!` (in foglio export)
- Test motore fiscale falliti
- Console errors in browser
- TypeScript errors
- Lint warnings non motivate

---

## 🧮 FASE 1 — MOTORE FISCALE (priorità assoluta)

Tutti gli scenari A-J in `FISCAL_ENGINE.md` devono passare.

### Suite test consigliata

```typescript
// src/lib/fiscal/__tests__/calcolaRiepilogoAnno.test.ts
import { describe, it, expect } from 'vitest';
import { calcolaRiepilogoAnno } from '../calcolaRiepilogoAnno';

describe('FISCAL ENGINE — Scenari A-J', () => {
  it('Scenario A: Artigiani singola fattura P.IVA sotto soglia', () => {
    const profile = {
      anno_fiscale: 2026,
      coefficiente_redditivita: 0.78,
      aliquota_imposta: 0.05,
      tipo_inps: 'ARTIGIANI' as const,
      inps_minimale_annuo: 18415,
      inps_fisso_mensile: 384.31,
      inps_aliquota_eccedenza: 0.24,
      inps_aliquota_gs: 0.2607,
      inps_aliquota_socio_simulata: 0.2607,
    };
    const fatture = [{
      data_incasso: new Date('2026-01-15'),
      lordo: 5000,
      stato: 'INCASSATO' as const,
      tipo: 'FATTURA_PIVA' as const,
      con_socio: false,
    }];

    const r = calcolaRiepilogoAnno(fatture, profile);
    expect(r[0].imponibile_mese).toBe(3900);
    expect(r[0].tasse_mese).toBe(195);
    expect(r[0].inps_fisso_mese).toBe(384.31);
    expect(r[0].inps_eccedenza_mese).toBe(0);
    expect(r[0].zavorra_fiscale_mese).toBeCloseTo(579.31, 2);
    expect(r[0].quota_socio_mese).toBe(0);
  });

  // Scenari B-J analoghi, vedi FISCAL_ENGINE.md
  // Scenario I (Marzo Augusto) è il regression test principale: zavorra=435.01, quota_socio=264.35
});
```

---

## 🌐 FASE 2 — EDGE FUNCTIONS + RLS

### Per ogni Edge Function (`compute-mese`, `compute-anno`, `conguaglio-socio`, `auth-pin-*`)
- [ ] Happy path con payload valido
- [ ] Validation Zod fallisce su payload sbagliato → 400
- [ ] Auth: 401 senza JWT, 403 se RLS blocca
- [ ] Numeri identici al test unitario di `calcolaRiepilogoAnno` (no drift client/edge)

### Per RLS
- [ ] Utente A non vede `fattura` / `spesa` / `secchiello` di utente B
- [ ] INSERT con `user_id` falsificato → 403
- [ ] Soft delete: cliente con fatture → `attivo=false`, fatture preservate

### Tool consigliato
- Vitest + `@supabase/supabase-js` su istanza locale (`supabase start`) o branch DB di test

---

## 🎨 FASE 3 — UI

### Componenti critici da testare

| Componente | Test |
|---|---|
| Bottom sheet QuickAdd | Apre/chiude, tastierino digit, salva spesa, errore se importo 0 |
| Riga transazione | Tap → dettagli, swipe sx → elimina toast, swipe dx → editing |
| Tab bar | Cambio tab, badge scadenze imminenti |
| Dashboard mese | KPI corretti per dati mock, grafici renderizzati |
| Dashboard anno | YTD vs soglia, saving rate per mese |
| Card PAC | Badge colore corretto per `incidenza_costi_pct` |

### Tool consigliato
- React Testing Library + Vitest

---

## 🚶 FASE 4 — E2E

### Flow critici

| Flow | Steps |
|---|---|
| Onboarding | Wizard 5 step → dashboard popolata |
| Quick add spesa | Tap +, importo, categoria, salva, vedo in lista |
| Quick add fattura INCASSATO | Stessa flow + stato → vedo accantonamento aggiornato |
| Cambio stato fattura | FATTURATO → INCASSATO → vedo tasse e INPS scattare |
| Login multi-device | Setup PIN su device 1 → email magic link su device 2 → stesso PIN sblocca → stessi dati |
| Aggiungi PAC | Form, vedo card con badge |
| Aggiorna prezzo PAC | Patch endpoint, vedo P/L cambiato |
| Notifica scadenza | Mock data 7gg → vedo URGENTE |

### Tool consigliato
- Playwright via skill `testing` (`runTest()`)

---

## 🌪 FASE 5 — STRESS TEST (edge cases)

| Scenario | Comportamento atteso |
|---|---|
| Mese a zero entrate, Commerciante | Tax Safe negativo (= INPS fisso). NO crash. |
| Mese a zero entrate, GS | Zavorra=0. Tax Safe = solo spese sottratte. |
| Inserimento retroattivo a Marzo, oggi è Settembre | Riepilogo Apr-Set ricalcolato |
| 100 fatture stesso mese | Performance accettabile (<200ms calcolo) |
| Importo decimale con virgola italiana ("1.234,56") | Parsato a 1234.56 |
| PAC con quote 0 | Controvalore=0, no crash |
| Cliente con 0 fatture | Stats tutti a 0 |
| Categoria eliminata con 50 spese collegate | Soft delete, spese intatte |
| Cambio anno fiscale | Tutto resettato al nuovo anno |
| Profile cambiato a metà anno | Conferma + warning su impatto |

---

## ✅ CHECKLIST PRE-RELEASE

Prima di considerare l'MVP concluso:

- [ ] Tutti gli scenari A-J in `FISCAL_ENGINE.md` passano
- [ ] Tutte le Edge Functions hanno test happy + error
- [ ] RLS testata: nessuna leak cross-utente
- [ ] Zero TypeScript errors
- [ ] Zero console errors in produzione
- [ ] Wizard onboarding testato end-to-end
- [ ] Quick add spesa <5 secondi (cronometrato)
- [ ] Dashboard renderizza in <300ms con 500 fatture
- [ ] PWA installabile su iOS Safari + Chrome Android
- [ ] Tema light/dark/auto funzionante
- [ ] Notifiche scadenze funzionanti su almeno una piattaforma
- [ ] Export CSV produce file ri-importabile (round-trip OK)
- [ ] Documentazione `docs/` allineata al codice

---

## 🔗 DOCUMENTI CORRELATI

- Algoritmo + scenari: `FISCAL_ENGINE.md`
- Bug noti: `ERROR_HANDBOOK.md`
- Roadmap MVP: `ROADMAP.md`

---

## VERSION

```
v5.2 — Test fiscali + Edge Functions + RLS Supabase, scenari A-J
```
