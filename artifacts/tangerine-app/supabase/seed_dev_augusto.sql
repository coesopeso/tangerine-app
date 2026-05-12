-- ─────────────────────────────────────────────────────────────────────
--  Tangerine v5.2 — SEED dati di test per Augusto (3 mesi 2026)
-- ─────────────────────────────────────────────────────────────────────
--
--  COSA FA
--    Popola gennaio, febbraio, marzo 2026 con un mix realistico di:
--      • fatture P.IVA + entrate private (con stati misti per Marzo)
--      • spese spalmate su 7 categorie diverse
--      • allocazioni automatiche QUOTA_SOCIO e FONDO_TASSE coerenti col
--        motore fiscale (Augusto Artigiani 2026: coeff 0.78, aliquota 5%,
--        INPS fisso €384,31)
--      • un paio di allocazioni manuali sui secchielli "Vacanze" e
--        "Fondo Emergenza" per testare l'editing
--
--    Il caso reale Marzo 2026 è incluso: 3 fatture P.IVA per totale 1300€
--    (PIADINA 250 + DNG 550 + ROBE 500), tutte con_socio = true.
--    Il motore fiscale produce: tasse=50.70, INPS_fisso=384.31,
--    quota_socio=264.35, zavorra=435.01.
--
--  COME ESEGUIRLO
--    1. Apri Supabase Dashboard → SQL Editor → New query
--    2. Incolla questo file
--    3. Clicca "Run". Idempotente: rimuove i seed precedenti prima di
--       reinserire, quindi puoi rieseguirlo quante volte vuoi.
--
--  PRECONDIZIONI
--    • Lo schema 0001_init.sql è già applicato.
--    • C'è almeno un utente in auth.users (cioè hai aperto l'app
--      almeno una volta e completato il PIN, così Supabase Auth ha
--      creato l'utente anonimo + il trigger ha popolato profile,
--      categorie default, secchielli di sistema).
--
--  COME RIMUOVERLO
--    Esegui solo la sezione "DELETE seed precedenti" all'inizio.
-- ─────────────────────────────────────────────────────────────────────

do $$
declare
  uid uuid;
  -- categorie
  cat_svago uuid; cat_business uuid; cat_obblig uuid; cat_auto uuid;
  cat_alim uuid; cat_salute uuid; cat_form uuid;
  -- secchielli
  sec_socio uuid; sec_tasse uuid; sec_vacanze uuid; sec_emergenza uuid;
begin
  -- ── 1. trova l'utente (assume single-user instance per Augusto) ──
  select id into uid from auth.users order by created_at asc limit 1;
  if uid is null then
    raise exception 'Nessun utente in auth.users. Apri l''app, fai PIN e onboarding, poi rilancia questo seed.';
  end if;

  raise notice 'Seed in corso per utente %', uid;

  -- ── 2. RIMUOVI seed precedenti (idempotente) ──
  delete from public.allocazione_secchiello where user_id = uid and (nota like '[SEED]%' or fonte in ('AUTO_SOCIO','AUTO_TASSE'));
  delete from public.spesa where user_id = uid and descrizione like '[SEED]%';
  delete from public.fattura where user_id = uid and descrizione like '[SEED]%';

  -- ── 3. risolvi le id di categorie e secchielli ──
  select id into cat_svago    from public.categoria where user_id = uid and nome = 'SVAGO';
  select id into cat_business from public.categoria where user_id = uid and nome = 'BUSINESS';
  select id into cat_obblig   from public.categoria where user_id = uid and nome = 'OBBLIGATORIE';
  select id into cat_auto     from public.categoria where user_id = uid and nome = 'AUTO';
  select id into cat_alim     from public.categoria where user_id = uid and nome = 'ALIMENTARI';
  select id into cat_salute   from public.categoria where user_id = uid and nome = 'SALUTE';
  select id into cat_form     from public.categoria where user_id = uid and nome = 'FORMAZIONE';

  if cat_svago is null or cat_obblig is null then
    raise exception 'Categorie default mancanti. Completa l''onboarding nell''app prima di lanciare il seed.';
  end if;

  select id into sec_socio     from public.secchiello where user_id = uid and slug = 'QUOTA_SOCIO';
  select id into sec_tasse     from public.secchiello where user_id = uid and slug = 'FONDO_TASSE';
  select id into sec_vacanze   from public.secchiello where user_id = uid and nome = 'Vacanze';
  select id into sec_emergenza from public.secchiello where user_id = uid and nome = 'Fondo Emergenza';

  if sec_socio is null or sec_tasse is null then
    raise exception 'Secchielli di sistema mancanti. Completa l''onboarding nell''app prima di lanciare il seed.';
  end if;

  -- ── 4. FATTURE — gennaio, febbraio, marzo 2026 ──
  insert into public.fattura
    (user_id, cliente_id, descrizione, data_incasso, data_emissione, lordo, tipo, stato, con_socio)
  values
    -- GENNAIO 2026 — P.IVA con socio: tot 800€
    (uid, null, '[SEED] PIADINA',           '2026-01-03', '2026-01-02', 300, 'FATTURA_PIVA',     'INCASSATO',  true),
    (uid, null, '[SEED] DNG',               '2026-01-10', '2026-01-09', 250, 'FATTURA_PIVA',     'INCASSATO',  true),
    (uid, null, '[SEED] ROBE',              '2026-01-25', '2026-01-24', 250, 'FATTURA_PIVA',     'INCASSATO',  true),
    -- GENNAIO — entrate private: tot 600€
    (uid, null, '[SEED] FRUTTETO',          '2026-01-08', null,         250, 'ENTRATA_PRIVATA',  'INCASSATO',  false),
    (uid, null, '[SEED] GOBBO',             '2026-01-18', null,         200, 'ENTRATA_PRIVATA',  'INCASSATO',  false),
    (uid, null, '[SEED] DONG',              '2026-01-27', null,         150, 'ENTRATA_PRIVATA',  'INCASSATO',  false),

    -- FEBBRAIO 2026 — P.IVA con socio: tot 1100€
    (uid, null, '[SEED] PIADINA',           '2026-02-05', '2026-02-04', 400, 'FATTURA_PIVA',     'INCASSATO',  true),
    (uid, null, '[SEED] DNG',               '2026-02-14', '2026-02-13', 400, 'FATTURA_PIVA',     'INCASSATO',  true),
    (uid, null, '[SEED] ROBE',              '2026-02-24', '2026-02-23', 300, 'FATTURA_PIVA',     'INCASSATO',  true),
    -- FEBBRAIO — entrate private: tot 800€
    (uid, null, '[SEED] FRUTTETO',          '2026-02-12', null,         350, 'ENTRATA_PRIVATA',  'INCASSATO',  false),
    (uid, null, '[SEED] GOBBO',             '2026-02-20', null,         250, 'ENTRATA_PRIVATA',  'INCASSATO',  false),
    (uid, null, '[SEED] DONG',              '2026-02-26', null,         200, 'ENTRATA_PRIVATA',  'INCASSATO',  false),

    -- MARZO 2026 — caso reale Augusto (P.IVA con socio: 1300€)
    (uid, null, '[SEED] PIADINA',           '2026-03-05', '2026-03-04', 250, 'FATTURA_PIVA',     'INCASSATO',  true),
    (uid, null, '[SEED] DNG',               '2026-03-12', '2026-03-11', 550, 'FATTURA_PIVA',     'INCASSATO',  true),
    (uid, null, '[SEED] ROBE',              '2026-03-20', '2026-03-19', 500, 'FATTURA_PIVA',     'INCASSATO',  true),
    -- MARZO — entrate private: tot 1450€
    (uid, null, '[SEED] FRUTTETO',          '2026-03-08', null,         900, 'ENTRATA_PRIVATA',  'INCASSATO',  false),
    (uid, null, '[SEED] PIADINA (privato)', '2026-03-14', null,         200, 'ENTRATA_PRIVATA',  'INCASSATO',  false),
    (uid, null, '[SEED] GOBBO',             '2026-03-22', null,         150, 'ENTRATA_PRIVATA',  'INCASSATO',  false),
    (uid, null, '[SEED] DONG',              '2026-03-28', null,         200, 'ENTRATA_PRIVATA',  'INCASSATO',  false),

    -- MARZO — extra per testare gli stati FATTURATO e PROGRAMMATO
    (uid, null, '[SEED] BAR FUTURO',        null,         '2026-03-30', 700, 'FATTURA_PIVA',     'FATTURATO',  true),
    (uid, null, '[SEED] PROSSIMO LAVORO',   null,         null,         500, 'FATTURA_PIVA',     'PROGRAMMATO',true);

  -- ── 5. SPESE — ~12 al mese su 7 categorie ──
  insert into public.spesa
    (user_id, data, categoria_id, importo, tipo, descrizione)
  values
    -- GENNAIO 2026
    (uid, '2026-01-04', cat_obblig,   700, 'EFFETTIVA', '[SEED] Affitto'),
    (uid, '2026-01-05', cat_alim,      85, 'EFFETTIVA', '[SEED] Spesa Esselunga'),
    (uid, '2026-01-08', cat_auto,      60, 'EFFETTIVA', '[SEED] Benzina'),
    (uid, '2026-01-10', cat_svago,     45, 'EFFETTIVA', '[SEED] Cena con amici'),
    (uid, '2026-01-12', cat_alim,      70, 'EFFETTIVA', '[SEED] Spesa'),
    (uid, '2026-01-15', cat_obblig,   120, 'EFFETTIVA', '[SEED] Bollette luce/gas'),
    (uid, '2026-01-18', cat_business,  99, 'EFFETTIVA', '[SEED] Software annuale'),
    (uid, '2026-01-20', cat_salute,    35, 'EFFETTIVA', '[SEED] Farmacia'),
    (uid, '2026-01-22', cat_alim,      65, 'EFFETTIVA', '[SEED] Spesa'),
    (uid, '2026-01-25', cat_svago,     24, 'EFFETTIVA', '[SEED] Cinema'),
    (uid, '2026-01-28', cat_auto,      55, 'EFFETTIVA', '[SEED] Benzina'),
    (uid, '2026-01-30', cat_form,      30, 'EFFETTIVA', '[SEED] Libro tecnico'),

    -- FEBBRAIO 2026
    (uid, '2026-02-03', cat_obblig,   700, 'EFFETTIVA', '[SEED] Affitto'),
    (uid, '2026-02-05', cat_alim,      80, 'EFFETTIVA', '[SEED] Spesa'),
    (uid, '2026-02-07', cat_auto,     130, 'EFFETTIVA', '[SEED] Bollo auto'),
    (uid, '2026-02-10', cat_alim,      75, 'EFFETTIVA', '[SEED] Spesa'),
    (uid, '2026-02-12', cat_svago,     50, 'EFFETTIVA', '[SEED] Cena fuori'),
    (uid, '2026-02-14', cat_svago,     40, 'EFFETTIVA', '[SEED] Regalo S.Valentino'),
    (uid, '2026-02-16', cat_obblig,   110, 'EFFETTIVA', '[SEED] Bollette'),
    (uid, '2026-02-19', cat_business,  25, 'EFFETTIVA', '[SEED] Hosting'),
    (uid, '2026-02-22', cat_alim,      60, 'EFFETTIVA', '[SEED] Spesa'),
    (uid, '2026-02-25', cat_salute,    80, 'EFFETTIVA', '[SEED] Visita medica'),
    (uid, '2026-02-28', cat_auto,      50, 'EFFETTIVA', '[SEED] Benzina'),

    -- MARZO 2026
    (uid, '2026-03-03', cat_obblig,   700, 'EFFETTIVA', '[SEED] Affitto'),
    (uid, '2026-03-05', cat_alim,      90, 'EFFETTIVA', '[SEED] Spesa Esselunga'),
    (uid, '2026-03-08', cat_svago,     35, 'EFFETTIVA', '[SEED] Festa donna'),
    (uid, '2026-03-10', cat_auto,      55, 'EFFETTIVA', '[SEED] Benzina'),
    (uid, '2026-03-12', cat_alim,      75, 'EFFETTIVA', '[SEED] Spesa'),
    (uid, '2026-03-15', cat_obblig,   130, 'EFFETTIVA', '[SEED] Bollette'),
    (uid, '2026-03-17', cat_business,  80, 'EFFETTIVA', '[SEED] Pubblicità Meta'),
    (uid, '2026-03-20', cat_alim,      65, 'EFFETTIVA', '[SEED] Spesa'),
    (uid, '2026-03-22', cat_salute,    25, 'EFFETTIVA', '[SEED] Farmacia'),
    (uid, '2026-03-24', cat_form,      50, 'EFFETTIVA', '[SEED] Corso online'),
    (uid, '2026-03-27', cat_svago,     30, 'EFFETTIVA', '[SEED] Aperitivo'),
    (uid, '2026-03-29', cat_auto,      60, 'EFFETTIVA', '[SEED] Benzina');

  -- ── 6. ALLOCAZIONI AUTOMATICHE — quota socio e fondo tasse ──
  --   Calcoli (Augusto: coeff=0.78, aliquota=0.05, INPS fisso=384.31,
  --   socio sim=0.2607). Imponibile YTD <18415 → no eccedenza.
  --   Gen (1300 P.IVA → no, 800):  socio = 800*0.78*0.2607 = 162.6768
  --                                  tasse_mese = 800*0.78*0.05 = 31.20
  --                                  AUTO_TASSE = 31.20 + 384.31     = 415.51
  --   Feb (1100):                    socio = 1100*0.78*0.2607 = 223.6806
  --                                  AUTO_TASSE = 1100*0.78*0.05 + 384.31 = 427.21
  --   Mar (1300, caso reale Augusto): socio = 1300*0.78*0.2607 = 264.3498
  --                                  AUTO_TASSE = 1300*0.78*0.05 + 384.31 = 435.01
  insert into public.allocazione_secchiello
    (user_id, secchiello_id, mese, importo, fonte, nota)
  values
    -- QUOTA_SOCIO automatica
    (uid, sec_socio, '2026-01-01', 162.6768, 'AUTO_SOCIO', '[SEED] Quota socio simulata'),
    (uid, sec_socio, '2026-02-01', 223.6806, 'AUTO_SOCIO', '[SEED] Quota socio simulata'),
    (uid, sec_socio, '2026-03-01', 264.3498, 'AUTO_SOCIO', '[SEED] Quota socio simulata'),
    -- FONDO_TASSE automatica
    (uid, sec_tasse, '2026-01-01', 415.51,   'AUTO_TASSE', '[SEED] Tasse + INPS fisso'),
    (uid, sec_tasse, '2026-02-01', 427.21,   'AUTO_TASSE', '[SEED] Tasse + INPS fisso'),
    (uid, sec_tasse, '2026-03-01', 435.01,   'AUTO_TASSE', '[SEED] Tasse + INPS fisso');

  -- ── 7. ALLOCAZIONI MANUALI — Vacanze e Fondo Emergenza ──
  if sec_vacanze is not null then
    insert into public.allocazione_secchiello
      (user_id, secchiello_id, mese, importo, fonte, nota)
    values
      (uid, sec_vacanze, '2026-01-01', 100, 'MANUALE', '[SEED] Risparmio mensile vacanze'),
      (uid, sec_vacanze, '2026-02-01', 100, 'MANUALE', '[SEED] Risparmio mensile vacanze'),
      (uid, sec_vacanze, '2026-03-01', 100, 'MANUALE', '[SEED] Risparmio mensile vacanze');
  end if;

  if sec_emergenza is not null then
    insert into public.allocazione_secchiello
      (user_id, secchiello_id, mese, importo, fonte, nota)
    values
      (uid, sec_emergenza, '2026-01-01', 200, 'MANUALE', '[SEED] Costruzione fondo emergenza'),
      (uid, sec_emergenza, '2026-02-01', 200, 'MANUALE', '[SEED] Costruzione fondo emergenza'),
      (uid, sec_emergenza, '2026-03-01', 250, 'MANUALE', '[SEED] Costruzione fondo emergenza');
  end if;

  raise notice '✅ Seed completato. 21 fatture + 35 spese + 12 allocazioni inserite.';
end $$;

-- ─── Riepilogo veloce per verifica ────────────────────────────────────
select
  (select count(*) from public.fattura where descrizione like '[SEED]%')           as fatture_seed,
  (select count(*) from public.spesa   where descrizione like '[SEED]%')           as spese_seed,
  (select count(*) from public.allocazione_secchiello where nota like '[SEED]%')   as alloc_seed,
  (select sum(lordo) from public.fattura where descrizione like '[SEED]%' and tipo='FATTURA_PIVA' and stato='INCASSATO' and data_incasso between '2026-03-01' and '2026-03-31') as marzo_piva_incassato,
  (select sum(lordo) from public.fattura where descrizione like '[SEED]%' and tipo='ENTRATA_PRIVATA' and data_incasso between '2026-03-01' and '2026-03-31') as marzo_privato;
-- Atteso: fatture_seed=21, spese_seed=35, alloc_seed=12
--         marzo_piva_incassato=1300.00, marzo_privato=1450.00
