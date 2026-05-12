import type { Categoria, Profile, Secchiello, Fattura } from "./types";

export const PROFILE_AUGUSTO_DEFAULT: Profile = {
  anno_fiscale: 2026,
  coefficiente_redditivita: 0.78,
  aliquota_imposta: 0.05,
  tipo_inps: "ARTIGIANI",
  inps_minimale_annuo: 18415,
  inps_fisso_mensile: 384.31,
  inps_aliquota_eccedenza: 0.24,
  inps_aliquota_gs: 0.2607,
  inps_aliquota_socio_simulata: 0.2607,
  liquidita_iniziale: 0,
  investimenti_iniziali: 0,
};

export const CATEGORIE_SEED: Omit<Categoria, "id">[] = [
  { nome: "SVAGO", budget_mensile: 100, colore_hex: "#EAB308", icona: "PartyPopper", ordine: 1, attiva: true },
  { nome: "BUSINESS", budget_mensile: 140, colore_hex: "#3B82F6", icona: "Briefcase", ordine: 2, attiva: true },
  { nome: "OBBLIGATORIE", budget_mensile: 395, colore_hex: "#6B7280", icona: "Lock", ordine: 3, attiva: true },
  { nome: "AUTO", budget_mensile: 75, colore_hex: "#16A34A", icona: "Car", ordine: 4, attiva: true },
  { nome: "CASA", budget_mensile: 0, colore_hex: "#A16207", icona: "Home", ordine: 5, attiva: true },
  { nome: "ALIMENTARI", budget_mensile: 50, colore_hex: "#84CC16", icona: "ShoppingCart", ordine: 6, attiva: true },
  { nome: "SALUTE", budget_mensile: 20, colore_hex: "#EF4444", icona: "Stethoscope", ordine: 7, attiva: true },
  { nome: "FORMAZIONE", budget_mensile: 30, colore_hex: "#14B8A6", icona: "GraduationCap", ordine: 8, attiva: true },
  { nome: "INVESTIMENTO", budget_mensile: 0, colore_hex: "#8B5CF6", icona: "TrendingUp", ordine: 9, attiva: true },
  { nome: "ALTRO", budget_mensile: 50, colore_hex: "#9CA3AF", icona: "MoreHorizontal", ordine: 10, attiva: true },
];

export const SECCHIELLI_SEED: Omit<Secchiello, "id" | "created_at">[] = [
  {
    slug: "QUOTA_SOCIO",
    nome: "Quota Socio — conguaglio",
    colore_hex: "#FFC048",
    icona: "Users",
    target_importo: null,
    target_data: null,
    sistema: true,
    archiviato: false,
  },
  {
    slug: "FONDO_TASSE",
    nome: "Tasse & INPS",
    colore_hex: "#FF4D6D",
    icona: "Landmark",
    target_importo: null,
    target_data: null,
    sistema: true,
    archiviato: false,
  },
  {
    nome: "Fondo Emergenza",
    colore_hex: "#3B82F6",
    icona: "Shield",
    target_importo: 6000,
    target_data: null,
    sistema: false,
    archiviato: false,
  },
  {
    nome: "Vacanze",
    colore_hex: "#EC4899",
    icona: "Plane",
    target_importo: 1200,
    target_data: null,
    sistema: false,
    archiviato: false,
  },
  {
    nome: "Pensione",
    colore_hex: "#8B5CF6",
    icona: "PiggyBank",
    target_importo: 1200,
    target_data: null,
    sistema: false,
    archiviato: false,
  },
];

/** Demo dati Marzo 2026 di Augusto, per verificare i numeri al primo avvio. */
export function fattureSeedDemo(anno = 2026): Omit<Fattura, "id" | "created_at">[] {
  const d = (m: number, day: number) => `${anno}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return [
    { descrizione: "PIADINA", data_incasso: d(3, 5), lordo: 250, tipo: "FATTURA_PIVA", stato: "INCASSATO", con_socio: true },
    { descrizione: "DNG", data_incasso: d(3, 12), lordo: 550, tipo: "FATTURA_PIVA", stato: "INCASSATO", con_socio: true },
    { descrizione: "ROBE", data_incasso: d(3, 20), lordo: 500, tipo: "FATTURA_PIVA", stato: "INCASSATO", con_socio: true },
    { descrizione: "FRUTTETO", data_incasso: d(3, 8), lordo: 900, tipo: "ENTRATA_PRIVATA", stato: "INCASSATO", con_socio: false },
    { descrizione: "PIADINA (privato)", data_incasso: d(3, 14), lordo: 200, tipo: "ENTRATA_PRIVATA", stato: "INCASSATO", con_socio: false },
    { descrizione: "GOBBO", data_incasso: d(3, 22), lordo: 150, tipo: "ENTRATA_PRIVATA", stato: "INCASSATO", con_socio: false },
    { descrizione: "DONG", data_incasso: d(3, 28), lordo: 200, tipo: "ENTRATA_PRIVATA", stato: "INCASSATO", con_socio: false },
  ];
}
