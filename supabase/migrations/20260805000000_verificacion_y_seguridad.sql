-- Panel de verificación: estado de cada inscripción + cierre del hueco de
-- lectura pública.
--
-- Todo aquí es idempotente y no destructivo: se puede correr varias veces.
-- No hay DROP/TRUNCATE/DELETE de datos ni cambios de tipo, y los ADD COLUMN
-- con DEFAULT no reescriben la tabla en Postgres 11+, así que no bloquea prod.

-- ---------------------------------------------------------------------------
-- 1. Campos del flujo de verificación
-- ---------------------------------------------------------------------------
alter table public.inscripciones
  add column if not exists estado text not null default 'pendiente',
  add column if not exists verificado_at timestamptz,
  add column if not exists notas text,
  add column if not exists es_prueba boolean not null default false;

-- Las filas existentes quedan en 'pendiente' por el default, así que el CHECK
-- valida sin fallar.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'inscripciones_estado_check'
  ) then
    alter table public.inscripciones
      add constraint inscripciones_estado_check
      check (estado in ('pendiente', 'verificado', 'rechazado'));
  end if;
end $$;

create index if not exists inscripciones_created_at_idx
  on public.inscripciones (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Quién es admin
-- ---------------------------------------------------------------------------
-- Antes, la política de lectura era `to authenticated using (true)`: como los
-- registros públicos están habilitados en Supabase Auth, CUALQUIERA podía
-- crearse una cuenta y leer los datos personales y comprobantes de todos los
-- inscritos. Ahora la lectura se limita a los correos de esta lista.
--
-- ⚠️ Para agregar otro admin, añade su correo a este array y vuelve a correr
--    la migración. Si el correo no coincide, esa cuenta no verá nada.
create or replace function public.es_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = any (array[
    'admin@urpeailab.com',
    'sa@urpeailab.com'
  ])
$$;

grant execute on function public.es_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Políticas de lectura y escritura del admin
-- ---------------------------------------------------------------------------
drop policy if exists "Admin puede ver inscripciones" on public.inscripciones;
create policy "Admin puede ver inscripciones"
  on public.inscripciones
  for select
  to authenticated
  using (public.es_admin());

drop policy if exists "Admin puede verificar inscripciones" on public.inscripciones;
create policy "Admin puede verificar inscripciones"
  on public.inscripciones
  for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

drop policy if exists "Admin puede ver comprobantes" on storage.objects;
create policy "Admin puede ver comprobantes"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'comprobantes' and public.es_admin());

-- La política RLS no basta sin el GRANT a nivel de tabla: Postgres exige ambos.
-- El UPDATE se limita a las columnas del flujo de verificación, para que el
-- panel no pueda alterar montos, datos personales ni el comprobante.
grant select on public.inscripciones to authenticated;
grant update (estado, verificado_at, notas, es_prueba)
  on public.inscripciones to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Limpieza de esquema
-- ---------------------------------------------------------------------------
-- `cupon` quedó de una versión anterior del formulario; la columna vigente es
-- `codigo_descuento`. Se deja comentado: descoméntalo solo si confirmaste que
-- ninguna fila tiene datos ahí (hoy están todas en NULL).
-- alter table public.inscripciones drop column if exists cupon;
