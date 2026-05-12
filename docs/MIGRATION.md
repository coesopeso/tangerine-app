# 🚚 MIGRATION — Tangerine PWA v5.2

> Onboarding utente che arriva da foglio Tangerine v4. Wizard 5 step + import CSV + export foglio.

---

## 🧭 WIZARD ONBOARDING (5 step)

### Step 1 — Setup parametri fiscali
- Anno fiscale (default 2026)
- Coefficiente ATECO (dropdown 7 valori: 0.40 / 0.54 / 0.62 / 0.67 / 0.73 / 0.78 / 0.86)
- Aliquota imposta (5% / 15%)
- **Tipo INPS** (Artigiani / Commercianti / Gestione Separata)
  - Se Artigiani (default Augusto): minimale annuo (default 18415), fisso mensile (default 384.31 → €4612/anno), aliquota eccedenza (default 24%)
  - Se Commercianti: minimale ~18555, fisso ~376.78, aliquota eccedenza 24%
  - Se GS: aliquota GS (default 26.07% con altra copertura, 24% sola GS), niente fisso, niente soglia
- **Aliquota socio simulata** (default 26.07% = GS). Usata per calcolare la quota da trattenere su fatture flaggate `con_socio`.

### Step 2 — Punto Zero
- Liquidità al 1° Gennaio anno corrente (manuale)
- Investimenti al 1° Gennaio (manuale)

### Step 3 — Categorie spese

Mostra 10 categorie default seed (allineate al foglio Excel "SETUP"):

```typescript
[
  { nome: "SVAGO",        budget_mensile: 100, colore: "#EAB308", icona: "PartyPopper" },
  { nome: "BUSINESS",     budget_mensile: 140, colore: "#3B82F6", icona: "Briefcase" },
  { nome: "OBBLIGATORIE", budget_mensile: 395, colore: "#6B7280", icona: "Lock" },
  { nome: "AUTO",         budget_mensile:  75, colore: "#16A34A", icona: "Car" },
  { nome: "CASA",         budget_mensile:   0, colore: "#A16207", icona: "Home" },
  { nome: "ALIMENTARI",   budget_mensile:  50, colore: "#84CC16", icona: "ShoppingCart" },
  { nome: "SALUTE",       budget_mensile:  20, colore: "#EF4444", icona: "Stethoscope" },
  { nome: "FORMAZIONE",   budget_mensile:  30, colore: "#14B8A6", icona: "GraduationCap" },
  { nome: "INVESTIMENTO", budget_mensile:   0, colore: "#8B5CF6", icona: "TrendingUp" },
  { nome: "ALTRO",        budget_mensile:  50, colore: "#9CA3AF", icona: "MoreHorizontal" },
]
```

L'utente può aggiungere/rimuovere/rinominare/cambiare budget prima di iniziare.

### Step 3-bis — Secchielli seed

Mostra 6 secchielli user + 2 di sistema (allineati al foglio "SETUP"):

```typescript
[
  // Sistema (non eliminabili)
  { slug: "QUOTA_SOCIO", nome: "Quota Socio — conguaglio", target_importo: null, sistema: true },
  { slug: "FONDO_TASSE", nome: "Tasse & INPS",             target_importo: null, sistema: true },

  // User (modificabili/eliminabili)
  { nome: "Fondo Emergenza",            target_importo: 6000 },
  { nome: "Vacanze",                    target_importo: 1200 },
  { nome: "Pensione",                   target_importo: 1200 },
  { nome: "Polizza Vita Mediolanum",    target_importo:  600 },
  // PAC (collegati ai pac_dettaglio)
  { nome: "PAC 1 — Mediolanum Cina",    target_importo:  900 },
  { nome: "PAC 2 — Mediolanum India",   target_importo:  900 },
]
```

`FONDO_TASSE` è opzionale: si attiva se l'utente vuole l'accantonamento automatico della zavorra fiscale mensile in un bucket separato. Se disattivato, la zavorra resta solo come metrica calcolata senza spostamento di liquidità.

### Step 4 — Import dati storici (opzionale)
- Upload CSV con fatture e spese dell'anno corrente già registrate
- Formato CSV documentato (template scaricabile, vedi sotto)
- L'app importa, mostra anteprima, conferma

### Step 5 — Primo PAC (se utente ha investimenti)
- Form pre-compilato per PAC 1
- Se rileva file PRIIP allegati Mediolanum → suggerisce di importare i 2 PAC esempio (vedi `INVESTMENTS.md`)
- Skippabile

Dopo wizard → dashboard mese corrente popolata e funzionante.

---

## 📥 TEMPLATE CSV IMPORT

### `fatture.csv` (include sia FATTURA_PIVA che ENTRATA_PRIVATA)
```csv
data_emissione,data_incasso,cliente_nome,descrizione,lordo,tipo,stato,con_socio
2026-01-15,2026-02-10,Studio Rossi,Consulenza Gennaio,2500.00,FATTURA_PIVA,INCASSATO,false
2026-02-01,,Tech Startup,Marketing Q1,1200.00,FATTURA_PIVA,FATTURATO,false
2026-03-10,,Cliente Premium,Audit annuale,5000.00,FATTURA_PIVA,PROGRAMMATO,true
,2026-01-05,,FRUTTETO,500.00,ENTRATA_PRIVATA,INCASSATO,false
,2026-01-12,,REGALI,550.00,ENTRATA_PRIVATA,INCASSATO,false
```

### `spese.csv`
```csv
data,categoria,sottocategoria,descrizione,importo,tipo
2026-04-03,SVAGO,Ristorante,Cena con amici,42.50,EFFETTIVA
2026-04-05,AUTO,Carburante,Pieno benzina,68.00,EFFETTIVA
2026-04-15,BUSINESS,,Abbonamento software,29.99,PROGRAMMATA
```

### `pac.csv`
```csv
nome,isin,data_apertura,versamento_mensile,versato_totale,quote_possedute,prezzo_medio_carico,prezzo_quota_corrente,ter_annuo_pct,costo_ingresso_pct,sri_rischio,tipo_quote
Mediolanum Cina,IE00BJYLJ716,2024-10-09,75.00,2250.00,458.66,4.87,5.364,0.0292,0.03,5,ACCUMULAZIONE
Mediolanum India,IE000K6M66I3,2024-10-09,75.00,2250.00,337.011,6.63,5.489,0.0300,0.03,4,ACCUMULAZIONE
```

### `clienti.csv`
```csv
nome,partita_iva,codice_fiscale,email,telefono,note
Studio Rossi,12345678901,RSSMRA80A01H501Z,info@studiorossi.it,02-1234567,Cliente storico
```

### `secchielli.csv`
```csv
nome,colore,icona,target_importo,target_data
Vacanza Giappone,#EC4899,Plane,5000.00,2026-12-31
Fondo Emergenza,#3B82F6,Shield,,
```

---

## 📤 EXPORT FOGLIO GOOGLE SHEETS

### Quando si genera
- **Manuale**: bottone "Esporta in Google Sheets" in Impostazioni
- **Automatico** (opzionale post-MVP): cron mensile (1° del mese alle 02:00)

### Cosa contiene
- 1 foglio `SETUP` (parametri profile, sola lettura)
- 12 fogli `MESE_01`…`MESE_12` con elenco fatture, spese, riepilogo mensile (calcolati)
- 1 foglio `DASHBOARD` con KPI annuali e grafici
- 1 foglio `SCADENZE` con calendario fiscale
- 1 foglio `INVESTIMENTI` con PAC e altri asset
- 1 foglio `CLIENTI` con anagrafica e fatturato per cliente

### Implementazione
API Google Sheets v4 + service account.

> **Nota MVP**: per la prima release è accettabile un export in **CSV multipli zippati** scaricabili. Integrazione Google Sheets nativa è feature post-MVP.

---

## 🔄 EXPORT CSV (MVP)

Edge Function `POST /functions/v1/export-csv` produce un `tangerine-export-2026-05-12.zip` contenente:

```
fatture.csv
spese.csv
clienti.csv
categorie.csv
sottocategorie.csv
secchielli.csv
allocazioni.csv
pac.csv
investimenti.csv
scadenze.csv
profile.json
```

Tutti i file usano stesso formato dell'import (idempotente import-export-import).

---

## 🔗 DOCUMENTI CORRELATI

- Schema dati: `DATA_MODEL.md`
- Endpoint: `API.md`
- Esempi PAC: `INVESTMENTS.md`

---

## VERSION

```
v5.2 — Wizard 5 step, CSV bidirezionali, profile Augusto, stati FATTURATO/INCASSATO/PROGRAMMATO
```
