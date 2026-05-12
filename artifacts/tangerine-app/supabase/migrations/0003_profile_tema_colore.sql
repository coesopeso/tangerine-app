-- Tangerine — preset colore accent dell'app (6 opzioni).
-- Il campo `tema` esistente (LIGHT/DARK/AUTO) regola la modalità chiaro/scuro
-- e resta invariato. Qui aggiungiamo `tema_colore` per il preset di accent
-- selezionabile dall'utente in Impostazioni.

create type tema_colore as enum (
  'arancio', 'blu', 'verde', 'rosso', 'viola', 'grigio'
);

alter table public.profile
  add column if not exists tema_colore tema_colore not null default 'arancio';
