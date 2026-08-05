-- Permite que cualquier visitante (rol anon) registre su inscripción y
-- suba su comprobante de pago. Sin estas políticas, el INSERT en
-- "inscripciones" y la subida a Storage quedan bloqueados por RLS por
-- defecto, aunque la anon key sea válida.

drop policy if exists "Permitir inscripciones públicas" on public.inscripciones;
create policy "Permitir inscripciones públicas"
  on public.inscripciones
  for insert
  to anon
  with check (true);

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

drop policy if exists "Permitir subir comprobantes" on storage.objects;
create policy "Permitir subir comprobantes"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'comprobantes');
