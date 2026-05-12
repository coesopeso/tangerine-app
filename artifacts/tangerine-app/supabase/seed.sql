-- Seed iniziale post-signup. Eseguito dal client al primo onboarding.
-- (Replicato lato client via storage.bootstrapNewUser().)

-- Categorie default Augusto
-- Da invocare con :user_id parametrico
\set u :user_id

insert into public.categoria (user_id, nome, colore_hex, icona, budget_mensile, ordine) values
  (:'u', 'SVAGO',         '#EAB308', 'PartyPopper',    100, 1),
  (:'u', 'BUSINESS',      '#3B82F6', 'Briefcase',      140, 2),
  (:'u', 'OBBLIGATORIE',  '#6B7280', 'Lock',           395, 3),
  (:'u', 'AUTO',          '#16A34A', 'Car',             75, 4),
  (:'u', 'CASA',          '#A16207', 'Home',             0, 5),
  (:'u', 'ALIMENTARI',    '#84CC16', 'ShoppingCart',    50, 6),
  (:'u', 'SALUTE',        '#EF4444', 'Stethoscope',     20, 7),
  (:'u', 'FORMAZIONE',    '#14B8A6', 'GraduationCap',   30, 8),
  (:'u', 'INVESTIMENTO',  '#8B5CF6', 'TrendingUp',       0, 9),
  (:'u', 'ALTRO',         '#9CA3AF', 'MoreHorizontal',  50, 10);

insert into public.secchiello (user_id, slug, nome, colore_hex, icona, sistema) values
  (:'u', 'QUOTA_SOCIO', 'Quota Socio — conguaglio', '#FFC048', 'Users',    true),
  (:'u', 'FONDO_TASSE', 'Tasse & INPS',             '#FF4D6D', 'Landmark', true);

insert into public.secchiello (user_id, nome, colore_hex, icona, target_importo) values
  (:'u', 'Fondo Emergenza', '#3B82F6', 'Shield',     6000),
  (:'u', 'Vacanze',         '#EC4899', 'Plane',      1200),
  (:'u', 'Pensione',        '#8B5CF6', 'PiggyBank',  1200);
