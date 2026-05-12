# 🚚 MIGRATION — Tangerine PWA v5.1

> Onboarding utente che arriva da foglio Tangerine v4. Wizard 5 step + import CSV + export foglio.

---

## 🧭 WIZARD ONBOARDING (5 step)

### Step 1 — Setup parametri fiscali
- Anno fiscale (default 2026)
- Coefficiente ATECO (dropdown 7 valori: 0.40 / 0.54 / 0.62 / 0.67 / 0.73 / 0.78 / 0.86)
- Aliquota imposta (5% / 15%)
- **Tipo INPS** (Commerciante / Gestione Separata)
  - Se Commerciante: minimale annuo (default 18808), fisso mensile (default 376.78), aliquota eccedenza (default 24%)
  - Se GS: aliquota GS (default 26.07% con altra copertura, 24% sola GS)

### Step 2 — Punto Zero
- Liquidità al 1° Gennaio anno corrente (manuale)
- Investimenti al 1° Gennaio (manuale)

### Step 3 — Categorie spese

Mostra 7 categorie default seed:

```typescript
[
  { nome: "BUSINESS", colore: "#3B82F6", icona: "Briefcase" },
  { nome: "AUTO", colore: "#16A34A", icona: "Car" },
  { nome: "VITA", colore: "#EC4899", icona: "Heart" },
  { nome: "SVAGO", colore: "#EAB308", icona: "PartyPopper" },
  { nome: "INVESTIMENTO", colore: "#8B5CF6", icona: "TrendingUp" },
  { nome: "FORMAZIONE", colore: "#14B8A6", icona: "GraduationCap" },
  { nome: "SALUTE", colore: "#EF4444", icona: "Stethoscope" },
]
```

L'utente può aggiungere/rimuovere/rinominare prima di iniziare.

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

### `fatture.csv`
```csv
data_emissione,data_incasso,cliente_nome,descrizione,lordo,stato,has_partner
2026-01-15,2026-02-10,Studio Rossi,Consulenza Gennaio,2500.00,INCASSATO,false
2026-02-01,,Tech Startup,Marketing Q1,1200.00,EMESSO_DA_INCASSARE,false
2026-03-10,,Cliente Premium,Audit annuale,5000.00,PROGRAMMATO,true
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

Endpoint `POST /api/export/csv` produce un `tangerine-export-2026-05-12.zip` contenente:

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
v5.1 — Wizard 5 step, CSV bidirezionali, foglio come export
```
