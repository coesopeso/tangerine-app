-- =============================================================================
-- Tangerine PWA — Schema iniziale v5.2
-- =============================================================================
-- Source of truth: docs/DATA_MODEL.md v5.2
--
-- ATTENZIONE: questa migrazione droppa tutte le tabelle "test" eventualmente
-- esistenti nello schema public (le 4 tabelle pre-v5.2). Eseguire SOLO dopo
-- conferma esplicita dell'utente che i dati Supabase attuali sono di test.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. DROP TABELLE DI TEST (pre v5.2)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.allocazione_secchiello CASCADE;
DROP TABLE IF EXISTS public.secchiello             CASCADE;
DROP TABLE IF EXISTS public.sottocategoria         CASCADE;
DROP TABLE IF EXISTS public.categoria              CASCADE;
DROP TABLE IF EXISTS public.spesa                  CASCADE;
DROP TABLE IF EXISTS public.fattura                CASCADE;
DROP TABLE IF EXISTS public.entrata_netta          CASCADE;
DROP TABLE IF EXISTS public.cliente                CASCADE;
DROP TABLE IF EXISTS public.pac_dettaglio          CASCADE;
DROP TABLE IF EXISTS public.investimento           CASCADE;
DROP TABLE IF EXISTS public.scadenza_fiscale       CASCADE;
DROP TABLE IF EXISTS public.push_subscription      CASCADE;
DROP TABLE IF EXISTS public.auth_pin               CASCADE;
DROP TABLE IF EXISTS public.profile                CASCADE;

DROP VIEW IF EXISTS public.cliente_stats           CASCADE;
DROP VIEW IF EXISTS public.secchiello_stats        CASCADE;

DROP TYPE IF EXISTS public.tipo_fattura            CASCADE;
DROP TYPE IF EXISTS public.stato_fattura           CASCADE;
DROP TYPE IF EXISTS public.tipo_spesa              CASCADE;
DROP TYPE IF EXISTS public.tipo_inps               CASCADE;
DROP TYPE IF EXISTS public.tipo_investimento       CASCADE;
DROP TYPE IF EXISTS public.tipo_scadenza           CASCADE;
DROP TYPE IF EXISTS public.tipo_quote_pac          CASCADE;
DROP TYPE IF EXISTS public.tema                    CASCADE;

-- -----------------------------------------------------------------------------
-- 1. ENUM
-- -----------------------------------------------------------------------------
CREATE TYPE public.tipo_fattura      AS ENUM ('FATTURA_PIVA','ENTRATA_PRIVATA');
CREATE TYPE public.stato_fattura     AS ENUM ('PROGRAMMATO','FATTURATO','INCASSATO');
CREATE TYPE public.tipo_spesa        AS ENUM ('EFFETTIVA','PROGRAMMATA');
CREATE TYPE public.tipo_inps         AS ENUM ('ARTIGIANI','COMMERCIANTI','GESTIONE_SEPARATA');
CREATE TYPE public.tipo_investimento AS ENUM ('ETF','CRYPTO','AZIONE','OBBLIGAZIONE','ALTRO');
CREATE TYPE public.tipo_scadenza     AS ENUM (
  'SALDO_IRPEF','ACCONTO_IRPEF_1','ACCONTO_IRPEF_2',
  'INPS_TRIM','INPS_ECCEDENZA','IVA','CCIAA','ALTRO'
);
CREATE TYPE public.tipo_quote_pac    AS ENUM ('ACCUMULAZIONE','DISTRIBUZIONE');
CREATE TYPE public.tema              AS ENUM ('LIGHT','DARK','AUTO');

-- -----------------------------------------------------------------------------
-- 2. TABELLE
-- -----------------------------------------------------------------------------

-- profile (record singolo per utente)
CREATE TABLE public.profile (
  user_id                         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  anno_fiscale                    int            NOT NULL DEFAULT 2026,
  coefficiente_redditivita        numeric(5,4)   NOT NULL DEFAULT 0.78,
  aliquota_imposta                numeric(5,4)   NOT NULL DEFAULT 0.05,
  tipo_inps                       public.tipo_inps NOT NULL DEFAULT 'ARTIGIANI',
  inps_minimale_annuo             numeric(12,2)  NOT NULL DEFAULT 18415.00,
  inps_fisso_mensile              numeric(12,2)  NOT NULL DEFAULT 384.31,
  inps_aliquota_eccedenza         numeric(5,4)   NOT NULL DEFAULT 0.24,
  inps_aliquota_gs                numeric(5,4)   NOT NULL DEFAULT 0.2607,
  inps_aliquota_socio_simulata    numeric(5,4)   NOT NULL DEFAULT 0.2607,
  liquidita_iniziale              numeric(12,2)  NOT NULL DEFAULT 0,
  investimenti_iniziali           numeric(12,2)  NOT NULL DEFAULT 0,
  pac_mensile_automatico          numeric(12,2)  NOT NULL DEFAULT 0,
  cuscinetto_mensile_automatico   numeric(12,2)  NOT NULL DEFAULT 0,
  accantonamento_automatico       boolean        NOT NULL DEFAULT false,
  tema                            public.tema    NOT NULL DEFAULT 'AUTO',
  onboarding_completato           boolean        NOT NULL DEFAULT false,
  created_at                      timestamptz    NOT NULL DEFAULT now(),
  updated_at                      timestamptz    NOT NULL DEFAULT now()
);

-- cliente
CREATE TABLE public.cliente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome            text NOT NULL,
  partita_iva     text,
  codice_fiscale  text,
  email           text,
  telefono        text,
  note            text,
  attivo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cliente_user ON public.cliente(user_id);

-- categoria
CREATE TABLE public.categoria (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             text NOT NULL,
  colore_hex       text NOT NULL DEFAULT '#9CA3AF',
  icona            text NOT NULL DEFAULT 'Circle',
  ordine           int  NOT NULL DEFAULT 0,
  budget_mensile   numeric(12,2) NOT NULL DEFAULT 0,
  attiva           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_categoria_user ON public.categoria(user_id);

-- sottocategoria
CREATE TABLE public.sottocategoria (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id  uuid NOT NULL REFERENCES public.categoria(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  attiva        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sottocategoria_user ON public.sottocategoria(user_id);
CREATE INDEX idx_sottocategoria_categoria ON public.sottocategoria(categoria_id);

-- fattura (entrate da P.IVA + entrate private)
CREATE TABLE public.fattura (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id               uuid REFERENCES public.cliente(id) ON DELETE SET NULL,
  numero_fattura           text,
  data_emissione           date,
  data_scadenza_pagamento  date,
  data_incasso             date,
  descrizione              text,
  lordo                    numeric(12,2) NOT NULL,
  tipo                     public.tipo_fattura  NOT NULL DEFAULT 'FATTURA_PIVA',
  stato                    public.stato_fattura NOT NULL DEFAULT 'FATTURATO',
  con_socio                boolean NOT NULL DEFAULT false,
  note                     text,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fattura_user            ON public.fattura(user_id);
CREATE INDEX idx_fattura_data_incasso    ON public.fattura(data_incasso, stato);
CREATE INDEX idx_fattura_cliente         ON public.fattura(cliente_id);

-- spesa
CREATE TABLE public.spesa (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data              date NOT NULL,
  categoria_id      uuid NOT NULL REFERENCES public.categoria(id) ON DELETE RESTRICT,
  sottocategoria_id uuid REFERENCES public.sottocategoria(id) ON DELETE SET NULL,
  importo           numeric(12,2) NOT NULL CHECK (importo >= 0),
  tipo              public.tipo_spesa NOT NULL DEFAULT 'EFFETTIVA',
  descrizione       text,
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_spesa_user           ON public.spesa(user_id);
CREATE INDEX idx_spesa_data_categoria ON public.spesa(data, categoria_id);

-- secchiello (con flag sistema + slug)
CREATE TABLE public.secchiello (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug            text,
  nome            text NOT NULL,
  colore_hex      text NOT NULL DEFAULT '#3B82F6',
  icona           text NOT NULL DEFAULT 'PiggyBank',
  target_importo  numeric(12,2),
  target_data     date,
  sistema         boolean NOT NULL DEFAULT false,
  archiviato      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
CREATE INDEX idx_secchiello_user ON public.secchiello(user_id);

-- allocazione_secchiello
CREATE TABLE public.allocazione_secchiello (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secchiello_id  uuid NOT NULL REFERENCES public.secchiello(id) ON DELETE CASCADE,
  mese           date NOT NULL,
  importo        numeric(12,2) NOT NULL,
  nota           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_allocazione_secchiello_mese ON public.allocazione_secchiello(secchiello_id, mese);
CREATE INDEX idx_allocazione_user            ON public.allocazione_secchiello(user_id);

-- pac_dettaglio
CREATE TABLE public.pac_dettaglio (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome                        text NOT NULL,
  nome_completo               text,
  isin                        text,
  emittente                   text,
  categoria_morningstar       text,
  data_apertura               date,
  versamento_mensile          numeric(12,2) NOT NULL DEFAULT 0,
  versato_totale              numeric(12,2) NOT NULL DEFAULT 0,
  investito_netto             numeric(12,2) NOT NULL DEFAULT 0,
  quote_possedute             numeric(18,6) NOT NULL DEFAULT 0,
  prezzo_medio_carico         numeric(12,4) NOT NULL DEFAULT 0,
  prezzo_quota_corrente       numeric(12,4) NOT NULL DEFAULT 0,
  data_aggiornamento_prezzo   date,
  costo_ingresso_pct          numeric(6,4)  NOT NULL DEFAULT 0,
  ter_annuo_pct               numeric(6,4)  NOT NULL DEFAULT 0,
  sri_rischio                 int CHECK (sri_rischio BETWEEN 1 AND 7),
  tipo_quote                  public.tipo_quote_pac NOT NULL DEFAULT 'ACCUMULAZIONE',
  note                        text,
  archiviato                  boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pac_user ON public.pac_dettaglio(user_id);

-- investimento
CREATE TABLE public.investimento (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo                       public.tipo_investimento NOT NULL,
  nome                       text NOT NULL,
  ticker                     text,
  quantita                   numeric(18,6) NOT NULL DEFAULT 0,
  prezzo_medio_carico        numeric(12,4) NOT NULL DEFAULT 0,
  prezzo_corrente            numeric(12,4) NOT NULL DEFAULT 0,
  data_aggiornamento_prezzo  date,
  note                       text,
  archiviato                 boolean NOT NULL DEFAULT false,
  created_at                 timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_investimento_user ON public.investimento(user_id);

-- scadenza_fiscale
CREATE TABLE public.scadenza_fiscale (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo            public.tipo_scadenza NOT NULL,
  data_scadenza   date NOT NULL,
  descrizione     text,
  importo_dovuto  numeric(12,2) NOT NULL DEFAULT 0,
  importo_pagato  numeric(12,2) NOT NULL DEFAULT 0,
  data_pagamento  date,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scadenza_user_data ON public.scadenza_fiscale(user_id, data_scadenza);

-- push_subscription
CREATE TABLE public.push_subscription (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      text NOT NULL,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  device_label  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- auth_pin
CREATE TABLE public.auth_pin (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash         text NOT NULL,
  failed_attempts  int  NOT NULL DEFAULT 0,
  locked_until     timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3. TRIGGER updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_updated_at
  BEFORE UPDATE ON public.profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auth_pin_updated_at
  BEFORE UPDATE ON public.auth_pin
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE public.profile                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sottocategoria         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fattura                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spesa                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secchiello             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocazione_secchiello ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pac_dettaglio          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investimento           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scadenza_fiscale       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscription      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_pin               ENABLE ROW LEVEL SECURITY;

-- Policy uniforme "owner only": l'utente vede/modifica solo le righe con user_id = auth.uid()
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profile','cliente','categoria','sottocategoria','fattura','spesa',
    'secchiello','allocazione_secchiello','pac_dettaglio','investimento',
    'scadenza_fiscale','push_subscription','auth_pin'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (user_id = auth.uid());',
      t || '_select_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (user_id = auth.uid());',
      t || '_insert_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());',
      t || '_update_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (user_id = auth.uid());',
      t || '_delete_own', t);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5. VISTE CALCOLATE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.cliente_stats
WITH (security_invoker = true) AS
WITH ult AS (
  SELECT DISTINCT ON (f.cliente_id)
    f.cliente_id,
    f.user_id,
    f.data_emissione AS ultima_fattura_data,
    f.lordo          AS ultima_fattura_lordo
  FROM public.fattura f
  WHERE f.cliente_id IS NOT NULL
    AND f.tipo = 'FATTURA_PIVA'
  ORDER BY f.cliente_id, f.data_emissione DESC NULLS LAST, f.created_at DESC
),
penult AS (
  SELECT
    f.cliente_id,
    f.lordo AS penultima_lordo
  FROM (
    SELECT
      f.cliente_id,
      f.lordo,
      ROW_NUMBER() OVER (
        PARTITION BY f.cliente_id
        ORDER BY f.data_emissione DESC NULLS LAST, f.created_at DESC
      ) AS rn
    FROM public.fattura f
    WHERE f.cliente_id IS NOT NULL AND f.tipo = 'FATTURA_PIVA'
  ) f
  WHERE f.rn = 2
)
SELECT
  c.id      AS cliente_id,
  c.user_id,
  COALESCE(SUM(f.lordo) FILTER (
    WHERE f.stato = 'INCASSATO'
      AND f.tipo  = 'FATTURA_PIVA'
      AND date_part('year', f.data_incasso) = date_part('year', CURRENT_DATE)
  ), 0)::numeric(12,2) AS fatturato_ytd,
  COALESCE(SUM(f.lordo) FILTER (
    WHERE f.stato = 'INCASSATO'
      AND f.tipo  = 'FATTURA_PIVA'
      AND date_part('year', f.data_incasso) = date_part('year', CURRENT_DATE) - 1
  ), 0)::numeric(12,2) AS fatturato_anno_precedente,
  COUNT(*) FILTER (
    WHERE f.stato = 'INCASSATO'
      AND f.tipo  = 'FATTURA_PIVA'
      AND date_part('year', f.data_incasso) = date_part('year', CURRENT_DATE)
  )::int AS numero_fatture_ytd,
  ult.ultima_fattura_data,
  ult.ultima_fattura_lordo,
  CASE
    WHEN penult.penultima_lordo IS NOT NULL AND penult.penultima_lordo <> 0
    THEN ((ult.ultima_fattura_lordo - penult.penultima_lordo) / penult.penultima_lordo * 100)::numeric(8,2)
    ELSE NULL
  END AS delta_vs_ultima_pct
FROM public.cliente c
LEFT JOIN public.fattura f ON f.cliente_id = c.id AND f.user_id = c.user_id
LEFT JOIN ult              ON ult.cliente_id = c.id
LEFT JOIN penult           ON penult.cliente_id = c.id
GROUP BY c.id, c.user_id, ult.ultima_fattura_data, ult.ultima_fattura_lordo, penult.penultima_lordo;

CREATE OR REPLACE VIEW public.secchiello_stats
WITH (security_invoker = true) AS
SELECT
  s.id      AS secchiello_id,
  s.user_id,
  COALESCE(SUM(a.importo), 0)::numeric(12,2) AS accumulato_totale,
  CASE
    WHEN s.target_importo IS NOT NULL AND s.target_importo > 0
    THEN LEAST(100, (COALESCE(SUM(a.importo), 0) / s.target_importo * 100))::numeric(6,2)
    ELSE NULL
  END AS progresso_pct,
  CASE
    WHEN s.target_importo IS NOT NULL
     AND s.target_data    IS NOT NULL
     AND s.target_data    > CURRENT_DATE
    THEN GREATEST(
      0,
      (s.target_importo - COALESCE(SUM(a.importo), 0))
      / GREATEST(
          1,
          (date_part('year',  age(s.target_data, CURRENT_DATE)) * 12
         + date_part('month', age(s.target_data, CURRENT_DATE)))
        )
    )::numeric(12,2)
    ELSE NULL
  END AS quota_mensile_suggerita
FROM public.secchiello s
LEFT JOIN public.allocazione_secchiello a
  ON a.secchiello_id = s.id AND a.user_id = s.user_id
GROUP BY s.id, s.user_id;

-- -----------------------------------------------------------------------------
-- 6. SEED AUTOMATICO PER NUOVO UTENTE
-- -----------------------------------------------------------------------------
-- Quando viene creato un utente in auth.users, popoliamo:
--   - profile con i default Augusto / Artigiani 2026
--   - 10 categorie default (allineate al foglio SETUP)
--   - secchielli sistema QUOTA_SOCIO + FONDO_TASSE (non eliminabili)
-- L'app marca onboarding_completato=true al termine del wizard.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- profile (Augusto / Artigiani 2026)
  INSERT INTO public.profile (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- categorie default (vedi MIGRATION.md Step 3)
  INSERT INTO public.categoria (user_id, nome, colore_hex, icona, ordine, budget_mensile) VALUES
    (NEW.id, 'SVAGO',        '#EAB308', 'PartyPopper',      1, 100),
    (NEW.id, 'BUSINESS',     '#3B82F6', 'Briefcase',        2, 140),
    (NEW.id, 'OBBLIGATORIE', '#6B7280', 'Lock',             3, 395),
    (NEW.id, 'AUTO',         '#16A34A', 'Car',              4,  75),
    (NEW.id, 'CASA',         '#A16207', 'Home',             5,   0),
    (NEW.id, 'ALIMENTARI',   '#84CC16', 'ShoppingCart',     6,  50),
    (NEW.id, 'SALUTE',       '#EF4444', 'Stethoscope',      7,  20),
    (NEW.id, 'FORMAZIONE',   '#14B8A6', 'GraduationCap',    8,  30),
    (NEW.id, 'INVESTIMENTO', '#8B5CF6', 'TrendingUp',       9,   0),
    (NEW.id, 'ALTRO',        '#9CA3AF', 'MoreHorizontal',  10,  50);

  -- secchielli di sistema (slug fisso, non eliminabili)
  INSERT INTO public.secchiello (user_id, slug, nome, colore_hex, icona, sistema) VALUES
    (NEW.id, 'QUOTA_SOCIO', 'Quota Socio — conguaglio', '#E84393', 'Users',  true),
    (NEW.id, 'FONDO_TASSE', 'Tasse & INPS',             '#FF4D6D', 'Receipt', true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Protezione: i secchielli di sistema non si possono eliminare
CREATE OR REPLACE FUNCTION public.protect_system_secchiello()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.sistema THEN
    RAISE EXCEPTION 'Il secchiello di sistema "%" non può essere eliminato', OLD.slug;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_protect_system_secchiello
  BEFORE DELETE ON public.secchiello
  FOR EACH ROW EXECUTE FUNCTION public.protect_system_secchiello();

-- -----------------------------------------------------------------------------
-- 7. BACKFILL utenti già esistenti in auth.users (es. account anonimo Augusto)
-- -----------------------------------------------------------------------------
DO $$
DECLARE u record;
BEGIN
  FOR u IN SELECT id FROM auth.users LOOP
    INSERT INTO public.profile (user_id) VALUES (u.id) ON CONFLICT (user_id) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM public.categoria WHERE user_id = u.id) THEN
      INSERT INTO public.categoria (user_id, nome, colore_hex, icona, ordine, budget_mensile) VALUES
        (u.id, 'SVAGO',        '#EAB308', 'PartyPopper',      1, 100),
        (u.id, 'BUSINESS',     '#3B82F6', 'Briefcase',        2, 140),
        (u.id, 'OBBLIGATORIE', '#6B7280', 'Lock',             3, 395),
        (u.id, 'AUTO',         '#16A34A', 'Car',              4,  75),
        (u.id, 'CASA',         '#A16207', 'Home',             5,   0),
        (u.id, 'ALIMENTARI',   '#84CC16', 'ShoppingCart',     6,  50),
        (u.id, 'SALUTE',       '#EF4444', 'Stethoscope',      7,  20),
        (u.id, 'FORMAZIONE',   '#14B8A6', 'GraduationCap',    8,  30),
        (u.id, 'INVESTIMENTO', '#8B5CF6', 'TrendingUp',       9,   0),
        (u.id, 'ALTRO',        '#9CA3AF', 'MoreHorizontal',  10,  50);
    END IF;

    INSERT INTO public.secchiello (user_id, slug, nome, colore_hex, icona, sistema) VALUES
      (u.id, 'QUOTA_SOCIO', 'Quota Socio — conguaglio', '#E84393', 'Users',  true),
      (u.id, 'FONDO_TASSE', 'Tasse & INPS',             '#FF4D6D', 'Receipt', true)
    ON CONFLICT (user_id, slug) DO NOTHING;
  END LOOP;
END $$;
