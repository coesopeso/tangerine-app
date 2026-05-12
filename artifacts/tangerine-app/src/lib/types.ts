export type TipoInps = "ARTIGIANI" | "COMMERCIANTI" | "GESTIONE_SEPARATA";
export type TipoFattura = "FATTURA_PIVA" | "ENTRATA_PRIVATA";
export type StatoFattura = "PROGRAMMATO" | "FATTURATO" | "INCASSATO";
export type TipoSpesa = "EFFETTIVA" | "PROGRAMMATA";

export interface Profile {
  anno_fiscale: number;
  coefficiente_redditivita: number;
  aliquota_imposta: number;
  tipo_inps: TipoInps;
  inps_minimale_annuo: number;
  inps_fisso_mensile: number;
  inps_aliquota_eccedenza: number;
  inps_aliquota_gs: number;
  inps_aliquota_socio_simulata: number;
  liquidita_iniziale: number;
  investimenti_iniziali: number;
  pac_mensile_automatico?: number;
  cuscinetto_mensile_automatico?: number;
}

export interface Fattura {
  id: string;
  user_id?: string;
  cliente_id?: string | null;
  numero_fattura?: string | null;
  descrizione: string;
  data_emissione?: string | null;
  data_scadenza_pagamento?: string | null;
  data_incasso: string | null;
  lordo: number;
  tipo: TipoFattura;
  stato: StatoFattura;
  con_socio: boolean;
  note?: string | null;
  created_at?: string;
}

export interface Categoria {
  id: string;
  user_id?: string;
  nome: string;
  colore_hex: string;
  icona: string;
  budget_mensile: number;
  ordine: number;
  attiva: boolean;
}

export interface Spesa {
  id: string;
  user_id?: string;
  data: string;
  categoria_id: string;
  sottocategoria_id?: string | null;
  importo: number;
  tipo: TipoSpesa;
  descrizione: string;
  note?: string | null;
  created_at?: string;
}

export interface Secchiello {
  id: string;
  user_id?: string;
  slug?: string | null;
  nome: string;
  colore_hex: string;
  icona: string;
  target_importo: number | null;
  target_data: string | null;
  sistema: boolean;
  archiviato: boolean;
  created_at?: string;
}

export interface AllocazioneSecchiello {
  id: string;
  user_id?: string;
  secchiello_id: string;
  mese: string;
  importo: number;
  nota?: string | null;
  fonte?: "MANUALE" | "AUTO_SOCIO" | "AUTO_TASSE";
  created_at?: string;
}

export interface RiepilogoMese {
  mese: number;
  incassato_piva: number;
  incassato_privato: number;
  imponibile_mese: number;
  imponibile_ytd: number;
  tasse_mese: number;
  inps_fisso_mese: number;
  inps_eccedenza_mese: number;
  zavorra_fiscale_mese: number;
  quota_socio_mese: number;
  spese_effettive_mese: number;
  allocazioni_secchielli_mese: number;
  tax_safe_mese: number;
  saving_rate: number;
}
