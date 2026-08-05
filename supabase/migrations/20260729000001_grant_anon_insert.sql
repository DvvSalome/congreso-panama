-- La política RLS de INSERT no basta si el rol anon no tiene el
-- privilegio GRANT a nivel de tabla: Postgres exige ambos.
grant usage on schema public to anon;
grant insert on public.inscripciones to anon;
