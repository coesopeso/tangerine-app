# 🗃 DATA_MODEL — Tangerine PWA v5.2

> Schema DB completo. Nomi `snake_case` inglese. Etichette UI italiano. Postgres su Supabase con Row Level Security per `user_id`.

---

## 📋 TABELLE

### `profile` — Configurazione utente (record singolo)

| Campo | Tipo | Default | Descrizione |
|---|---|---|---|
| `anno_fiscale` | int | 2026 | Anno corrente. Cambia → tutto il sistema riparte. |
| `coefficiente_redditivita` | numeric | 0.78 | ATECO: 0.40 / 0.54 / 0.62 / 0.67 / 0.73 / 0.78 / 0.86 |
| `aliquota_imposta` | numeric | 0.05 | 0.05 (5% startup) o 0.15 (15% standard) |
| `tipo_inps` | enum | `ARTIGIANI` | `ARTIGIANI` / `COMMERCIANTI` / `GESTIONE_SEPARATA`. Artigiani e Commercianti condividono la formula (fisso + eccedenza differenziale), cambiano i default. |
| `inps_minimale_annuo` | numeric | 18415.00 | Soglia INPS imponibile. Artigiani 2026 = 18415 (≈ 23608 lordo a coeff 0.78). Commercianti 2026 ≈ 18555. Aggiornare ogni anno. |
| `inps_fisso_mensile` | numeric | 384.31 | Quota fissa mensile. Artigiani 2026 = 384.31 (€4612/anno). Commercianti 2026 = 376.78. |
| `inps_aliquota_eccedenza` | numeric | 0.24 | Aliquota su eccedenza Artig./Comm. |
| `inps_aliquota_gs` | numeric | 0.2607 | Aliquota Gestione Separata (0.2607 con altra copertura, 0.24 sola GS). |
| `inps_aliquota_socio_simulata` | numeric | 0.2607 | Aliquota usata per simulare la quota socio (default = GS). Override per fattura non previsto in v5.1. |
| `liquidita_iniziale` | numeric | 0 | Punto Zero anno fiscale. |
| `investimenti_iniziali` | numeric | 0 | Punto Zero investimenti. |
| `pac_mensile_automatico` | numeric | 0 | Quota PAC automatica. |
| `cuscinetto_mensile_automatico` | numeric | 0 | Quota fondo emergenza automatica. |
| `tema` | enum | `AUTO` | `LIGHT` / `DARK` / `AUTO` |
| `created_at` | timestamp | now() | |
| `updated_at` | timestamp | now() | |

---

### `cliente` — Anagrafica

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `nome` | text | Es. "Studio Rossi" |
| `partita_iva` | text | Opzionale |
| `codice_fiscale` | text | Opzionale |
| `email` | text | Opzionale |
| `telefono` | text | Opzionale |
| `note` | text | Libero |
| `attivo` | boolean | TRUE default. FALSE = nascosto da dropdown ma storico preservato |
| `created_at` | timestamp | |

**Vista calcolata `cliente_stats`**: `fatturato_ytd`, `fatturato_anno_precedente`, `numero_fatture_ytd`, `ultima_fattura_data`, `ultima_fattura_lordo`, `delta_vs_ultima_pct`.

---

### `fattura` — Entrate da P.IVA

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `cliente_id` | uuid? | FK `cliente`. Nullable per casi una tantum. |
| `numero_fattura` | text | Opzionale (es. "2026/042") |
| `data_emissione` | date | |
| `data_scadenza_pagamento` | date | |
| `data_incasso` | date? | NULL se non ancora pagato |
| `descrizione` | text | |
| `lordo` | numeric | |
| `tipo` | enum | `FATTURA_PIVA` (genera tasse + INPS) / `ENTRATA_PRIVATA` (no tasse, no INPS variabile, no socio). Default `FATTURA_PIVA`. |
| `stato` | enum | `PROGRAMMATO` / `FATTURATO` / `INCASSATO` |
| `con_socio` | boolean | TRUE se da smezzare con socio. Genera quota socio simulata SOLO se `tipo=FATTURA_PIVA` E `stato=INCASSATO`. Su `ENTRATA_PRIVATA` resta solo etichetta visiva. |
| `note` | text | |
| `created_at` | timestamp | |

**Stati** (3 canonici + 1 derivato):
- `PROGRAMMATO` — prevista, non emessa. Visibile solo in pianificazione, **nessun effetto fiscale**.
- `FATTURATO` — emessa, non ancora incassata. **Nessun effetto fiscale** (principio di cassa).
- `INCASSATO` — pagata. **Solo qui scattano accantonamenti fiscali** (tasse, INPS variabile, quota socio).
- `IN_RITARDO` — calcolato runtime: `FATTURATO` AND `data_scadenza_pagamento < oggi`. Non salvato.

> **Importante**: accrual fiscali NON salvati per riga. Ricalcolati on-the-fly. Vedi `FISCAL_ENGINE.md`.

---

### ~~`entrata_netta`~~ — DEPRECATA in v5.1.1

> Le entrate esentasse (vendite usato, regali, rimborsi, refund) sono ora unificate nella tabella `fattura` con `tipo='ENTRATA_PRIVATA'`. Una sola tabella, due tipi, fiscalità divergente derivata dal campo `tipo`. Coerente col foglio Excel (una sola lista "Entrate" con colonna TIPO). Vedi `MIGRATION.md` per la migrazione.

Per le `ENTRATA_PRIVATA` valgono questi vincoli:
- `cliente_id` opzionale (es. "FRUTTETO", "REGALI" possono essere stringhe libere in `descrizione`)
- `numero_fattura`, `data_emissione`, `data_scadenza_pagamento` sempre NULL
- `con_socio` ammesso ma puramente etichetta visiva (nessun effetto fiscale)
- INPS fisso (Artig./Comm.) resta dovuto indipendentemente

---

### `spesa` — Uscite

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `data` | date | |
| `categoria_id` | uuid | FK `categoria` |
| `sottocategoria_id` | uuid? | FK `sottocategoria` |
| `importo` | numeric | Sempre positivo |
| `tipo` | enum | `EFFETTIVA` / `PROGRAMMATA` |
| `descrizione` | text | |
| `note` | text | |
| `created_at` | timestamp | |

---

### `categoria` — Categorie spese (CRUD)

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `nome` | text | Es. "BUSINESS", "AUTO", "VITA", "SVAGO", "INVESTIMENTO", "FORMAZIONE", "SALUTE" |
| `colore_hex` | text | Es. "#3B82F6" |
| `icona` | text | Nome icona Lucide (es. "Briefcase") |
| `ordine` | int | Per ordinamento UI |
| `attiva` | boolean | FALSE = nascosta in dropdown, spese storiche preservate |

**Seed iniziale**: 7 categorie default — vedi `MIGRATION.md`.

---

### `sottocategoria`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `categoria_id` | uuid | FK |
| `nome` | text | |
| `attiva` | boolean | |

---

### `secchiello` — Risparmio finalizzato (CRUD)

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `nome` | text | Es. "Vacanza Giappone" |
| `colore_hex` | text | |
| `icona` | text | |
| `target_importo` | numeric? | OPZIONALE |
| `target_data` | date? | OPZIONALE |
| `archiviato` | boolean | TRUE = obiettivo raggiunto/abbandonato |
| `created_at` | timestamp | |

**Vista `secchiello_stats`**: `accumulato_totale`, `progresso_pct` (se ha target), `quota_mensile_suggerita` (se target+data).

---

### `allocazione_secchiello`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `secchiello_id` | uuid | FK |
| `mese` | date | Primo del mese |
| `importo` | numeric | |
| `nota` | text | |

---

### `pac_dettaglio` — PAC con tracking costi

Vedi `INVESTMENTS.md` per esempi completi popolati (Mediolanum Cina/India).

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `nome` | text | Breve es. "Mediolanum Cina" |
| `nome_completo` | text | Es. "Mediolanum Chinese Road Opportunity L" |
| `isin` | text | Es. "IE00BJYLJ716" |
| `emittente` | text | |
| `categoria_morningstar` | text | |
| `data_apertura` | date | |
| `versamento_mensile` | numeric | Quota PAC mensile |
| `versato_totale` | numeric | |
| `investito_netto` | numeric | Versato − costi ingresso |
| `quote_possedute` | numeric | |
| `prezzo_medio_carico` | numeric | |
| `prezzo_quota_corrente` | numeric | |
| `data_aggiornamento_prezzo` | date | |
| `costo_ingresso_pct` | numeric | Es. 0.03 (3%) |
| `ter_annuo_pct` | numeric | Total Expense Ratio annuo |
| `sri_rischio` | int | 1-7 |
| `tipo_quote` | enum | `ACCUMULAZIONE` / `DISTRIBUZIONE` |
| `note` | text | |
| `archiviato` | boolean | |

**Calcoli derivati on-the-fly** (formule in `INVESTMENTS.md`).

---

### `investimento` — Asset diversi dai PAC

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `tipo` | enum | `ETF` / `CRYPTO` / `AZIONE` / `OBBLIGAZIONE` / `ALTRO` |
| `nome` | text | |
| `ticker` | text | Opzionale |
| `quantita` | numeric | |
| `prezzo_medio_carico` | numeric | |
| `prezzo_corrente` | numeric | |
| `data_aggiornamento_prezzo` | date | |
| `note` | text | |
| `archiviato` | boolean | |

---

### `scadenza_fiscale` — Calendario

Vedi `CALENDAR.md` per dettaglio scadenze pre-popolate.

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `tipo` | enum | `SALDO_IRPEF` / `ACCONTO_IRPEF_1` / `ACCONTO_IRPEF_2` / `INPS_TRIM` / `INPS_ECCEDENZA` / `IVA` / `CCIAA` / `ALTRO` |
| `data_scadenza` | date | |
| `descrizione` | text | |
| `importo_dovuto` | numeric | |
| `importo_pagato` | numeric | 0 finché non pagato |
| `data_pagamento` | date? | |
| `note` | text | |

**Stati derivati**: `PAGATA` / `SCADUTA` / `URGENTE` (≤7gg) / `IN_AVVICINAMENTO` (≤30gg) / `FUTURA`.

---

### `push_subscription` — Subscription Web Push (per device)

Una riga per device che ha concesso il permesso notifiche. Usata dalla Edge Function `notify-scadenze` (vedi `CALENDAR.md`).

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid (FK auth.users) | RLS owner |
| `endpoint` | text | URL endpoint push del browser |
| `p256dh` | text | Chiave pubblica VAPID-style |
| `auth` | text | Auth secret |
| `device_label` | text? | Es. "iPhone Augusto" (utile in lista) |
| `created_at` | timestamp | |
| `last_seen_at` | timestamp | Aggiornato a ogni login |

UNIQUE su `(user_id, endpoint)`. Endpoint scaduto/410 → riga eliminata.

---

### `auth_pin` — Hash PIN locale (per utente)

Vedi `ARCHITECTURE.md` (sezione Auth) e `API.md` (`auth-pin-setup` / `auth-pin-verify`).

| Campo | Tipo | Descrizione |
|---|---|---|
| `user_id` | uuid (PK, FK auth.users) | |
| `pin_hash` | text | bcrypt cost ≥ 10 |
| `failed_attempts` | int | Reset a 0 su successo |
| `locked_until` | timestamp? | Settato dopo 5 fallimenti, +5 min |
| `updated_at` | timestamp | |

---

## 🔠 ENUM

```typescript
tipo_fattura:     FATTURA_PIVA | ENTRATA_PRIVATA
stato_fattura:    PROGRAMMATO | FATTURATO | INCASSATO
tipo_spesa:       EFFETTIVA | PROGRAMMATA
tipo_inps:        ARTIGIANI | COMMERCIANTI | GESTIONE_SEPARATA
tipo_investimento: ETF | CRYPTO | AZIONE | OBBLIGAZIONE | ALTRO
tipo_scadenza:    SALDO_IRPEF | ACCONTO_IRPEF_1 | ACCONTO_IRPEF_2 |
                  INPS_TRIM | INPS_ECCEDENZA | IVA | CCIAA | ALTRO
tipo_quote_pac:   ACCUMULAZIONE | DISTRIBUZIONE
tema:             LIGHT | DARK | AUTO
```

### Secchielli "di sistema" (creati automaticamente, non eliminabili)

| Slug | Nome UI | Target | Note |
|---|---|---|---|
| `QUOTA_SOCIO` | "Quota Socio — conguaglio" | nessun target | Auto-popolato da `quota_socio_mese` di ogni fattura `con_socio=true`. Azzerato a fine anno dopo conguaglio. |
| `FONDO_TASSE` | "Tasse & INPS" | nessun target | Opzionale. Auto-popolato da `zavorra_fiscale_mese` se l'utente attiva `accantonamento_automatico` in profile. |

---

## 🚨 REGOLE DI INTEGRITÀ

- **Soft delete obbligatorio** dove esiste storico: `cliente.attivo`, `categoria.attiva`, `sottocategoria.attiva`, `secchiello.archiviato`, `pac_dettaglio.archiviato`, `investimento.archiviato`. **Mai hard delete** se ha record collegati.
- **Cascade**: solo per `allocazione_secchiello` quando il secchiello viene veramente eliminato (raro, solo se 0 allocazioni).
- **FK obbligatorie** validate via Zod prima di toccare DB.
- **Numeric**: usare `numeric(12, 2)` per importi euro.
- **Indici** consigliati: `fattura(data_incasso, stato)`, `spesa(data, categoria_id)`, `allocazione_secchiello(secchiello_id, mese)`.

---

## 🔗 DOCUMENTI CORRELATI

- Calcoli fiscali su questi dati: `FISCAL_ENGINE.md`
- Endpoint che li espongono: `API.md`
- Esempi PAC popolati: `INVESTMENTS.md`

---

## VERSION

```
v5.2 — Stati fattura allineati al codice (PROGRAMMATO/FATTURATO/INCASSATO), schema su Supabase con RLS
```
