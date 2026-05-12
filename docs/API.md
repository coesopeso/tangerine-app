# 🌐 API — Tangerine PWA v5.1

> REST endpoint Hono. Tutte le mutation validate con **Zod schema condiviso client/server**.

---

## 🔑 PRINCIPI

- REST puro, no tRPC
- Mutation con Zod
- **Calcoli sempre on-the-fly**, mai persistere campi calcolati
- Auth: middleware PIN-session (cookie httpOnly)

---

## 📋 ENDPOINTS

### Profile
```
GET    /api/profile
PUT    /api/profile
```

### Clienti
```
GET    /api/clienti?attivo=true
POST   /api/clienti
PUT    /api/clienti/:id
DELETE /api/clienti/:id              # soft: attivo=false se ha fatture
GET    /api/clienti/:id/stats        # ytd, anno_prec, ultima fattura, delta
```

### Fatture
```
GET    /api/fatture?anno=&mese=&stato=&cliente_id=
POST   /api/fatture
PUT    /api/fatture/:id
DELETE /api/fatture/:id
PATCH  /api/fatture/:id/stato        # body: {nuovo_stato, data_incasso?}
```

### Entrate private (DEPRECATO endpoint dedicato in v5.1.1)
> Le entrate private (ex `entrata_netta`) ora sono righe `fattura` con `tipo='ENTRATA_PRIVATA'`. Usa gli endpoint `/api/fatture` con filtro `?tipo=ENTRATA_PRIVATA`. Nessun endpoint dedicato.

### Spese
```
GET    /api/spese?anno=&mese=&categoria_id=&tipo=
POST   /api/spese
PUT    /api/spese/:id
DELETE /api/spese/:id
```

### Categorie e sottocategorie
```
GET    /api/categorie
POST   /api/categorie
PUT    /api/categorie/:id
DELETE /api/categorie/:id            # soft se ha spese
GET    /api/categorie/:id/sottocategorie
POST   /api/sottocategorie
PUT    /api/sottocategorie/:id
DELETE /api/sottocategorie/:id
```

### Secchielli
```
GET    /api/secchielli?archiviato=false
POST   /api/secchielli
PUT    /api/secchielli/:id
DELETE /api/secchielli/:id
POST   /api/secchielli/:id/allocazioni
GET    /api/secchielli/:id/allocazioni?anno=
```

### PAC
```
GET    /api/pac?archiviato=false
POST   /api/pac
PUT    /api/pac/:id
DELETE /api/pac/:id
PATCH  /api/pac/:id/prezzo           # body: {prezzo_quota_corrente, data}
```

### Investimenti (non-PAC)
```
GET    /api/investimenti
POST   /api/investimenti
PUT    /api/investimenti/:id
DELETE /api/investimenti/:id
```

### Scadenze fiscali
```
GET    /api/scadenze?prossimi_giorni=90
POST   /api/scadenze
PUT    /api/scadenze/:id
PATCH  /api/scadenze/:id/paga        # body: {importo, data}
```

### Dashboard (calcoli on-the-fly)
```
GET    /api/dashboard/mese/:anno/:mese
GET    /api/dashboard/anno/:anno
GET    /api/dashboard/patrimonio
```

### Auth
```
POST   /api/auth/setup-pin           # primo avvio
POST   /api/auth/login               # body: {pin}
POST   /api/auth/logout
GET    /api/auth/session
```

### Export
```
POST   /api/export/csv               # zip multipli CSV
POST   /api/export/google-sheets     # post-MVP
```

---

## 📦 PAYLOAD STANDARD

### Risposta dashboard mese
```typescript
{
  mese: number,
  anno: number,
  incassato_piva: number,         // solo FATTURA_PIVA INCASSATO
  incassato_privato: number,      // ENTRATA_PRIVATA INCASSATO
  imponibile_mese: number,
  imponibile_ytd: number,
  tasse_mese: number,
  inps_fisso_mese: number,
  inps_eccedenza_mese: number,
  zavorra_fiscale_mese: number,   // tasse + inps_fisso + inps_eccedenza (NO socio)
  quota_socio_mese: number,       // simulata, va in secchiello QUOTA_SOCIO
  spese_effettive_mese: number,
  allocazioni_secchielli_mese: number,
  tax_safe_mese: number,
  saving_rate: number,
  prossime_scadenze: ScadenzaFiscale[]
}
```

### Errori
```typescript
{
  error: string,        // codice machine-readable es. "VALIDATION_FAILED"
  message: string,      // messaggio UI italiano
  field?: string,       // se errore Zod su campo specifico
  details?: unknown     // debug only
}
```

HTTP status:
- 200 — OK
- 201 — Created
- 400 — Validation error (Zod)
- 401 — Non autenticato
- 404 — Not found
- 409 — Conflict (es. soft-delete impossibile per FK)
- 500 — Errore server

---

## 🔒 AUTH MIDDLEWARE

Tutte le route `/api/*` (eccetto `/api/auth/*`) richiedono session valida.

```typescript
import { authMiddleware } from './middleware/auth';
app.use('/api/*', authMiddleware);
```

Session: cookie httpOnly, 30 giorni di durata, rinnovo on-activity.

---

## 🧪 TEST ENDPOINT

Prima di fare merge:
- Tutti gli endpoint mutation hanno schema Zod
- Tutti i campi numeric arrivano come `number`, non string
- Date serializzate come ISO 8601
- Soft delete testato per cliente/categoria/secchiello con record collegati

---

## 🔗 DOCUMENTI CORRELATI

- Schema dati: `DATA_MODEL.md`
- Calcoli dashboard: `FISCAL_ENGINE.md`
- Stack: `ARCHITECTURE.md`

---

## VERSION

```
v5.1 — REST puro, Zod condiviso, dashboard on-the-fly
```
