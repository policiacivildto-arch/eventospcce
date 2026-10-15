-- PDFs de pagamento assinados no gov.br: guardados no Storage, pasta <evento>/<delegacia>/arquivo.pdf
-- Só PDF, até 10 MB. Quem pode enviar e ler: DTO, focal do departamento e chefe da delegacia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('relatorios', 'relatorios', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

/* a pasta do arquivo indica a delegacia; confere se a pessoa pode mexer nela */
create or replace function public.pode_relatorio(p_nome text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when split_part(p_nome, '/', 2) ~ '^\d+$'
              then pode_frequencia((select departamento_id from delegacias where id = split_part(p_nome, '/', 2)::int), split_part(p_nome, '/', 2)::int)
              else false end
$$;
revoke execute on function public.pode_relatorio(text) from public, anon;
grant execute on function public.pode_relatorio(text) to authenticated;

drop policy if exists relatorios_ler on storage.objects;
drop policy if exists relatorios_enviar on storage.objects;
create policy relatorios_ler on storage.objects for select to authenticated
  using (bucket_id = 'relatorios' and public.pode_relatorio(name));
create policy relatorios_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'relatorios' and public.pode_relatorio(name));
