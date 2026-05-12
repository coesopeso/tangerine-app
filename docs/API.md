# 🌐 API — Tangerine PWA v5.2

> Pattern accesso dati: **Supabase JS** per CRUD diretto + **Edge Functions Deno** per logica fiscale. Tutte le mutation validate con **Zod** condiviso client/edge function.

---

## 🔑 PRINCIPI

- CRUD diretto via `supabase-js` (PostgREST sotto il cofano), Row Level Security obbligatoria su ogni tabella
- Logica fiscale (tasse, INPS, quota socio, conguaglio) dentro **Edge Functions** così i numeri sono identici su ogni device e si correggono con un solo deploy
- **Calcoli sempre on-the-fly**, mai persistere campi calcolati
- Auth: Supabase Auth (account anonimo o email) + PIN 6-cifre come secondo fattore locale
- Mutation validate con Zod prima di toccare il DB

---

## 🗃 ACCESSO DATI VIA `supabase-js`

Pattern standard CRUD. Non servono endpoint REST custom: PostgREST espone le tabelle con permessi controllati da RLS.

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Esempi
```typescript
// LIST con filtri
const { data, error } = await supabase
  .from('fattura')
  .select('*, cliente(nome)')
  .eq('stato', 'INCASSATO')
  .gte('data_incasso', '2026-03-01')
  .lte('data_incasso', '2026-03-31');

// INSERT (validato Zod prima)
const parsed = FatturaInsertSchema.parse(input);
const { data, error } = await supabase.from('fattura').insert(parsed).select().single();

// UPDATE
await supabase.from('fattura').update({ stato: 'INCASSATO', data_incasso: today }).eq('id', id);

// SOFT DELETE
await supabase.from('cliente').update({ attivo: false }).eq('id', id);
```

### Tabelle accessibili via PostgREST

| Tabella | RLS policy |
|---|---|
| `profile` | SELECT/UPDATE solo `user_id = auth.uid()` |
| `cliente`, `fattura`, `spesa`, `categoria`, `sottocategoria`, `secchiello`, `allocazione_secchiello`, `pac_dettaglio`, `investimento`, `scadenza_fiscale` | SELECT/INSERT/UPDATE/DELETE solo se `user_id = auth.uid()` |
| `auth_pin` | SELECT/UPDATE solo `user_id = auth.uid()` |

---

## ⚡ EDGE FUNCTIONS (logica fiscale)

Ogni Edge Function:
- Riceve `Authorization: Bearer <jwt>` automaticamente dal client `supabase-js`
- Carica profile + fatture/spese del periodo richiesto
- Esegue il calcolo deterministico in `FISCAL_ENGINE.md`
- Ritorna JSON tipizzato

### `POST /functions/v1/compute-mese`
Body: `{ anno: number, mese: number }`
Risposta: vedi *Risposta dashboard mese* sotto.

### `POST /functions/v1/compute-anno`
Body: `{ anno: number }`
Risposta: array di 12 `RiepilogoMese` + KPI annuali (imponibile_ytd, totale_zavorra, saving_rate annuo, totale_quota_socio).

### `POST /functions/v1/conguaglio-socio`
Body: `{ anno: number, tasse_reali_socio: number }`
Risposta: `{ totale_trattenuto, delta, azione: 'BONIFICO_AL_SOCIO' | 'RICHIESTA_INTEGRAZIONE' | 'PAREGGIO' }`. Azzera il secchiello `QUOTA_SOCIO` per l'anno indicato.

### Chiamata client
```typescript
const { data, error } = await supabase.functions.invoke('compute-mese', {
  body: { anno: 2026, mese: 3 },
});
```

---

## 🔐 AUTH

### `POST /functions/v1/auth-pin-setup`
Primo avvio. Body: `{ pin: string }` → hash bcrypt salvato in `auth_pin`. Crea account anonimo se non esiste.

### `POST /functions/v1/auth-pin-verify`
Body: `{ pin: string }` → confronto hash, gestione lockout (5 tentativi → 5 minuti). In successo restituisce ok=true (la sessione Supabase è già attiva via JWT in storage).

### Multi-device
- Su nuovo device: l'utente inserisce email → riceve magic link Supabase → upgrade da anonimo a email-based → setta lo stesso PIN.
- Documentato in `MIGRATION.md` step "Aggiungi questo dispositivo".

---

## 📦 PAYLOAD STANDARD

### Risposta `compute-mese`
```typescript
{
  mese: number,
  anno: number,
  incassato_piva: number,           // solo FATTURA_PIVA INCASSATO
  incassato_privato: number,        // ENTRATA_PRIVATA INCASSATO
  imponibile_mese: number,
  imponibile_ytd: number,
  tasse_mese: number,
  inps_fisso_mese: number,
  inps_eccedenza_mese: number,
  zavorra_fiscale_mese: number,     // tasse + inps_fisso + inps_eccedenza (NO socio)
  quota_socio_mese: number,         // simulata, va in secchiello QUOTA_SOCIO
  spese_effettive_mese: number,
  allocazioni_secchielli_mese: number,
  tax_safe_mese: number,
  saving_rate: number,
  prossime_scadenze: ScadenzaFiscale[]
}
```

### Errori
```typescript
{
  error: string,        // codice machine-readable es. "VALIDATION_FAILED"
  message: string,      // messaggio UI italiano
  field?: string,
  details?: unknown     // debug only
}
```

HTTP status:
- 200 — OK
- 201 — Created (PostgREST su INSERT)
- 400 — Validation error (Zod)
- 401 — JWT mancante/scaduto
- 403 — RLS policy violata
- 404 — Not found
- 409 — Conflict (FK violata, soft-delete impossibile)
- 500 — Errore Edge Function

---

## 🧪 PRE-MERGE CHECK

- Tutte le mutation client passano per uno schema Zod
- Tutti i campi numerici arrivano come `number`, non string
- Date serializzate ISO 8601 (Postgres `date` / `timestamptz`)
- RLS attiva e testata: utente A non vede dati utente B
- Edge Function `compute-mese` testata sui scenari A-J di `FISCAL_ENGINE.md`
- Soft delete testato per cliente/categoria/secchiello con record collegati

---

## 🔗 DOCUMENTI CORRELATI

- Schema dati: `DATA_MODEL.md`
- Calcoli dashboard: `FISCAL_ENGINE.md`
- Stack: `ARCHITECTURE.md`

---

## VERSION

```
v5.2 — Supabase JS + Edge Functions, niente Hono, RLS obbligatoria
```
