-- Campos nuevos del formulario de inscripción:
--   institucion      -> institución educativa (obligatoria para la tarifa Estudiante)
--   codigo_descuento -> código de descuento por institución, si se aplicó
--   descuento_pct    -> porcentaje de descuento aplicado
-- Además el comprobante pasa a ser opcional: se permite NULL en comprobante_path.

alter table public.inscripciones
  add column if not exists institucion text,
  add column if not exists codigo_descuento text,
  add column if not exists descuento_pct numeric not null default 0;

alter table public.inscripciones
  alter column comprobante_path drop not null;
