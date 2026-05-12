# 📈 INVESTMENTS — Tangerine PWA v5.2

> PAC, secchielli, esempi concreti popolati. L'app deve essere brutalmente onesta sui costi.

---

## 💸 PAC: il caso "soldi che ti costano molto"

Per ogni PAC mostrare in card:

```
┌─────────────────────────────────────────────────┐
│  Mediolanum Cina                          🔴    │
│  Azionari Paesi Emergenti · SRI 5/7              │
│                                                  │
│  Controvalore        2.460,26 €                 │
│  Versato totale      2.250,00 €                 │
│  ─────────────────────────────                  │
│  P/L                 +210,26 €  (+9,34%)        │
│                                                  │
│  ⚠️ Costo annualizzato: ~99 €/anno               │
│  (11% del versato annuo)                         │
│                                                  │
│  [Vedi dettaglio]                                │
└─────────────────────────────────────────────────┘
```

---

## 🧮 FORMULE PAC (calcoli on-the-fly)

Vedi schema `pac_dettaglio` in `DATA_MODEL.md` per i campi.

```typescript
controvalore = quote_possedute * prezzo_quota_corrente
pl_assoluto = controvalore - versato_totale
pl_percentuale = pl_assoluto / versato_totale

versato_annuo = versamento_mensile * 12

costo_ingresso_anno = versato_annuo * costo_ingresso_pct
costo_gestione_anno = controvalore * ter_annuo_pct
costo_totale_anno = costo_ingresso_anno + costo_gestione_anno

incidenza_costi_pct = costo_totale_anno / versato_annuo
```

### Badge colore (su `incidenza_costi_pct`)

| Soglia | Badge | Significato |
|---|---|---|
| `< 0.03` | 🟢 VERDE | Costi accettabili |
| `0.03 ≤ x < 0.05` | 🟡 GIALLO | Attenzione |
| `0.05 ≤ x < 0.08` | 🟠 ARANCIONE | Costi elevati |
| `≥ 0.08` | 🔴 ROSSO | Costi insostenibili |

---

## 📊 ESEMPI CONCRETI DELL'UTENTE (popolare al primo accesso)

### PAC 1 — Mediolanum Chinese Road Opportunity L

```typescript
{
  nome: "Mediolanum Cina",
  nome_completo: "Mediolanum Chinese Road Opportunity L",
  isin: "IE00BJYLJ716",
  emittente: "Mediolanum International Funds Limited",
  categoria_morningstar: "Azionari Paesi Emergenti",
  data_apertura: "2024-10-09",
  versamento_mensile: 75.00,
  versato_totale: 2250.00,
  investito_netto: 2234.85,
  quote_possedute: 458.66,
  prezzo_medio_carico: 4.87,
  prezzo_quota_corrente: 5.364,
  data_aggiornamento_prezzo: "2026-05-05",
  costo_ingresso_pct: 0.03,
  ter_annuo_pct: 0.0292,
  sri_rischio: 5,
  tipo_quote: "ACCUMULAZIONE"
}
```

**Calcoli derivati**:
- controvalore = 458.66 × 5.364 = **2.460,26 €**
- pl_assoluto = 2460.26 − 2250.00 = **+210,26 €**
- pl_percentuale = **+9,34%**
- costo_ingresso_anno = 75 × 12 × 0.03 = **27,00 €/anno**
- costo_gestione_anno = 2460.26 × 0.0292 = **71,84 €/anno**
- costo_totale_anno = **98,84 €/anno**
- incidenza_costi_pct = 98.84 / 900 = **10,98%** → 🔴 ROSSO

### PAC 2 — Mediolanum India Opportunities L A

```typescript
{
  nome: "Mediolanum India",
  nome_completo: "Mediolanum India Opportunities L A Euro",
  isin: "IE000K6M66I3",
  emittente: "Mediolanum International Funds Limited",
  categoria_morningstar: "Azionari Paesi Emergenti",
  data_apertura: "2024-10-09",
  versamento_mensile: 75.00,
  versato_totale: 2250.00,
  investito_netto: 2234.85,
  quote_possedute: 337.011,
  prezzo_medio_carico: 6.63,
  prezzo_quota_corrente: 5.489,
  data_aggiornamento_prezzo: "2026-05-05",
  costo_ingresso_pct: 0.03,
  ter_annuo_pct: 0.0300,
  sri_rischio: 4,
  tipo_quote: "ACCUMULAZIONE"
}
```

**Calcoli derivati**:
- controvalore = 337.011 × 5.489 = **1.849,85 €**
- pl_assoluto = 1849.85 − 2250.00 = **−400,15 €**
- pl_percentuale = **−17,78%**
- costo_ingresso_anno = 27,00 €
- costo_gestione_anno = 1849.85 × 0.03 = 55,50 €
- costo_totale_anno = **82,50 €/anno**
- incidenza_costi_pct = 82.50 / 900 = **9,17%** → 🔴 ROSSO

### Riepilogo PAC totale (mostrato in dashboard Patrimonio)

- Versato totale: **4.500 €**
- Controvalore totale: **4.310,11 €**
- P/L totale: **−189,89 € (−4,22%)**
- **Costo totale annuo stimato: ~181 €/anno** (10,1% del versato annuo)
- Avviso UI: *"I tuoi PAC ti costano 181 €/anno in commissioni. Per essere in pari devono rendere almeno il 10% lordo annuo."*

---

## 🔄 AGGIORNAMENTO PREZZI

- **MVP**: input manuale del `prezzo_quota_corrente` (1 volta al mese, 30 secondi)
- **Post-MVP**: API gratuita per ETF/azioni quotate. Per fondi Mediolanum probabilmente sempre manuale (no API pubblica gratuita)

---

## 🪣 SECCHIELLI

### Tipologie tipiche
- Fondo Emergenza
- Vacanza X
- Pensione
- Acquisto Casa
- Auto Nuova
- Tasse e INPS (se preferisci accantonare manualmente)

### CRUD completo
Tutti i secchielli sono creabili, modificabili, archiviabili. Vedi `DATA_MODEL.md`.

### Target opzionale
- Se ha **target** (importo + data): barra progresso + *"ti mancano X € in Y mesi → quota mensile suggerita Z €/mese"*
- Se **non ha target** (es. Fondo Emergenza indefinito): solo accumulato visualizzato

### Allocazioni mensili
- Inserite manualmente in QuickAdd (toggle "Allocazione secchiello")
- O suggerite automaticamente se `cuscinetto_mensile_automatico` o `pac_mensile_automatico` settati in profile

---

## 🔁 PAC = SPESA + ALLOCAZIONE + INVESTIMENTO

Quando l'utente registra "PAC mensile 75 € a Mediolanum Cina", in una sola azione l'app crea:

1. Una `spesa` con categoria INVESTIMENTO, importo 75 €
2. Un'`allocazione_secchiello` (se collegato a un secchiello "PAC Cina")
3. Aggiorna `pac_dettaglio.versato_totale += 75` e `quote_possedute += 75 / prezzo_quota_corrente`

**Single source of truth**: `spesa` è il record principale, le altre sono derivate/collegate.

---

## 📈 INVESTIMENTI NON-PAC

ETF, crypto, azioni, obbligazioni one-shot. Schema `investimento` in `DATA_MODEL.md`.

Calcoli analoghi al PAC ma senza versamenti ricorrenti:
- `controvalore = quantita * prezzo_corrente`
- `pl = controvalore - (quantita * prezzo_medio_carico)`

---

## 🔗 DOCUMENTI CORRELATI

- Schema DB: `DATA_MODEL.md`
- UI card PAC: `UX_RULES.md`
- Endpoint: `API.md`

---

## VERSION

```
v5.2 — Esempi Mediolanum Cina/India popolati, formule costi, badge incidenza (profilo Augusto)
```
