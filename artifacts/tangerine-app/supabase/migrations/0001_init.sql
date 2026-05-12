-- Tangerine v5.2 — initial schema
-- Tutto scoped per user_id (auth.uid()) con Row Level Security obbligatoria.

create extension if not exists "pgcrypto";

-- ─── ENUMS ──────────────────────────────────────────────
create type tipo_fattura       as enum ('FATTURA_PIVA', 'ENTRATA_PRIVATA');
create type stato_fattura      as enum ('PROGRAMMATO', 'FATTURATO', 'INCASSATO');
create type tipo_spesa         as enum ('EFFETTIVA', 'PROGRAMMATA');
create type tipo_inps          as enum ('ARTIGIANI', 'COMMERCIANTI', 'GESTIONE_SEPARATA');
create type tipo_investimento  as enum ('ETF', 'CRYPTO', 'AZIONE', 'OBBLIGAZIONE', 'ALTRO');
create type tipo_scadenza      as enum ('SALDO_IRPEF','ACCONTO_IRPEF_1','ACCONTO_IRPEF_2','INPS_TRIM','INPS_ECCEDENZA','IVA','CCIAA','ALTRO');
create type tema_app           as enum ('LIGHT', 'DARK', 'AUTO');

-- ─── PROFILE (record singolo) ───────────────────────────
create table public.profile (
  user_id uuid primary key references auth.users on delete cascade,
  anno_fiscale int not null default 2026,
  coefficiente_redditivita numeric(4,2) not null default 0.78,
  aliquota_imposta numeric(4,2) not null default 0.05,
  tipo_inps tipo_inps not null default 'ARTIGIANI',
  inps_minimale_annuo numeric(12,2) not null default 18415.00,
  inps_fisso_mensile numeric(12,2) not null default 384.31,
  inps_aliquota_eccedenza numeric(5,4) not null default 0.2400,
  inps_aliquota_gs numeric(5,4) not null default 0.2607,
  inps_aliquota_socio_simulata numeric(5,4) not null default 0.2607,
  liquidita_iniziale numeric(12,2) not null default 0,
  investimenti_iniziali numeric(12,2) not null default 0,
  pac_mensile_automatico numeric(12,2) not null default 0,
  cuscinetto_mensile_automatico numeric(12,2) not null default 0,
  tema tema_app not null default 'DARK',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── CLIENTE ────────────────────────────────────────────
create table public.cliente (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  nome text not null,
  partita_iva text,
  codice_fiscale text,
  email text,
  telefono text,
  note text,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── FATTURA ────────────────────────────────────────────
create table public.fattura (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  cliente_id uuid references public.cliente on delete set null,
  numero_fattura text,
  descrizione text not null default '',
  data_emissione date,
  data_scadenza_pagamento date,
  data_incasso date,
  lordo numeric(12,2) not null,
  tipo tipo_fattura not null default 'FATTURA_PIVA',
  stato stato_fattura not null default 'INCASSATO',
  con_socio boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);
create index fattura_user_incasso_idx on public.fattura(user_id, data_incasso);

-- ─── CATEGORIA / SOTTOCATEGORIA ─────────────────────────
create table public.categoria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  nome text not null,
  colore_hex text not null default '#9CA3AF',
  icona text not null default 'Tag',
  budget_mensile numeric(12,2) not null default 0,
  ordine int not null default 0,
  attiva boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sottocategoria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  categoria_id uuid not null references public.categoria on delete cascade,
  nome text not null,
  attiva boolean not null default true
);

-- ─── SPESA ──────────────────────────────────────────────
create table public.spesa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  data date not null,
  categoria_id uuid not null references public.categoria,
  sottocategoria_id uuid references public.sottocategoria,
  importo numeric(12,2) not null check (importo >= 0),
  tipo tipo_spesa not null default 'EFFETTIVA',
  descrizione text not null default '',
  note text,
  created_at timestamptz not null default now()
);
create index spesa_user_data_idx on public.spesa(user_id, data);

-- ─── SECCHIELLO ─────────────────────────────────────────
create table public.secchiello (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  slug text,
  nome text not null,
  colore_hex text not null default '#FFC048',
  icona text not null default 'PiggyBank',
  target_importo numeric(12,2),
  target_data date,
  sistema boolean not null default false,
  archiviato boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.allocazione_secchiello (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  secchiello_id uuid not null references public.secchiello on delete cascade,
  mese date not null,                  -- primo del mese
  importo numeric(12,2) not null,
  nota text,
  fonte text not null default 'MANUALE',  -- MANUALE | AUTO_SOCIO | AUTO_TASSE
  created_at timestamptz not null default now()
);
create index alloc_user_mese_idx on public.allocazione_secchiello(user_id, mese);

-- ─── INVESTIMENTI ───────────────────────────────────────
create table public.pac_dettaglio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  nome text not null,
  nome_completo text,
  isin text,
  emittente text,
  categoria_morningstar text,
  data_apertura date,
  versamento_mensile numeric(12,2) not null default 0,
  versato_totale numeric(12,2) not null default 0,
  investito_netto numeric(12,2) not null default 0,
  quote_possedute numeric(18,6) not null default 0,
  prezzo_medio_carico numeric(12,4) not null default 0,
  prezzo_quota_corrente numeric(12,4) not null default 0,
  data_aggiornamento_prezzo date,
  costo_ingresso_pct numeric(6,4) not null default 0,
  ter_annuo_pct numeric(6,4) not null default 0,
  sri_rischio int,
  tipo_quote text,
  note text,
  archiviato boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.investimento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  tipo tipo_investimento not null,
  nome text not null,
  ticker text,
  quantita numeric(18,6) not null default 0,
  prezzo_medio_carico numeric(12,4) not null default 0,
  prezzo_corrente numeric(12,4) not null default 0,
  data_aggiornamento_prezzo date,
  note text,
  archiviato boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── SCADENZE FISCALI ──────────────────────────────────
create table public.scadenza_fiscale (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  tipo tipo_scadenza not null,
  data_scadenza date not null,
  descrizione text not null,
  importo_dovuto numeric(12,2) not null default 0,
  importo_pagato numeric(12,2) not null default 0,
  data_pagamento date,
  note text
);

-- ─── AUTH PIN (1-1 con utente) ─────────────────────────
create table public.auth_pin (
  user_id uuid primary key references auth.users on delete cascade,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- ─── PUSH SUBSCRIPTION ─────────────────────────────────
create table public.push_subscription (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  device_label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- ─── RLS ────────────────────────────────────────────────
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profile','cliente','fattura','categoria','sottocategoria','spesa',
    'secchiello','allocazione_secchiello','pac_dettaglio','investimento',
    'scadenza_fiscale','auth_pin','push_subscription'
  ]) loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$
      create policy %I_owner on public.%I
        for all to authenticated
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t || '_owner', t);
  end loop;
end $$;

-- ─── TRIGGER updated_at su profile ─────────────────────
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;

create trigger profile_updated_at before update on public.profile
  for each row execute function public.touch_updated_at();
