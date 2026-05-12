# Supabase migrations — Tangerine PWA v5.2

Source of truth: `docs/DATA_MODEL.md` v5.2.

Il codice applicativo vero vive nel repo `coesopeso/tangerine-app` e si
collega a un progetto Supabase (vedi `docs/MASTERGUIDE.md`). Questa cartella
contiene lo schema versionato da applicare a quel progetto.

## File

- `20260512000000_initial_schema_v52.sql`
  Schema iniziale completo: 13 tabelle (`profile`, `cliente`, `categoria`,
  `sottocategoria`, `fattura`, `spesa`, `secchiello`,
  `allocazione_secchiello`, `pac_dettaglio`, `investimento`,
  `scadenza_fiscale`, `push_subscription`, `auth_pin`), 8 enum, 2 viste
  calcolate, RLS owner-only su tutte le tabelle, trigger
  `on_auth_user_created` che pre-popola profilo Augusto (Artigiani 2026:
  coeff 0.78, aliquota 5%, INPS fisso €384,31, soglia €18.415, eccedenza
  24%, socio simulato 26,07%), 10 categorie default e i due secchielli di
  sistema `QUOTA_SOCIO` / `FONDO_TASSE`.

## Come applicare

⚠️ La sezione `0. DROP TABELLE DI TEST` rimuove le 4 tabelle pre-v5.2
nello schema `public`. Eseguire **solo dopo conferma esplicita** che i
dati attuali sono di test.

### Opzione A — Supabase CLI

```bash
supabase link --project-ref <ref>
supabase db push
```

### Opzione B — SQL Editor della Dashboard

Copiare il contenuto del file in Supabase Studio → SQL Editor → Run.

## Verifica post-deploy

1. Le 13 tabelle esistono in `public` (controllare in Table Editor).
2. RLS è "Enabled" su ognuna (icona lucchetto chiusa).
3. Creando un utente in Auth, dopo qualche secondo `profile`, `categoria`
   (10 righe) e `secchiello` (2 righe sistema) sono popolati per quel
   `user_id`.
4. Provando a leggere `public.fattura` da una sessione di un altro utente
   → 0 righe restituite.
5. Le viste `cliente_stats` e `secchiello_stats` sono dichiarate
   `WITH (security_invoker = true)`: ereditano la RLS owner-only delle
   tabelle base, quindi non possono leakare dati tra tenant.
