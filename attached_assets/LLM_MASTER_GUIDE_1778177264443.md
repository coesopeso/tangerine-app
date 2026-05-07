# Tangerine — LLM Master Guide

## Scopo del progetto

**Tangerine** è un'applicazione PWA (Progressive Web App) elegante e precisa per la gestione finanziaria personale di professionisti in regime forfettario (Partita IVA). Funziona su **browser moderni** (iOS 18, Chrome, Safari, Firefox) con autenticazione Manus OAuth e database Supabase cloud. L'app calcola automaticamente le tasse (5% o 15%), l'INPS variabile (24% sull'eccedenza della soglia 18.808€ 2026) e gestisce PAC, budget e analisi temporale con precisione fiscale certificata.

---

## Stack tecnologico

| Layer | Tecnologia | Note |
|---|---|---|
| **Frontend** | React 19 + Vite 7 + Tailwind CSS 4 | Mobile-first, ottimizzato per iPhone |
| **Backend** | Express 4 + tRPC 11 (ESM) | API type-safe, procedures pubbliche e protette |
| **Database** | Supabase (PostgreSQL) | Cloud, RLS (Row Level Security), Free Tier |
| **ORM** | Drizzle ORM | Schema-first, type-safe, migrazioni SQL |
| **Autenticazione** | Manus OAuth | Session cookie, protectedProcedure per dati sensibili |
| **UI Components** | shadcn/ui + Radix UI | Componenti accessibili, Revolut-inspired |
| **Forms** | react-hook-form + zod | Validazione client/server, type-safe |
| **Data Fetching** | TanStack Query v5 + tRPC | Caching, invalidation, optimistic updates |
| **Routing** | Wouter | Lightweight, client-side routing |
| **Build Tool** | pnpm workspace | Monorepo, dependency management |

---

## Struttura del progetto

```
tangerine_app/
├── client/
│   ├── public/                    # Favicon, robots.txt, manifest.json (PWA)
│   ├── src/
│   │   ├── pages/                 # Page-level components (Dashboard, Entries, Expenses, Settings, Analysis)
│   │   ├── components/            # Reusable UI (Card, Button, Form, Dialog, etc.)
│   │   │   ├── DashboardLayout.tsx # Sidebar + main content layout
│   │   │   ├── NetSplitCard.tsx   # Visualizzazione secchielli (Tasse, INPS, Netto)
│   │   │   ├── BudgetAlert.tsx    # Alert budget (arancione/rossa)
│   │   │   └── ui/                # shadcn/ui components
│   │   ├── contexts/              # React contexts (Auth, Theme)
│   │   ├── hooks/                 # Custom hooks (useAuth, useNetSplit, etc.)
│   │   ├── lib/
│   │   │   ├── trpc.ts            # tRPC client binding
│   │   │   └── utils.ts           # Utility functions (formatCurrency, etc.)
│   │   ├── App.tsx                # Routes + layout wrapper
│   │   ├── main.tsx               # React entry point + providers
│   │   └── index.css              # Global styles + Tailwind theme
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/
│   ├── _core/                     # Framework plumbing (OAuth, context, env)
│   │   ├── index.ts               # Express app + server startup
│   │   ├── context.ts             # tRPC context builder (user, db)
│   │   ├── trpc.ts                # tRPC router + procedures (public, protected)
│   │   ├── oauth.ts               # Manus OAuth flow
│   │   ├── cookies.ts             # Session cookie handling
│   │   ├── env.ts                 # Environment variables loader
│   │   └── llm.ts                 # LLM integration helper
│   ├── db.ts                      # Database query helpers (getDb, upsertUser, etc.)
│   ├── routers.ts                 # tRPC app router (auth, transactions, budgets, etc.)
│   ├── routers/
│   │   ├── transactions.ts        # Procedures: addIncome, addExpense, listTransactions
│   │   ├── budgets.ts             # Procedures: setBudget, checkBudgetAlert
│   │   ├── profiles.ts            # Procedures: getProfile, updateProfile (Punto Zero)
│   │   └── analysis.ts            # Procedures: getMonthlyData, compareMonths
│   ├── auth.logout.test.ts        # Reference test file (vitest)
│   └── package.json
├── drizzle/
│   ├── schema.ts                  # Drizzle ORM schema (tabelle PostgreSQL)
│   ├── migrations/                # Auto-generated SQL migrations
│   └── drizzle.config.ts
├── shared/
│   ├── const.ts                   # Costanti (COOKIE_NAME, INPS_THRESHOLD, etc.)
│   └── types.ts                   # Shared types (User, Transaction, etc.)
├── storage/
│   └── index.ts                   # S3 helpers (storagePut, storageGet) — non usato in Tangerine
├── tangerine_context/             # Cartella di contesto per LLM
│   ├── RULES.md                   # Regole di sviluppo
│   ├── TECHNICAL_SPEC.md          # Specifiche tecniche
│   ├── FISCAL_ENGINE.md           # Motore fiscale 2026
│   └── LLM_MASTER_GUIDE.md        # Questo file
├── todo.md                        # Tracker task (70+ item)
├── package.json                   # Root workspace
├── pnpm-workspace.yaml
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

---

## Database PostgreSQL (Supabase)

### Connessione e ORM

**File**: `drizzle/schema.ts` (definizione schema)

**Percorso nel codice** (`server/db.ts`):
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });
```

### Tabelle principali

#### `profiles` (Impostazioni utente)
| Colonna | Tipo | Descrizione |
|---|---|---|
| `id` | `uuid` | PK, FK to `auth.users` |
| `coefficiente_redditivita` | `numeric` | ATECO: 0.78 o 0.40 |
| `imposta_sostitutiva` | `numeric` | 0.05 (5%) o 0.15 (15%) |
| `ytd_taxable_income` | `numeric` | Reddito imponibile cumulativo dal 1° Gennaio 2026 |
| `liquidity_initial` | `numeric` | Liquidità al Punto Zero 2026 |
| `investments_initial` | `numeric` | Investimenti (PAC) al Punto Zero 2026 |
| `monthly_pac_amount` | `numeric` | Quota automatica mensile PAC (es. 150€) |
| `monthly_buffer_amount` | `numeric` | Quota automatica mensile Cuscinetto (es. 200€) |
| `created_at` | `timestamp` | Timestamp creazione |
| `updated_at` | `timestamp` | Timestamp ultimo aggiornamento |

#### `transactions` (Entrate e Spese)
| Colonna | Tipo | Descrizione |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK to `auth.users` (RLS) |
| `date` | `date` | Data transazione |
| `amount` | `numeric` | Lordo (positivo=entrata, negativo=spesa) |
| `is_net_income` | `boolean` | TRUE se entrata è già netta/tassata |
| `has_partner` | `boolean` | TRUE se entrata va smezzata con socio |
| `partner_tax_rate` | `numeric` | Forfait tasse socio (default 0.26) |
| `type` | `text` | 'income' o 'expense' |
| `category` | `text` | Lavoro, Svago, Auto, Casa, ecc. |
| `subcategory` | `text` | Sottocategoria specifica |
| `note` | `text` | Campo libero per dettagli |
| `tax_accrual` | `numeric` | Quota tasse accantonata (arrotondata per eccesso) |
| `inps_var_accrual` | `numeric` | Quota INPS variabile accantonata |
| `inps_fixed_accrual` | `numeric` | Quota INPS fisso accantonata (376,78€ al mese) |
| `partner_share` | `numeric` | Quota netta da bonificare al socio |
| `created_at` | `timestamp` | Timestamp creazione |

#### `budgets` (Soglie di spesa)
| Colonna | Tipo | Descrizione |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK to `auth.users` (RLS) |
| `category` | `text` | Categoria (es. 'Svago') |
| `monthly_limit` | `numeric` | Soglia massima mensile |
| `created_at` | `timestamp` | Timestamp creazione |

#### `pac_allocations` (Tracciamento PAC/Cuscinetto)
| Colonna | Tipo | Descrizione |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK to `auth.users` (RLS) |
| `month` | `date` | Primo giorno del mese (es. 2026-04-01) |
| `pac_amount` | `numeric` | Importo PAC accantonato |
| `buffer_amount` | `numeric` | Importo Cuscinetto accantonato |
| `pac_current_value` | `numeric` | Valore corrente PAC (da aggiornare manualmente o via API) |
| `created_at` | `timestamp` | Timestamp creazione |

### Aggiungere/modificare schema

```bash
# Dopo aver modificato drizzle/schema.ts
pnpm drizzle-kit generate
# Leggi il file SQL generato in drizzle/migrations/
# Applica via webdev_execute_sql o direttamente su Supabase
```

---

## Net-Split Engine (Motore Fiscale)

### Algoritmo Principale

**File**: `server/routers/transactions.ts` (funzione `calculateNetSplit`)

```typescript
function calculateNetSplit(input: {
  lordo: number;
  coefficiente: number;
  aliquota: number;
  ytd_taxable_income: number;
  has_partner: boolean;
  partner_tax_rate: number;
}): {
  base_imponibile: number;
  tasse: number;
  inps_fisso: number;
  inps_var: number;
  netto_reale: number;
  partner_share?: number;
  ytd_updated: number;
} {
  // 1. Base imponibile
  const base_imponibile = input.lordo * input.coefficiente;
  
  // 2. Tasse (arrotondamento per eccesso)
  const tasse = Math.ceil(base_imponibile * input.aliquota * 100) / 100;
  
  // 3. INPS Fisso (376,78€ al mese, ma solo se non ancora coperto)
  const inps_fisso = 376.78; // Semplificazione: sempre 376,78€
  
  // 4. INPS Variabile (24% sull'eccedenza della soglia 18.808€)
  const soglia_inps = 18808;
  const eccedenza = Math.max(0, input.ytd_taxable_income + base_imponibile - soglia_inps);
  const eccedenza_precedente = Math.max(0, input.ytd_taxable_income - soglia_inps);
  const inps_var_base = (eccedenza - eccedenza_precedente) * 0.24;
  const inps_var = Math.ceil(inps_var_base * 100) / 100;
  
  // 5. Netto Reale
  const netto_reale = input.lordo - tasse - inps_fisso - inps_var;
  
  // 6. Se c'è socio, calcola quota da bonificare
  let partner_share = 0;
  if (input.has_partner) {
    const partner_lordo = input.lordo / 2;
    const partner_base = partner_lordo * input.coefficiente;
    const partner_tasse = Math.ceil(partner_base * (input.aliquota + input.partner_tax_rate) * 100) / 100;
    partner_share = partner_lordo - partner_tasse;
  }
  
  // 7. Aggiorna ytd_taxable_income
  const ytd_updated = input.ytd_taxable_income + base_imponibile;
  
  return {
    base_imponibile,
    tasse,
    inps_fisso,
    inps_var,
    netto_reale,
    partner_share,
    ytd_updated,
  };
}
```

### Scenari di Test

**Scenario A: Sotto Soglia INPS**
- Input: lordo=5000, coefficiente=0.78, aliquota=0.05, ytd=0, no_partner
- Output: tasse=195, inps_fisso=376.78, inps_var=0, netto_reale=4428.22

**Scenario B: Superamento Soglia INPS**
- Input: lordo=3000, coefficiente=0.78, aliquota=0.05, ytd=17000, no_partner
- Output: tasse=117, inps_fisso=376.78, inps_var=127.68, netto_reale=2378.54

**Scenario C: Smezzamento Socio**
- Input: lordo=2000, coefficiente=0.78, aliquota=0.05, ytd=0, has_partner=true, partner_tax_rate=0.26
- Output: tasse=195 (totali), partner_share=970 (netto da bonificare)

---

## tRPC Procedures (API)

### Autenticazione

```typescript
// server/_core/trpc.ts
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx });
});
```

### Router Principale

**File**: `server/routers.ts`

```typescript
export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { /* ... */ }),
  }),
  
  transactions: router({
    addIncome: protectedProcedure
      .input(z.object({
        amount: z.number(),
        is_net_income: z.boolean(),
        has_partner: z.boolean(),
        date: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Calcola Net-Split
        const split = calculateNetSplit({...});
        // Salva su DB
        await db.insert(transactions).values({...});
        return split;
      }),
    
    addExpense: protectedProcedure
      .input(z.object({
        amount: z.number(),
        category: z.string(),
        subcategory: z.string(),
        note: z.string(),
        date: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Scalamento dal Netto
        await db.insert(transactions).values({...});
        return { success: true };
      }),
    
    listTransactions: protectedProcedure
      .input(z.object({
        month: z.date().optional(),
        category: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        // Filtra per user_id + mese/categoria
        return db.select().from(transactions)
          .where(and(eq(transactions.user_id, ctx.user.id), ...));
      }),
  }),
  
  budgets: router({
    setBudget: protectedProcedure
      .input(z.object({
        category: z.string(),
        monthly_limit: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Upsert budget
        await db.insert(budgets).values({...});
        return { success: true };
      }),
    
    checkBudgetAlert: protectedProcedure
      .input(z.object({
        category: z.string(),
        month: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        // Calcola spese categoria per mese
        // Confronta con budget limit
        // Ritorna alert status
        return { alert: false, spent: 0, limit: 0 };
      }),
  }),
  
  profiles: router({
    getProfile: protectedProcedure
      .query(async ({ ctx }) => {
        return db.select().from(profiles)
          .where(eq(profiles.id, ctx.user.id)).limit(1);
      }),
    
    updateProfile: protectedProcedure
      .input(z.object({
        ytd_taxable_income: z.number().optional(),
        monthly_pac_amount: z.number().optional(),
        monthly_buffer_amount: z.number().optional(),
        // ... altri campi
      }))
      .mutation(async ({ ctx, input }) => {
        // Aggiorna profilo (Punto Zero)
        await db.update(profiles)
          .set({...})
          .where(eq(profiles.id, ctx.user.id));
        return { success: true };
      }),
  }),
  
  analysis: router({
    getMonthlyData: protectedProcedure
      .input(z.object({
        month: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        // Aggrega dati mensili
        // Ritorna: entrate, spese, tasse, INPS, netto
        return { /* ... */ };
      }),
    
    compareMonths: protectedProcedure
      .input(z.object({
        month1: z.date(),
        month2: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        // Confronto Side-by-Side
        // Ritorna variazioni percentuali
        return { /* ... */ };
      }),
  }),
});
```

---

## Frontend Pages e Componenti

### Pagine Principali

| File | Descrizione |
|---|---|
| `client/src/pages/Dashboard.tsx` | Home: Card Patrimonio, Liquidità, Investimenti + 4 Secchielli |
| `client/src/pages/AddIncome.tsx` | Form inserimento entrata (Lordo/Netto, Socio) |
| `client/src/pages/AddExpense.tsx` | Form inserimento spesa (Categoria, Nota) |
| `client/src/pages/Expenses.tsx` | Lista spese mese corrente + filtri |
| `client/src/pages/Analysis.tsx` | Selettore periodo + confronto Side-by-Side |
| `client/src/pages/Settings.tsx` | Configurazione Punto Zero, parametri fiscali, budget |

### Componenti Riusabili

| File | Descrizione |
|---|---|
| `client/src/components/NetSplitCard.tsx` | Visualizzazione 4 secchielli (Tasse, INPS, Netto) |
| `client/src/components/BudgetAlert.tsx` | Card arancione/rossa con messaggio alert |
| `client/src/components/PeriodSelector.tsx` | Selettore Mese/Trimestre/Anno/Intervallo |
| `client/src/components/DashboardLayout.tsx` | Sidebar + main content (pre-built) |

---

## Guida per gli LLM (Come Continuare lo Sviluppo)

### Workflow Generale

1. **Leggi i file di contesto** (`tangerine_context/RULES.md`, `TECHNICAL_SPEC.md`, `FISCAL_ENGINE.md`) prima di qualsiasi modifica.
2. **Aggiorna il `todo.md`** quando aggiungi nuove feature o correggi bug.
3. **Segui la logica fiscale** definita in `FISCAL_ENGINE.md`: nessuna allucinazione matematica.
4. **Testa i calcoli** contro gli scenari A, B, C prima di committare.
5. **Usa tRPC** per tutte le API: nessun REST manuale.
6. **Ottimizza per iPhone** (tasti grandi, navigazione Tab, responsive).

### Aggiungere una Nuova Feature

**Esempio: Aggiungere categoria "Alimentari" alle spese**

1. Aggiorna `todo.md`: aggiungi `[ ] Aggiungere categoria Alimentari`
2. Aggiorna `TECHNICAL_SPEC.md`: documenta la nuova categoria
3. Modifica `server/routers/transactions.ts`: aggiungi validazione categoria
4. Modifica `client/src/pages/AddExpense.tsx`: aggiungi opzione nel dropdown
5. Testa: inserisci spesa "Alimentari" e verifica salvataggio
6. Segna come completata in `todo.md`: `[x] Aggiungere categoria Alimentari`

### Debugging

- **Calcoli fiscali errati?** Verifica `calculateNetSplit` in `server/routers/transactions.ts` contro `FISCAL_ENGINE.md`
- **Dati non salvati?** Controlla RLS su Supabase (user_id deve matchare ctx.user.id)
- **UI non responsive?** Verifica breakpoint Tailwind (lg = 1024px)
- **Errore tRPC?** Leggi il messaggio di errore nel browser console + server logs

### Checklist Prima di Committare

- [ ] `todo.md` aggiornato con task completate
- [ ] Test unitari scritti (vitest)
- [ ] Calcoli fiscali verificati manualmente
- [ ] UI testata su iPhone (DevTools)
- [ ] Nessun hardcoded value (usa env vars)
- [ ] RLS su Supabase configurato correttamente

---

## Costanti Critiche

| Costante | Valore | File |
|---|---|---|
| `INPS_THRESHOLD_2026` | 18.808 | `shared/const.ts` |
| `INPS_VAR_RATE` | 0.24 | `shared/const.ts` |
| `INPS_FIXED_MONTHLY` | 376.78 | `shared/const.ts` |
| `TAX_RATE_LOW` | 0.05 | `shared/const.ts` |
| `TAX_RATE_HIGH` | 0.15 | `shared/const.ts` |
| `PARTNER_TAX_RATE_FORFAIT` | 0.26 | `shared/const.ts` |

---

## Riferimenti Rapidi

- **Cartella di Contesto:** `/home/ubuntu/tangerine_context/`
- **Progetto:** `/home/ubuntu/tangerine_app/`
- **Database:** Supabase URL: `https://skkeudcuyeijrzfumytb.supabase.co`
- **Dev Server:** `pnpm dev` (avvia sia backend che frontend)
- **Test:** `pnpm test` (vitest)
- **Build:** `pnpm build` (Vite + esbuild)
