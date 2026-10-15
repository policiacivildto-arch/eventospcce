-- Telefone do servidor, usado na escala em Word.
-- Quem pode gravar: o DTO; o focal, para servidores do seu departamento ou escalados em vagas dele; o próprio servidor.
alter table public.servidores add column if not exists telefone text;
grant select (telefone) on public.servidores to authenticated;

create or replace function public.definir_telefone(p_matricula text, p_telefone text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := exigir_login(); dig text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  if dig <> '' and length(dig) not between 10 and 11 then
    raise exception 'Telefone com DDD, ex.: (85) 99999-9999.';
  end if;
  if not (e_dto() or p_matricula = me
          or exists (select 1 from servidores s where s.matricula = p_matricula and s.departamento_id in (select deps_focal()))
          or exists (select 1 from escalas e where e.matricula = p_matricula and e.departamento_vaga_id in (select deps_focal()))) then
    raise exception 'Você só pode informar o telefone de servidores do seu departamento ou escalados nele.';
  end if;
  update servidores set telefone = nullif(dig, '') where matricula = p_matricula;
  if not found then raise exception 'Servidor não encontrado.'; end if;
end $$;
revoke execute on function public.definir_telefone(text, text) from public, anon;
grant execute on function public.definir_telefone(text, text) to authenticated;
