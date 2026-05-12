-- Tangerine v5.3 — distinzione secchielli "tax" (obbligatori) vs "discretionary"
-- Serve al motore fiscale per calcolare Netto Lordo e Tax-safe senza doppi conteggi:
--   * TAX: FONDO_TASSE, QUOTA_SOCIO (e qualsiasi auto_* di natura fiscale)
--           → NON si sottraggono dal Netto Lordo (sono già dentro la zavorra fiscale).
--   * DISCRETIONARY: tutti gli altri (Vacanze, Pensione, Fondo Emergenza, …)
--           → SÌ si sottraggono dal Netto Lordo per il Tax-safe.

create type tipo_secchiello as enum ('TAX', 'DISCRETIONARY');

alter table public.secchiello
  add column if not exists tipo tipo_secchiello not null default 'DISCRETIONARY';

-- Backfill basato sul slug (idempotente)
update public.secchiello
   set tipo = 'TAX'
 where slug in ('FONDO_TASSE', 'QUOTA_SOCIO');
