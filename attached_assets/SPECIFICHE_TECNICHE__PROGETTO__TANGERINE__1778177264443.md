# SPECIFICHE TECNICHE: PROGETTO "TANGERINE"
## Architettura, Stack Tecnologico e Modello Dati

Questo documento costituisce la specifica tecnica definitiva per l'applicazione **Tangerine**. Definisce l'architettura PWA, lo stack tecnologico a costo zero e lo schema del database Supabase.

---

### 1. Architettura PWA (Progressive Web App)
Tangerine è una PWA accessibile via browser e installabile su home screen, garantendo:
*   **Stealth Mode:** Nessuna presenza su App Store, massima privacy.
*   **Accessibilità:** Funziona su iOS (Face ID via iOS 18), Android e Desktop.
*   **Costo Zero:** Hosting su Vercel/Netlify e Backend su Supabase (Free Tier).

### 2. Stack Tecnologico
| Componente | Tecnologia | Note |
| :--- | :--- | :--- |
| **Frontend** | React + Vite + TailwindCSS | Framework leggero e performante. |
| **Backend/DB** | Supabase (PostgreSQL) | Auth, Database e RLS inclusi. |
| **AI Engine** | OpenAI GPT-4o (API) | Per estrazione dati (opzionale, a consumo). |

### 3. Modello Dati (Schema Supabase)

#### Tabella `profiles` (Impostazioni Utente)
| Campo | Tipo | Note |
| :--- | :--- | :--- |
| `id` | `uuid` | PK, FK to `auth.users`. |
| `coefficiente_redditivita` | `numeric` | Es. 0.78 o 0.40. |
| `imposta_sostitutiva` | `numeric` | 0.05 o 0.15. |
| `ytd_taxable_income` | `numeric` | Reddito imponibile annuo cumulativo. |

#### Tabella `transactions` (Entrate e Spese)
| Campo | Tipo | Note |
| :--- | :--- | :--- |
| `id` | `uuid` | PK. |
| `user_id` | `uuid` | FK to `auth.users`. |
| `date` | `date` | Data transazione. |
| `amount` | `numeric` | Lordo (positivo=entrata, negativo=spesa). |
| `type` | `text` | 'income' o 'expense'. |
| `category` | `text` | Es. 'Fattura', 'Affitto', 'Carburante'. |
| `net_amount` | `numeric` | Calcolato dal Net-Split Engine. |
| `tax_accrual` | `numeric` | Quota tasse accantonata. |
| `inps_fixed` | `numeric` | Quota INPS fissa accantonata. |
| `inps_var` | `numeric` | Quota INPS variabile accantonata. |

### 4. Sicurezza (RLS)
Ogni tabella deve avere la Row Level Security abilitata:
`CREATE POLICY "Own Data" ON table_name FOR ALL USING (auth.uid() = user_id);`
