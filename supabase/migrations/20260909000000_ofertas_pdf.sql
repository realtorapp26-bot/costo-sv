-- Carta de oferta firmada (PDF): se guarda en Storage al generarla desde
-- /carta-oferta.html y se enlaza desde el lead para descargarla en el panel.

alter table leads add column if not exists oferta_pdf_path text;

-- Bucket PRIVADO: el PDF contiene el documento de identidad y la firma del cliente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ofertas', 'ofertas', false, 5242880, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- El formulario de carta de oferta es público (clave anon, sin login): puede
-- SUBIR a este bucket, nunca leer, listar ni borrar.
drop policy if exists "ofertas: subir" on storage.objects;
create policy "ofertas: subir" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'ofertas');

-- Solo el panel (usuarios autenticados) puede leer las ofertas firmadas.
drop policy if exists "ofertas: leer autenticados" on storage.objects;
create policy "ofertas: leer autenticados" on storage.objects
  for select to authenticated
  using (bucket_id = 'ofertas');
