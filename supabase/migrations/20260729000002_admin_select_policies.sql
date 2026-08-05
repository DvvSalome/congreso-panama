-- Permite que la cuenta admin (autenticada vía Supabase Auth) lea las
-- inscripciones y sus comprobantes desde la app interna de verificación.
drop policy if exists "Admin puede ver inscripciones" on public.inscripciones;
create policy "Admin puede ver inscripciones"
  on public.inscripciones
  for select
  to authenticated
  using (true);

drop policy if exists "Admin puede ver comprobantes" on storage.objects;
create policy "Admin puede ver comprobantes"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'comprobantes');
