# 🏛 ARCHITECTURE — Tangerine PWA v5.2

> Stack tecnico as-built, deployment, posizionamento app vs foglio.

---

## 📍 POSIZIONAMENTO

```
                ┌──────────────────────────────────┐
                │   PWA TANGERINE v5.2              │
                │   STRUMENTO PRINCIPALE            │
                │                                   │
                │ - Quick-add quotidiano            │
                │ - Dashboard mese + anno           │
                │ - Calcolo on-the-fly (Edge Fn)    │
                │ - CRUD totale                     │
                │ - Multi-device via Supabase Auth  │
                │ - PIN 6-cifre come secondo fattore│
                └──────────────────────────────────┘
                              │
                              ▼ (export periodico)
                ┌──────────────────────────────────┐
                │   FOGLIO EXCEL / GOOGLE SHEETS    │
                │   ARCHIVIO PASSIVO                │
                │                                   │
                │ - Generato dall'app               │
                │ - Read-only di fatto              │
                │ - Per commercialista o backup     │
                └──────────────────────────────────┘
```

> **Cambio rispetto a v5.1**: stack riallineato a quello effettivamente in uso (Supabase + Vercel + Edge Functions Deno). Niente Hono, niente Drizzle, niente Replit Postgres. Repository: `github.com/coesopeso/tangerine-app`.

---

## 🛠 STACK TECNICO (as-built v5.2)

| Layer | Tecnologia | Note |
|---|---|---|
| Frontend | **React 19 + Vite + TypeScript** | React 19 in uso effettivo |
| Styling | **Tailwind CSS 4** | |
| UI components | Componenti custom + Lucide icons | No shadcn, no UI library pesante |
| Routing | React state (`activeTab`) | App single-shell, niente React Router in MVP |
| Forms | HTML form + Zod | |
| State | React `useState` / `useEffect` + Supabase realtime opzionale | No TanStack Query in MVP |
| Icone | **Lucide React** | |
| Charts | Recharts | Configurati con assi visibili (vedi `UX_RULES.md`) |
| Animazioni | CSS transitions + Framer Motion (selettivo) | Solo bottom sheet e tab transition |
| Backend dati | **Supabase JS client** (browser → Postgres via PostgREST) | CRUD diretto con Row Level Security |
| Logica fiscale | **Supabase Edge Functions** (Deno + TypeScript) | Endpoint `compute-mese`, `compute-anno`, `conguaglio-socio` |
| Validazione | Zod (schema condiviso client/edge fn) | |
| Database | **Supabase PostgreSQL** (free tier) | Pause dopo 7gg di inattività mitigata da ping cron settimanale |
| Auth | **Supabase Auth** (account anonimo) **+ PIN 6-cifre** sopra | PIN serve a unlock locale + multi-device login con stesso account |
| Hosting | **Vercel** (free tier) | Build statico Vite, no server runtime |
| PWA | manifest.json + service worker + push notifications | MVP Sprint 5 (vedi `ROADMAP.md`) |
| Font | Inter (Google Fonts) | tabular-nums per numeri |

---

## 🚫 ESPLICITAMENTE ESCLUSI

- **Hono** → niente backend custom, logica fiscale in Edge Functions Supabase
- **Drizzle ORM** → schema SQL gestito via migrazioni Supabase, query via `supabase-js`
- **Replit Postgres** → Supabase è il DB di riferimento
- **tRPC** → Supabase JS + Edge Functions REST
- **Manus OAuth / Clerk / Auth0 / Firebase Auth** → Supabase Auth + PIN
- **Wouter / React Router** → MVP single-shell
- **react-hook-form** → form nativi
- **shadcn completo** → componenti custom su Tailwind
- **App Store / nativo iOS** → PWA installabile

---

## 💰 COSTI ANNUI STIMATI

| Voce | Costo | Necessità |
|---|---|---|
| Supabase free tier | 0 € | Obbligatorio (DB + Auth + Edge Fn) |
| Vercel free tier | 0 € | Obbligatorio (hosting) |
| Dominio custom | 10-15 €/anno | Opzionale |
| **Totale realistico** | **0 €/anno** | senza dominio custom |

URL default: `tangerine-<hash>.vercel.app`.

---

## 🔒 AUTH — PIN sopra Supabase Auth

**Modello**:
1. Al primo avvio l'app crea un account anonimo Supabase (`signInAnonymously`) e lo lega a un PIN 6-cifre scelto dall'utente.
2. PIN salvato come hash bcrypt in tabella `auth_pin` (RLS: solo il proprietario legge).
3. Sui device successivi: l'utente inserisce email + PIN per recuperare la stessa sessione (upgrade da anonimo a email/OTP). Vedi `MIGRATION.md`.
4. Lockout: 5 tentativi PIN falliti → blocco 5 minuti.

**Esplicitamente NO**: Clerk, Auth0, Manus OAuth, Firebase Auth.

---

## 🌐 DEPLOYMENT

- **Repository**: `github.com/coesopeso/tangerine-app` (pubblico)
- **CI/CD**: push su `main` → build & deploy automatico su Vercel
- **Env vars Vercel**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Edge Functions**: deploy via `supabase functions deploy compute-mese`
- **Backup DB**: snapshot Supabase automatici giornalieri (free tier 7gg) + export CSV mensile manuale per archivio offline

---

## 📂 STRUTTURA REPO

```
tangerine-app/
├── src/
│   ├── App.tsx                # shell + tab nav (target: <200 righe dopo refactor)
│   ├── main.tsx
│   ├── lib/
│   │   ├── supabase.ts        # client init
│   │   ├── auth/              # signInAnonymously + PIN hash + lockout
│   │   └── fiscal/            # tipi condivisi + chiamata Edge Fn compute-mese
│   ├── components/
│   │   ├── layout/            # Shell, TabBar, MonthNavigator
│   │   ├── dashboard/
│   │   ├── entrate/
│   │   ├── uscite/
│   │   ├── secchielli/
│   │   └── profile/
│   ├── pages/                 # Dashboard, Onboarding wizard
│   └── types/                 # tipi DB generati da supabase-cli
├── supabase/
│   ├── migrations/            # SQL versionato
│   ├── functions/
│   │   ├── compute-mese/index.ts
│   │   ├── compute-anno/index.ts
│   │   └── conguaglio-socio/index.ts
│   └── seed.sql
├── public/
├── docs/                      # Documentazione (questo file qui)
├── vercel.json
└── package.json
```

---

## 🔗 DOCUMENTI CORRELATI

- Schema DB: `DATA_MODEL.md`
- Algoritmo fiscale: `FISCAL_ENGINE.md`
- Pattern accesso dati + Edge Functions: `API.md`
- UI: `UX_RULES.md`

---

## VERSION

```
v5.2 — Stack as-built: Supabase + Vercel + Edge Functions, React 19, Tailwind 4
```
