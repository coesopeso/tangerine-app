# 🎨 UX_RULES — Tangerine PWA v5.1

> Stile funzionale Revolut migliorato. Densità Revolut, identità Tangerine (arancione, leggibilità maggiore, grafici chiari).

---

## 🌗 TEMA

Toggle: `LIGHT` / `DARK` / `AUTO` (default AUTO, segue sistema).

### Palette LIGHT

| Elemento | Colore |
|---|---|
| Background | `#FFFFFF` |
| Surface (card) | `#F7F7F8` |
| Border | `#E5E7EB` |
| Testo primario | `#0A0A0A` |
| Testo secondario | `#6B7280` |
| Accento Tangerine | `#F97316` (arancione) |
| Successo | `#10B981` |
| Warning | `#F59E0B` |
| Errore | `#EF4444` |

### Palette DARK

| Elemento | Colore |
|---|---|
| Background | `#0A0A0A` |
| Surface | `#1A1A1C` |
| Border | `#2D2D30` |
| Testo primario | `#FAFAFA` |
| Testo secondario | `#A1A1AA` |
| Accento Tangerine | `#FB923C` (arancione più chiaro per contrasto) |

### Categorie spese (icone, non sfondi)

| Categoria | Colore |
|---|---|
| BUSINESS | `#3B82F6` (blu) |
| AUTO | `#16A34A` (verde scuro) |
| VITA | `#EC4899` (rosa) |
| SVAGO | `#EAB308` (giallo) |
| INVESTIMENTO | `#8B5CF6` (viola) |
| FORMAZIONE | `#14B8A6` (teal) |
| SALUTE | `#EF4444` (rosso) |

---

## 🔤 TIPOGRAFIA

- Font: **Inter** (free, leggibile)
- Numeri: **sempre** `font-variant-numeric: tabular-nums`
- Importi grandi: 32-48px, weight 700
- Body: 16px minimum
- Metadata secondari: 14px minimum
- **Mai testo sotto 14px**

---

## 📱 LAYOUT — TAB BAR (sempre visibile)

```
┌──────────────────────────────────────────────────┐
│                                                   │
│   Contenuto schermata                             │
│                                                   │
├──────────────────────────────────────────────────┤
│  🏠     📋    [ ➕ ]    📅     💰                 │
│  Casa  Spese          Fisco  Patrimonio          │
└──────────────────────────────────────────────────┘
```

- **5 tab** con icone Lucide + label
- Tab centrale (➕) **20% più grande**, sfondo arancione Tangerine, sempre evidente
- Tab attiva: icona arancione + label arancione
- Altezza: 64px (88px con safe area iOS)

### Schermate principali

| Tab | Schermata | Contenuto |
|---|---|---|
| 🏠 Casa | Dashboard Mese | KPI mese: incassato, zavorra, Tax Safe, saving rate. Prossime scadenze. |
| 📋 Spese | Lista transazioni | Spese + entrate del mese, filtri. Swipe per modificare/eliminare. |
| ➕ Quick Add | Bottom sheet | Quick-add spesa (default), toggle a fattura/entrata netta. |
| 📅 Fisco | Scadenze + Anno | Calendario scadenze, dashboard annuale, grafici, imponibile YTD vs soglia. |
| 💰 Patrimonio | Investimenti + Secchielli | PAC con costi, secchielli con progresso, valore totale. |

### Schermate di profondità (non in tab)

- Impostazioni (profile, tema, esporta dati, parametri INPS)
- Anagrafica clienti (lista + dettaglio + storico)
- CRUD categorie e sottocategorie
- Dettaglio PAC (grafico P/L + proiezione costi)
- Dettaglio secchiello (timeline allocazioni)
- Dettaglio cliente (storico fatturato + delta upselling)

---

## 🔼 BOTTOM SHEET QUICK-ADD SPESA

```
┌──────────────────────────────────────────────────┐
│  ───── (handle)                                   │
│                                                   │
│              € 0,00                               │ ← input grande
│                                                   │
│  Tastierino numerico custom in-app                │
│  ┌───┬───┬───┐                                   │
│  │ 1 │ 2 │ 3 │                                   │
│  ├───┼───┼───┤                                   │
│  │ 4 │ 5 │ 6 │                                   │
│  ├───┼───┼───┤                                   │
│  │ 7 │ 8 │ 9 │                                   │
│  ├───┼───┼───┤                                   │
│  │ , │ 0 │ ⌫ │                                   │
│  └───┴───┴───┘                                   │
│                                                   │
│  Categorie scrollabili (ultime 3 in evidenza)    │
│  [BUSINESS] [SVAGO] [AUTO] [VITA] [INV] ...      │
│                                                   │
│  📅 Oggi (default, tap per cambiare)              │
│  📝 Nota (opzionale)                              │
│                                                   │
│  [          SALVA          ]                      │ ← full-width arancione
└──────────────────────────────────────────────────┘
```

- Toggle in alto: Spesa / Fattura / Entrata netta
- Salva → toast verde 2s, sheet si chiude

---

## 📝 RIGA TRANSAZIONE

- Altezza 64px (più alta di Revolut per leggibilità)
- Layout: `[icona categoria 32x32] [descrizione + categoria · data] [importo grande tabular]`
- Importi spesa: rossi (no segno meno, basta colore)
- Importi entrata: verdi
- Raggruppamento per giorno con header sticky "Oggi · 5 maggio"

### Interazioni (Opzione B confermata)

| Gesto | Azione |
|---|---|
| Tap | Apre bottom sheet dettagli (read) + Modifica/Elimina |
| Swipe sinistra | Elimina con conferma toast 5s "Annulla" (stile Mail iOS) |
| Swipe destra | Apre bottom sheet in editing |
| Long press | Menu: Duplica · Cambia categoria · Sposta giorno |

---

## 📊 GRAFICI (correzione vs Revolut: massima leggibilità)

Libreria: **Recharts**.

### Regole
- **Assi sempre visibili** (X = mese/data, Y = importo)
- **Griglia tenue ma presente** (`strokeDasharray="3 3"`, opacity 0.3)
- **Label valori sui punti chiave** (max, min, ultimo)
- **Tooltip al tap** con valore esatto + delta vs periodo precedente
- **Legenda sempre visibile** in alto, non solo on-hover
- Colori dalla palette categoria
- Mai grafici "decorativi" senza valori leggibili
- Sparkline solo se accompagnate da numero esatto

### Grafici minimi nell'app

1. Dashboard Mese: barre orizzontali "Spese per categoria"
2. Dashboard Anno: linea "Imponibile YTD vs Soglia INPS" (linea soglia rossa)
3. Dashboard Anno: barre "Saving Rate mensile" (badge colorato sopra)
4. Dashboard Anno: linea multipla "Incassato vs Spese vs Zavorra" 12 mesi
5. Dettaglio PAC: linea "Valore vs Versato" + tooltip P/L per data
6. Dettaglio secchiello: barre cumulative allocazioni mensili

---

## 🃏 CARD KPI DASHBOARD

- Fondo `surface`, angoli 16px
- Label in alto (testo secondario, 14px, uppercase tracking-wide)
- Numero grande in mezzo (32px, tabular)
- Variazione vs mese precedente in basso (badge verde/rosso con freccia)

---

## 🎬 ANIMAZIONI

- Spring leggere su tab change (Framer Motion `type: "spring", stiffness: 300, damping: 30`)
- Bottom sheet: slide up con spring
- Toast: fade + slide
- **Rispetta `prefers-reduced-motion`**: animazioni disabilitate o ridotte

---

## ♿ ACCESSIBILITÀ

- Contrasto minimo **WCAG AA** in entrambi i temi
- Aree tap minime **44x44px**
- Etichette ARIA su icone-only buttons
- Focus visibile per navigazione tastiera
- Numeri annunciati con simbolo €

---

## 🚫 ANTIPATTERN UX (mai fare)

- Modal centrali quando bastano bottom sheet
- Numeri senza tabular-nums (allineamento si rompe)
- Grafici senza assi/label
- Liste hardcoded (tutto CRUD, vedi `DATA_MODEL.md`)
- Dropdown profondi >2 livelli
- Conferme con popup invasivo (preferire toast con "Annulla")
- Densità Revolut estrema (testo piccolissimo): noi siamo +20% più leggibili

---

## VERSION

```
v5.1 — UX Revolut migliorato, palette Tangerine, grafici leggibili
```
