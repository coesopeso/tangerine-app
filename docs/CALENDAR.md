# 📅 CALENDAR — Tangerine PWA v5.2

> Scadenze fiscali forfettario 2026. Calcolo importi automatici. Notifiche.

---

## 🗓 SCADENZE FISSE 2026

### Commercianti (tipo_inps = COMMERCIANTI)

| Tipo | Data | Cosa |
|---|---|---|
| `INPS_TRIM` | 16/05/2026 | INPS 1° trim fisso |
| `SALDO_IRPEF` + `ACCONTO_IRPEF_1` | 30/06/2026 | Tasse anno prec + 50% acconto |
| `INPS_ECCEDENZA` (saldo) | 30/06/2026 | Solo se sopra soglia |
| `INPS_TRIM` | 20/08/2026 | INPS 2° trim fisso |
| `INPS_TRIM` | 16/11/2026 | INPS 3° trim fisso |
| `ACCONTO_IRPEF_2` | 30/11/2026 | 50% acconto |
| `INPS_TRIM` | 16/02/2027 | INPS 4° trim fisso |
| `CCIAA` | 30/06/2026 | Diritto annuale (se previsto) |

### Gestione Separata (tipo_inps = GESTIONE_SEPARATA)

| Tipo | Data | Cosa |
|---|---|---|
| `SALDO_IRPEF` + `ACCONTO_IRPEF_1` + saldo INPS GS | 30/06/2026 | Tutto in un colpo |
| `ACCONTO_IRPEF_2` + acconto INPS GS | 30/11/2026 | |

> **GS non ha trimestralità fisse**: si paga col 730/Redditi.

---

## 🤖 PRE-POPOLAMENTO AUTOMATICO

L'app, al setup del profilo o al cambio anno fiscale:
1. Legge `tipo_inps` del profile
2. Crea record `scadenza_fiscale` per tutto l'anno con importi a `0`
3. L'utente vedrà subito tutte le scadenze in calendario, importi che si auto-calcolano man mano

---

## 🧮 CALCOLO IMPORTI

| Scadenza | Formula |
|---|---|
| `SALDO_IRPEF` | `imponibile_anno_precedente × aliquota − acconti_versati` |
| `ACCONTO_IRPEF_1` | `tasse_anno_precedente × 0.50` |
| `ACCONTO_IRPEF_2` | `tasse_anno_precedente × 0.50` |
| `INPS_TRIM` (Commerciante) | `inps_fisso_mensile × 3` |
| `INPS_ECCEDENZA` (saldo) | Somma `inps_eccedenza_mese` di tutto l'anno |
| `INPS GS` | Somma `imponibile_mese × aliquota_gs` periodo |

> Regola acconti: standard è 50%+50%. Per casi particolari (es. forfettari neo-iscritti) → chiedere a commercialista. App segnala il caso, non lo nasconde.

---

## 🔔 NOTIFICHE

### Trigger
- **30 / 15 / 7 / 1 giorni** prima di ogni scadenza
- Push notification PWA (iOS 16.4+, Android e Desktop ovunque)
- In-app: badge sulla tab "Fisco" con conteggio scadenze imminenti
- Email opzionale (configurabile in Impostazioni)

### Stati visuali

| Stato | Trigger | Visualizzazione |
|---|---|---|
| `FUTURA` | >30gg | Grigio |
| `IN_AVVICINAMENTO` | 8-30gg | Giallo |
| `URGENTE` | ≤7gg | Arancione |
| `SCADUTA` (non pagata) | data < oggi | Rosso pulsante |
| `PAGATA` | `importo_pagato ≥ importo_dovuto` | Verde, in fondo lista |

---

## 🏗 IMPLEMENTAZIONE NOTIFICHE

- **Service Worker** PWA gestisce push event
- Cron job lato Supabase (`pg_cron` + Edge Function `notify-scadenze`) ogni mattina alle 08:00 calcola le scadenze in finestra 30/15/7/1 gg e invia push
- Subscription push registrata al primo permission grant e salvata in tabella `push_subscription`
- Per iOS: documentare nel wizard che PWA va installata da Home Screen prima delle notifiche

---

## 🔗 DOCUMENTI CORRELATI

- Schema `scadenza_fiscale`: `DATA_MODEL.md`
- Calcoli base: `FISCAL_ENGINE.md`
- Endpoint: `API.md`

---

## VERSION

```
v5.2 — Notifiche via pg_cron + Edge Function notify-scadenze
```
