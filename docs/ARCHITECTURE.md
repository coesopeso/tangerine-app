# 🏛 ARCHITECTURE — Tangerine PWA v5.1

> Stack tecnico, deployment, posizionamento app vs foglio.

---

## 📍 POSIZIONAMENTO

```
                ┌──────────────────────────────────┐
                │   PWA TANGERINE v5.1              │
                │   STRUMENTO PRINCIPALE            │
                │                                   │
                │ - Quick-add quotidiano            │
                │ - Dashboard mese + anno           │
                │ - Calcolo on-the-fly              │
                │ - CRUD totale                     │
                │ - Notifiche scadenze              │
                │ - PWA installabile su iPhone      │
                └──────────────────────────────────┘
                              │
                              ▼ (export periodico)
                ┌──────────────────────────────────┐
                │   FOGLIO GOOGLE SHEETS            │
                │   ARCHIVIO PASSIVO                │
                │                                   │
                │ - Generato dall'app               │
                │ - Read-only di fatto              │
                │ - Per commercialista o backup     │
                └──────────────────────────────────┘
```

> **Cambio rispetto a v5**: il foglio non è più "verità annuale". È un **output dell'app**, generato su richiesta. L'utente smette di mantenerlo a mano.

---

## 🛠 STACK TECNICO

| Layer | Tecnologia | Note |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | No React 19 (non stabile a maggio 2026) |
| Styling | Tailwind CSS 3 | |
| UI components | shadcn/ui (selettivo) | Solo: Button, Card, Input, Select, Sheet, Dialog, Toast, Badge, Tabs |
| Routing | React Router 6 | 3-4 route principali |
| Forms | HTML form + Zod | No react-hook-form |
| State server | TanStack Query v5 | |
| Icone | Lucide React | |
| Charts | Recharts | Configurati con assi visibili (vedi `UX_RULES.md`) |
| Animazioni | Framer Motion (selettivo) | Solo bottom sheet e tab transition |
| Backend | Hono | Più leggero di Express, type-safe |
| Validazione | Zod (schema condiviso client/server) | |
| ORM | Drizzle ORM | |
| Database | Replit PostgreSQL | Niente Supabase (no pause dopo 7gg) |
| Auth | PIN locale 6 cifre + Replit Auth opzionale | No Manus OAuth, no Clerk |
| Hosting | Replit Autoscale | ~15-30 €/anno |
| PWA | manifest.json + service worker minimo | "Aggiungi a Home" su iPhone |
| Font | Inter (self-hosted o Google Fonts) | tabular-nums per numeri |

---

## 🚫 ESPLICITAMENTE ESCLUSI

- **tRPC** → REST puro (più semplice, debuggabile da curl)
- **Manus OAuth** → PIN locale o Replit Auth
- **Wouter** → React Router (più features con poco peso)
- **react-hook-form** → form nativi
- **Supabase** → Replit Postgres (no pause forzate)
- **shadcn completo** → solo componenti necessari
- **App Store / nativo iOS** → PWA installabile

---

## 💰 COSTI ANNUI STIMATI

| Voce | Costo | Necessità |
|---|---|---|
| Replit Autoscale (24/7) | 15-30 €/anno | Obbligatorio per affidabilità |
| Replit Postgres | Incluso | Obbligatorio |
| Dominio custom | 10-15 €/anno | Opzionale |
| **Totale realistico** | **~20-30 €/anno** | |

Senza dominio custom (URL `tangerine-mauri.replit.app`): ~15-20 €/anno.

---

## 🔒 AUTH

**MVP**: PIN locale 6 cifre, salvato hashato (bcrypt) lato server. Lockout dopo 5 tentativi falliti per 5 minuti.

**Post-MVP opzionale**: Replit Auth come alternativa per chi non vuole PIN.

**Esplicitamente NO**: Clerk, Auth0, Manus OAuth, Firebase Auth, Supabase Auth.

---

## 🌐 DEPLOYMENT

- **Workflow Replit**: artefatto unico (`tangerine-pwa`) con `pnpm dev` in dev e `pnpm build && pnpm start` in prod
- **Autoscale**: scala a 0 quando non in uso, riparte in <2s al primo accesso
- **Backup DB**: snapshot Replit automatici + export CSV mensile manuale per archivio offline
- **PWA install**: bottone "Aggiungi a Home" istruito nel wizard onboarding

---

## 📂 STRUTTURA REPO (pnpm monorepo)

```
artifacts/
  tangerine-pwa/        # PWA principale
    src/
      api/              # Hono routes
      db/               # Drizzle schema + migrations
      lib/
        fiscal/         # Motore fiscale (vedi FISCAL_ENGINE.md)
      pages/            # React Router pages
      components/       # UI components
      hooks/
    artifact.toml
docs/                   # Documentazione (questo file qui)
```

---

## 🔗 DOCUMENTI CORRELATI

- Schema DB: `DATA_MODEL.md`
- Algoritmo fiscale: `FISCAL_ENGINE.md`
- Endpoint REST: `API.md`
- UI: `UX_RULES.md`

---

## VERSION

```
v5.1 — Stack semplificato, app standalone, foglio = export
```
