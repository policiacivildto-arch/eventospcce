-- DTO cria eventos pela tela
create function public.criar_evento(p_nome text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform exigir_dto();
  if coalesce(trim(p_nome), '') = '' then raise exception 'Dê um nome ao evento.'; end if;
  insert into eventos (nome) values (trim(p_nome)) returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Já existe um evento com esse nome.';
end $$;
revoke all on function public.criar_evento(text) from public, anon;
grant execute on function public.criar_evento(text) to authenticated;
