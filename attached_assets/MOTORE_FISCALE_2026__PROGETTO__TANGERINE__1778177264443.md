# MOTORE FISCALE 2026: PROGETTO "TANGERINE"
## Regole, Formule e Scenari di Test

Questo documento è la fonte di verità per il calcolo del "Net-Split" nell'applicazione Tangerine. Definisce le regole fiscali 2026 e gli scenari di test per la verifica del codice.

---

### 1. Parametri Fiscali 2026 (Regime Forfettario)
| Parametro | Valore | Note |
| :--- | :--- | :--- |
| **Imposta Sostitutiva** | 5% o 15% | Toggle configurabile dall'utente. |
| **Coefficiente ATECO** | 0.78 o 0.40 | In base all'attività dell'utente. |
| **INPS Fisso Annuo** | 4.521,36 € | Contributo minimale Artigiani. |
| **INPS Fisso Mensile** | 376,78 € | Quota mensile (Annuale / 12). |
| **Soglia INPS** | 18.808,00 € | Reddito imponibile oltre il quale scatta il variabile. |
| **Aliquota Eccedenza** | 24% | Applicata solo sulla quota sopra la soglia. |

### 2. Algoritmo del "Net-Split"
Per ogni entrata lorda (`lordo`):
1.  `base_imponibile = lordo * coefficiente_ateco`
2.  `tasse = base_imponibile * imposta_sostitutiva`
3.  `inps_fisso = 376,78` (quota mensile predefinita)
4.  `inps_var = (max(0, ytd_taxable_income + base_imponibile - soglia_inps) - max(0, ytd_taxable_income - soglia_inps)) * 0.24`
5.  `netto_reale = lordo - tasse - inps_fisso - inps_var`

### 3. Scenari di Test (Verifica)

#### Scenario A: Sotto Soglia INPS
*   **Contesto:** `ytd_taxable_income` = 0.
*   **Entrata:** 5.000,00 € (Lordo).
*   **Calcoli:** `base_imponibile` = 3.900,00 €; `tasse` = 195,00 €; `inps_fisso` = 376,78 €; `inps_var` = 0,00 €.
*   **Netto Reale:** 4.428,22 €.

#### Scenario B: Superamento Soglia INPS
*   **Contesto:** `ytd_taxable_income` = 17.000,00 €.
*   **Entrata:** 3.000,00 € (Lordo).
*   **Calcoli:** `base_imponibile` = 2.340,00 €; `tasse` = 117,00 €; `inps_fisso` = 376,78 €.
*   **Eccedenza:** `(17.000 + 2.340) - 18.808 = 532,00 €`.
*   **INPS Var:** `532,00 * 0.24 = 127,68 €`.
*   **Netto Reale:** 2.378,54 €.

### 4. Note Operative
*   Il valore `ytd_taxable_income` deve essere aggiornato nel database dopo ogni calcolo.
*   L'utente deve poter modificare i parametri (aliquota e coefficiente) dalle impostazioni.
