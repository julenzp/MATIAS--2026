-- Vigencia de las notas de usuario: rango de fechas + turno.
-- NO APLICADA. Ejecutar en Supabase antes de publicar el código.
-- Las notas existentes quedan con NULL = siguen activas hasta que se borren.

ALTER TABLE public.passenger_notes
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS shift text;

ALTER TABLE public.passenger_notes
  DROP CONSTRAINT IF EXISTS passenger_notes_shift_check;
ALTER TABLE public.passenger_notes
  ADD CONSTRAINT passenger_notes_shift_check
  CHECK (shift IS NULL OR shift IN ('morning', 'afternoon', 'all'));

ALTER TABLE public.passenger_notes
  DROP CONSTRAINT IF EXISTS passenger_notes_dates_check;
ALTER TABLE public.passenger_notes
  ADD CONSTRAINT passenger_notes_dates_check
  CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until);
