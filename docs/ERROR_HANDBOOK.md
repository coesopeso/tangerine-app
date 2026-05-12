# 🚨 ERROR_HANDBOOK — Tangerine PWA v5.1

> Bug noti e fix. **Controllare qui prima di indagare un bug nuovo.**

---

## 🧮 BUG CALCOLO FISCALE

| Sintomo | Causa | Fix |
|---|---|---|
| Tax Safe negativo a Gennaio | INPS fisso accantonato senza incassi | **Comportamento corretto, NON bug.** L'INPS è dovuto. UI deve mostrare nota esplicativa. |
| INPS calcolato N volte in un mese | INPS fisso × n° fatture | Usare 1 sola volta per mese (vedi `FISCAL_ENGINE.md` algoritmo) |
| INPS eccedenza duplicata mese su mese | Manca formula differenziale | Usare `MAX(0, ytd_n − soglia) − MAX(0, ytd_(n-1) − soglia)` |
| Tasse calcolate su fattura non INCASSATA | Manca filtro `stato === 'INCASSATO'` | Filtrare prima del calcolo |
| Fattura inserita retroattivamente non aggiorna mesi successivi | Stato YTD persistito | Ricalcolo on-the-fly da zero |
| Cambio coefficiente a metà anno provoca disallineamenti | Profile aggiornato senza versionamento | UI deve avvisare e chiedere conferma esplicita. Idealmente versionare profile. |
| `#DIV/0!` in Saving Rate a Gennaio | Incassato=0 | IFERROR / try-catch |

---

## 💸 BUG INVESTIMENTI

| Sintomo | Causa | Fix |
|---|---|---|
| Fondo PAC mostrato in profitto ma utente perde | Ignorati i costi annualizzati | Mostrare sempre `costo_totale_anno` accanto a P/L (vedi `INVESTMENTS.md`) |
| Prezzo PAC non aggiornato → P/L sballato | Manca aggiornamento manuale | UI deve avvisare se `data_aggiornamento_prezzo > 30gg fa` |
| Versato_totale non quadra con somma versamenti | Drift tra spesa e pac_dettaglio | Single source of truth: `spesa` + ricalcolo `versato_totale` |

---

## 🗃 BUG MODELLO DATI

| Sintomo | Causa | Fix |
|---|---|---|
| Categoria eliminata e spese storiche orfane | Hard delete | Soft delete: `attiva = false`, spese storiche preservate |
| Cliente eliminato con fatture | Hard delete | Soft delete `attivo = false` |
| Secchiello eliminato e allocazioni orfane | Hard delete | Soft delete `archiviato = true` se ha allocazioni |
| FK violata su POST | Validazione mancante | Zod check + 404 se FK non trovata |

---

## 📱 BUG PWA / iOS

| Sintomo | Causa | Fix |
|---|---|---|
| iOS PWA non riceve notifiche | iOS supporta notifiche PWA solo da 16.4+ e solo se installata da Home Screen | Documentare nel wizard onboarding |
| Bottom sheet non si chiude su iOS | Manca handler swipe-down | Implementare gesture handler nativo |
| Push notification non arriva | Browser non in foreground | Service worker deve gestire `push` event correttamente |
| App lenta al primo accesso | Replit Autoscale freddo | Normale (~2s wake). Mostrare splash. |
| Input numerico con virgola non parsato | Locale italiano vs JS | Usare parser custom: `parseFloat(input.replace(',', '.'))` |

---

## 🎨 BUG UI

| Sintomo | Causa | Fix |
|---|---|---|
| Numeri non allineati nella lista transazioni | Manca tabular-nums | `font-variant-numeric: tabular-nums` su importi |
| Grafico Recharts illeggibile su mobile | Default size sbagliato | ResponsiveContainer + viewport-aware sizing |
| Tema dark non si applica al primo load | Flash unstyled content | Inline script in `<head>` per applicare tema prima del React mount |
| Tab bar coperta da safe area iOS | Manca env(safe-area-inset-bottom) | `padding-bottom: env(safe-area-inset-bottom)` |

---

## 🌐 BUG INFRASTRUTTURA

| Sintomo | Causa | Fix |
|---|---|---|
| Replit app va in sleep | Piano gratuito | Usare Replit Autoscale (~15-30 €/anno) |
| Postgres connection drop | Idle timeout | Connection pool con ping ogni 5min |
| CORS error in dev | Frontend e backend su porte diverse | Configurare proxy Vite o Hono CORS middleware |

---

## 🐢 PERFORMANCE

| Sintomo | Causa | Fix |
|---|---|---|
| Dashboard lenta con molte fatture | Ricalcolo non ottimizzato | Memoizzare per anno corrente con `useMemo` lato React |
| Lista transazioni laggosa | Render di tutte le righe | Virtualizzazione con `@tanstack/react-virtual` (post-MVP) |
| Bundle JS troppo grande | Recharts + Framer Motion | Tree-shaking + code splitting per route |

---

## 🔗 DOCUMENTI CORRELATI

- Calcoli fiscali: `FISCAL_ENGINE.md`
- Test: `TESTING.md`

---

## VERSION

```
v5.1 — Catalogo bug fiscali + UX + iOS + infra
```
