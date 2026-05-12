# Tangerine v5.2

PWA personale per la gestione fiscale di Augusto (forfettario artigiano).
Stack: **React 19 + Vite + Tailwind 4** lato client, **Supabase** (Postgres + Auth + Edge Functions Deno) lato dati e logica fiscale, **Vercel** per l'hosting. Costo target: **0 €/anno**.

## Architettura

- **PIN 6-cifre sopra Supabase Auth**. Al primo avvio l'app crea un account anonimo (`signInAnonymously`) e lega un PIN bcrypt salvato nella tabella `auth_pin`. Il PIN gestisce 5 tentativi → 5 minuti di lockout server-side, così l'aggressore non aggira il blocco svuotando lo storage.
- **Cross-device**: l'utente collega un'email all'account anonimo, riceve il magic-link sul nuovo device, ri-imposta lo stesso PIN. Stessi dati ovunque.
- **Logica fiscale**: la sorgente di verità è il motore client in `src/lib/fiscal.ts` (modello Netto Lordo / Tax-safe con secchielli TAX vs DISCRETIONARY), validato dai test in `src/lib/fiscal.test.ts`. Le Edge Function `compute-anno` e `conguaglio-socio` girano ancora sul motore legacy in `supabase/functions/_shared/fiscal.ts`: è sicuro perché FiscoScreen consuma solo i campi aggregati (zavorra, tasse, INPS, quota socio, allocato, imponibile YTD) che coincidono fra i due modelli. La vecchia `compute-mese` è stata rimossa nel maggio 2026 perché non più referenziata e non allineata al nuovo modello.
- **Row Level Security** su tutte le tabelle (`user_id = auth.uid()`).

## Setup Supabase

1. Crea un progetto su <https://supabase.com> (free tier).
2. SQL Editor → incolla `supabase/migrations/0001_init.sql` ed esegui.
3. Auth → Providers → abilita "Anonymous sign-ins" e "Email (magic link)".
4. Deploy delle Edge Function:
   ```bash
   supabase functions deploy compute-anno
   supabase functions deploy conguaglio-socio
   supabase functions deploy auth-pin-setup
   supabase functions deploy auth-pin-verify
   ```
5. Imposta le variabili d'ambiente (in locale `.env` di questa app, su Vercel le Project Settings):
   ```
   VITE_SUPABASE_URL=https://<id>.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
6. Riavvia. Senza queste env la SetupScreen ti ricorda i passi.

## Deploy Vercel

```bash
vercel --prod
```

Vercel build statico Vite, niente runtime server. Le funzioni stanno tutte su Supabase.

## Test del motore fiscale

```bash
npx tsx src/lib/fiscal.test.ts
```

Il test esegue gli scenari A-J di `docs/FISCAL_ENGINE.md`. Il caso reale Marzo 2026 di Augusto deve restituire:
`incassato_piva = 1300 · tasse = 50.70 · INPS fisso = 384.31 · zavorra = 435.01 · quota_socio = 264.3498`.

Il file `supabase/functions/_shared/fiscal.ts` è copia 1:1 di `src/lib/fiscal.ts` (modifica entrambi insieme).
