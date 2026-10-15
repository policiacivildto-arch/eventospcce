-- =====================================================================
-- Frequência e relatório de pagamento
--   * chefe de delegacia: novo papel; marca presença, falta, substituição
--     e horário diferente nas vagas da sua delegacia (DTO e focal corrigem)
--   * fechamento da frequência por delegacia e PDF assinado (gov.br) guardado
--   * pagamento: só Extra, pelas horas efetivamente trabalhadas
-- =====================================================================

-- ---------- papel "chefe" (por delegacia) ----------
alter table public.papeis add column if not exists delegacia_id int references public.delegacias;
alter table public.papeis drop constraint if exists papeis_papel_check;
alter table public.papeis add constraint papeis_papel_check check (papel in ('focal', 'dto', 'chefe'));
alter table public.papeis drop constraint if exists papeis_check;
alter table public.papeis add constraint papeis_check check (
  papel = 'dto' or (papel = 'focal' and departamento_id is not null)
  or (papel = 'chefe' and delegacia_id is not null and departamento_id is not null));
alter table public.papeis drop constraint if exists papeis_matricula_papel_departamento_id_key;
alter table public.papeis drop constraint if exists papeis_unico;
alter table public.papeis add constraint papeis_unico unique nulls not distinct (matricula, papel, departamento_id, delegacia_id);

create or replace function public.delegs_chefe() returns setof int
language sql stable security definer set search_path = public as $$
  select delegacia_id from papeis where matricula = eu() and papel = 'chefe'
$$;

/* pode mexer na frequência desta vaga: DTO, focal do departamento ou chefe da delegacia */
create or replace function public.pode_frequencia(p_dep int, p_del int) returns boolean
language sql stable security definer set search_path = public as $$
  select pode_departamento(p_dep) or (p_del is not null and p_del in (select delegs_chefe()))
$$;

/* vaga da delegacia de que a pessoa é chefe (sem passar pelo RLS, para não haver recursão entre políticas) */
create or replace function public.chefe_da_vaga(p_vaga bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from vagas where id = p_vaga and delegacia_id in (select delegs_chefe()))
$$;

-- o chefe vê as vagas e escalas da sua delegacia
drop policy if exists leitura on public.vagas;
create policy leitura on public.vagas for select to authenticated using (
  pode_departamento(departamento_id) or delegacia_id in (select delegs_chefe())
  or exists (select 1 from escalas e where e.vaga_id = vagas.id and e.matricula = eu()));
drop policy if exists leitura on public.escalas;
create policy leitura on public.escalas for select to authenticated using (
  matricula = eu() or pode_departamento(departamento_vaga_id) or departamento_servidor_id in (select deps_focal())
  or chefe_da_vaga(vaga_id));

-- a escala ganha a delegacia (para a tela de frequência)
create or replace view public.escala_vagas with (security_invoker = true) as
 select v.id as vaga_id, v.evento_id, v.departamento_id, dep.sigla as departamento, v.delegacia_nome, v.data, v.cargo, v.vaga,
        v.servico, v.inicio, v.fim, v.valor, v.origem, v.ativa, e.matricula, s.nome as servidor, e.sem_servidor,
        sd.sigla as departamento_servidor,
        (e.departamento_servidor_id is not null and e.departamento_servidor_id <> v.departamento_id) as de_outro_departamento,
        e.escalado_por, e.escalado_em, v.delegacia_id
   from vagas v
   join departamentos dep on dep.id = v.departamento_id
   left join escalas e on e.vaga_id = v.id
   left join servidores s on s.matricula = e.matricula
   left join departamentos sd on sd.id = e.departamento_servidor_id;

-- perfil: de quais delegacias a pessoa é chefe
create or replace function public.meu_perfil() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'matricula', s.matricula, 'nome', s.nome, 'cargo', s.cargo,
    'departamento', (select sigla from departamentos where id = s.departamento_id),
    'lotacao', (select nome from delegacias where id = s.delegacia_id),
    'dto', e_dto(),
    'focal_de', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'sigla', d.sigla) order by d.sigla)
                            from departamentos d where d.id in (select deps_focal())), '[]'),
    'chefe_de', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'nome', l.nome, 'departamento_id', l.departamento_id,
                                                               'sigla', (select sigla from departamentos where id = l.departamento_id)) order by l.nome)
                            from delegacias l where l.id in (select delegs_chefe())), '[]'))
  from servidores s where s.matricula = eu()
$$;

-- busca de servidor: o chefe também busca (para indicar substituto)
create or replace function public.buscar_servidores(p_texto text, p_cargo text, p_dep integer, p_outros boolean default false)
returns table(matricula text, nome text, cargo text, departamento text, lotacao text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform exigir_login();
  if not (pode_departamento(p_dep) or exists (select 1 from papeis where papeis.matricula = eu() and papel = 'chefe' and departamento_id = p_dep)) then
    raise exception 'Você não é focal nem chefe neste departamento.';
  end if;
  return query
    select s.matricula, s.nome, s.cargo, d.sigla, l.nome
      from servidores s
      left join departamentos d on d.id = s.departamento_id
      left join delegacias l on l.id = s.delegacia_id
     where s.ativo
       and (p_cargo is null or s.cargo = p_cargo)
       and (p_outros or s.departamento_id = p_dep)
       and (coalesce(p_texto, '') = '' or s.nome ilike '%' || p_texto || '%' or s.matricula = p_texto)
     order by s.nome
     limit 30;
end $$;

/* indicar ou tirar o chefe de uma delegacia (DTO ou focal do departamento) */
create or replace function public.definir_chefe(p_delegacia int, p_matricula text, p_email text default null, p_remover boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare me text := exigir_login(); d delegacias; s servidores; mail text := lower(trim(coalesce(p_email, '')));
begin
  select * into d from delegacias where id = p_delegacia;
  if not found then raise exception 'Delegacia não encontrada.'; end if;
  if not pode_departamento(d.departamento_id) then raise exception 'Só o DTO ou o focal do departamento indica o chefe.'; end if;
  if p_remover then
    delete from papeis where matricula = p_matricula and papel = 'chefe' and delegacia_id = p_delegacia;
    return;
  end if;
  select * into s from servidores where matricula = p_matricula;
  if not found or not s.ativo then raise exception 'Servidor % não encontrado ou inativo.', p_matricula; end if;
  if mail <> '' then
    if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;
    update servidores set email = mail where matricula = p_matricula;
  elsif s.email is null then
    raise exception 'Informe o e-mail institucional de %: sem e-mail ele não consegue entrar.', s.nome;
  end if;
  insert into papeis (matricula, papel, departamento_id, delegacia_id)
  values (p_matricula, 'chefe', d.departamento_id, p_delegacia) on conflict do nothing;
end $$;

/* chefes de um departamento (e-mail mascarado) */
create or replace function public.listar_chefes(p_dep int)
returns table(delegacia_id int, matricula text, nome text, email text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform exigir_login();
  if not pode_departamento(p_dep) then raise exception 'Sem acesso a este departamento.'; end if;
  return query
    select p.delegacia_id, s.matricula, s.nome,
           case when s.email is null then null else left(s.email, 2) || repeat('*', greatest(position('@' in s.email) - 3, 1)) || substr(s.email, position('@' in s.email)) end
      from papeis p join servidores s on s.matricula = p.matricula
     where p.papel = 'chefe' and p.departamento_id = p_dep
     order by s.nome;
end $$;

-- ---------- frequência ----------
create table public.frequencia (
  vaga_id        bigint primary key references public.vagas on delete cascade,
  situacao       text not null check (situacao in ('presente', 'falta', 'substituido', 'horario')),
  substituto     text references public.servidores(matricula),
  inicio_real    timestamp,
  fim_real       timestamp,
  observacao     text,
  registrado_por text,
  registrado_em  timestamptz not null default now(),
  check (situacao <> 'substituido' or substituto is not null),
  check (situacao <> 'horario' or (inicio_real is not null and fim_real is not null)),
  check (inicio_real is null or fim_real is null or fim_real > inicio_real)
);
alter table public.frequencia enable row level security;
create policy leitura on public.frequencia for select to authenticated using (
  pode_departamento((select departamento_id from vagas where id = frequencia.vaga_id)) or chefe_da_vaga(vaga_id)
  or substituto = eu()
  or exists (select 1 from escalas e where e.vaga_id = frequencia.vaga_id and e.matricula = eu()));
grant select on public.frequencia to authenticated;

/* servidor que aparece para o chefe (escalado na delegacia dele) ou como substituto numa vaga que a pessoa gerencia */
create or replace function public.servidor_na_frequencia(p_mat text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from escalas e join vagas v on v.id = e.vaga_id where e.matricula = p_mat and v.delegacia_id in (select delegs_chefe()))
      or exists (select 1 from frequencia f join vagas v on v.id = f.vaga_id where f.substituto = p_mat and pode_frequencia(v.departamento_id, v.delegacia_id))
$$;
drop policy if exists leitura on public.servidores;
create policy leitura on public.servidores for select to authenticated using (
  matricula = eu() or e_dto() or departamento_id in (select deps_focal())
  or exists (select 1 from escalas e where e.matricula = servidores.matricula and e.departamento_vaga_id in (select deps_focal()))
  or servidor_na_frequencia(matricula));

create table public.frequencia_fechamento (
  evento_id      uuid not null references public.eventos on delete cascade,
  delegacia_id   int  not null references public.delegacias,
  fechado_por    text,
  fechado_em     timestamptz not null default now(),
  arquivo        text,          -- caminho do PDF assinado no Storage
  assinado_por   text,
  assinado_em    timestamptz,
  primary key (evento_id, delegacia_id)
);
alter table public.frequencia_fechamento enable row level security;
create policy leitura on public.frequencia_fechamento for select to authenticated using (
  pode_frequencia((select departamento_id from delegacias where id = frequencia_fechamento.delegacia_id), delegacia_id));
grant select on public.frequencia_fechamento to authenticated;

/* registra (ou limpa, com p_situacao nulo) a frequência de uma vaga */
create or replace function public.registrar_frequencia(p_vaga bigint, p_situacao text, p_substituto text default null,
                                                       p_inicio timestamp default null, p_fim timestamp default null, p_obs text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me text := exigir_login(); v vagas; e escalas; s servidores; c record; v_ini timestamp; v_fim timestamp;
        agora timestamp := now() at time zone 'America/Fortaleza';
begin
  select * into v from vagas where id = p_vaga;
  if not found then raise exception 'Vaga não encontrada.'; end if;
  if not pode_frequencia(v.departamento_id, v.delegacia_id) then raise exception 'Você não é chefe desta delegacia nem focal do departamento.'; end if;
  if not e_dto() and exists (select 1 from frequencia_fechamento where evento_id = v.evento_id and delegacia_id = v.delegacia_id) then
    raise exception 'A frequência desta delegacia já foi fechada. Só o DTO reabre.';
  end if;
  if p_situacao is null then delete from frequencia where vaga_id = p_vaga; return; end if;
  if not v.ativa then raise exception 'Esta vaga saiu da necessidade de efetivo.'; end if;
  if v.inicio > agora and not e_dto() then raise exception 'O plantão ainda não começou (%).', to_char(v.inicio, 'DD/MM HH24:MI'); end if;
  if p_situacao not in ('presente', 'falta', 'substituido', 'horario') then raise exception 'Situação inválida.'; end if;

  select * into e from escalas where vaga_id = p_vaga;
  if p_situacao <> 'substituido' and (e.matricula is null) then
    raise exception 'Vaga sem servidor escalado: só é possível registrar quem cobriu (substituído).';
  end if;

  v_ini := coalesce(p_inicio, v.inicio); v_fim := coalesce(p_fim, v.fim);
  if p_situacao = 'horario' and (p_inicio is null or p_fim is null) then raise exception 'Informe a entrada e a saída realizadas.'; end if;
  if v_fim <= v_ini then raise exception 'A saída precisa ser depois da entrada.'; end if;
  if p_situacao in ('horario', 'substituido') and (v_ini < v.inicio - interval '12 hours' or v_fim > v.fim + interval '12 hours') then
    raise exception 'Horário muito fora do plantão (% a %).', to_char(v.inicio, 'DD/MM HH24:MI'), to_char(v.fim, 'DD/MM HH24:MI');
  end if;

  if p_situacao = 'substituido' then
    select * into s from servidores where matricula = p_substituto;
    if not found or not s.ativo then raise exception 'Substituto % não encontrado ou inativo.', p_substituto; end if;
    if s.cargo <> v.cargo then raise exception '% é %, mas a vaga é de %.', s.nome, s.cargo, v.cargo; end if;
    if p_substituto = e.matricula then raise exception 'O substituto não pode ser o próprio escalado.'; end if;
    -- não pode estar em outro plantão no mesmo horário
    select x.delegacia_nome, x.inicio, x.fim into c from escalas es join vagas x on x.id = es.vaga_id
     where es.matricula = p_substituto and es.vaga_id <> p_vaga and es.periodo && tsrange(v_ini, v_fim, '[)')
       and not exists (select 1 from frequencia f where f.vaga_id = es.vaga_id and f.situacao in ('falta', 'substituido'))
     limit 1;
    if found then raise exception '% está escalado(a) em % de % a %.', s.nome, c.delegacia_nome, to_char(c.inicio, 'DD/MM HH24:MI'), to_char(c.fim, 'DD/MM HH24:MI'); end if;
    select x.delegacia_nome, f.inicio_real, f.fim_real, x.inicio, x.fim into c from frequencia f join vagas x on x.id = f.vaga_id
     where f.substituto = p_substituto and f.vaga_id <> p_vaga
       and tsrange(coalesce(f.inicio_real, x.inicio), coalesce(f.fim_real, x.fim), '[)') && tsrange(v_ini, v_fim, '[)')
     limit 1;
    if found then raise exception '% já substitui em % no mesmo horário.', s.nome, c.delegacia_nome; end if;
  end if;

  insert into frequencia (vaga_id, situacao, substituto, inicio_real, fim_real, observacao, registrado_por, registrado_em)
  values (p_vaga, p_situacao, case when p_situacao = 'substituido' then p_substituto end,
          case when p_situacao in ('horario', 'substituido') and (p_inicio is not null) then p_inicio end,
          case when p_situacao in ('horario', 'substituido') and (p_fim is not null) then p_fim end,
          nullif(trim(coalesce(p_obs, '')), ''), me, now())
  on conflict (vaga_id) do update set situacao = excluded.situacao, substituto = excluded.substituto,
     inicio_real = excluded.inicio_real, fim_real = excluded.fim_real, observacao = excluded.observacao,
     registrado_por = me, registrado_em = now();
end $$;

/* fecha a frequência da delegacia (todas as vagas com servidor precisam estar registradas) */
create or replace function public.fechar_frequencia(p_evento uuid, p_delegacia int)
returns void language plpgsql security definer set search_path = public as $$
declare me text := exigir_login(); dep int; faltam int;
begin
  select departamento_id into dep from delegacias where id = p_delegacia;
  if not pode_frequencia(dep, p_delegacia) then raise exception 'Sem acesso a esta delegacia.'; end if;
  select count(*) into faltam from vagas v join escalas e on e.vaga_id = v.id
   where v.evento_id = p_evento and v.delegacia_id = p_delegacia and v.ativa and e.matricula is not null
     and not exists (select 1 from frequencia f where f.vaga_id = v.id);
  if faltam > 0 then raise exception 'Ainda há % vaga(s) com servidor sem frequência registrada.', faltam; end if;
  insert into frequencia_fechamento (evento_id, delegacia_id, fechado_por) values (p_evento, p_delegacia, me)
  on conflict (evento_id, delegacia_id) do nothing;
end $$;

/* reabre (só DTO): apaga também o registro do PDF assinado */
create or replace function public.reabrir_frequencia(p_evento uuid, p_delegacia int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exigir_dto();
  delete from frequencia_fechamento where evento_id = p_evento and delegacia_id = p_delegacia;
end $$;

/* guarda o caminho do PDF assinado (o arquivo vai para o Storage, pasta evento/delegacia/) */
create or replace function public.registrar_assinado(p_evento uuid, p_delegacia int, p_arquivo text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := exigir_login(); dep int;
begin
  select departamento_id into dep from delegacias where id = p_delegacia;
  if not pode_frequencia(dep, p_delegacia) then raise exception 'Sem acesso a esta delegacia.'; end if;
  if p_arquivo not like p_evento::text || '/' || p_delegacia::text || '/%' then raise exception 'Caminho do arquivo inválido.'; end if;
  update frequencia_fechamento set arquivo = p_arquivo, assinado_por = me, assinado_em = now()
   where evento_id = p_evento and delegacia_id = p_delegacia;
  if not found then raise exception 'Feche a frequência antes de enviar o relatório assinado.'; end if;
end $$;

-- ---------- pagamento ----------
/* horas diurnas e noturnas de um turno (mesma regra do valor: cada hora iniciada conta;
   sábado, domingo e feriado contam como noturnas) */
create or replace function public.horas_turno(p_inicio timestamp, p_minutos int, out diurnas int, out noturnas int)
language plpgsql stable set search_path = public as $$
declare t timestamp; h int;
begin
  diurnas := 0; noturnas := 0;
  for h in 0 .. ceil(p_minutos / 60.0)::int - 1 loop
    t := p_inicio + make_interval(hours => h);
    if extract(isodow from t) in (6, 7) or exists (select 1 from feriados f where f.data = t::date)
       or extract(hour from t) < 6 or extract(hour from t) >= 22 then noturnas := noturnas + 1;
    else diurnas := diurnas + 1; end if;
  end loop;
end $$;

/* uma linha por plantão, com quem recebe, horário pago, horas e valor (só Extra é pago) */
create or replace function public.pagamento(p_evento uuid)
returns table (vaga_id bigint, departamento_id int, departamento text, delegacia_id int, delegacia_nome text, data date,
               cargo text, servico text, vaga text, escalado text, situacao text, matricula text, nome text,
               inicio timestamp, fim timestamp, minutos int, horas_diurnas int, horas_noturnas int, valor numeric, observacao text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform exigir_login();
  return query
  with base as (
    select v.*, e.matricula as titular, f.situacao as sit, f.substituto, f.inicio_real, f.fim_real, f.observacao as obs
      from vagas v
      left join escalas e on e.vaga_id = v.id
      left join frequencia f on f.vaga_id = v.id
     where v.evento_id = p_evento and v.ativa and pode_frequencia(v.departamento_id, v.delegacia_id)
       and (e.matricula is not null or f.situacao = 'substituido')
  ), pago as (
    select b.*,
           case when b.sit = 'substituido' then b.substituto else b.titular end as quem,
           case when b.sit in ('horario', 'substituido') then coalesce(b.inicio_real, b.inicio) else b.inicio end as ini,
           case when b.sit in ('horario', 'substituido') then coalesce(b.fim_real, b.fim) else b.fim end as fi
      from base b
  )
  select p.id, p.departamento_id, d.sigla, p.delegacia_id, p.delegacia_nome, p.data, p.cargo, p.servico, p.vaga, ts.nome,
         coalesce(p.sit, 'sem registro'), p.quem, s.nome, p.ini, p.fi,
         case when p.sit in ('presente', 'horario', 'substituido') then (extract(epoch from p.fi - p.ini) / 60)::int else 0 end,
         case when p.sit in ('presente', 'horario', 'substituido') and upper(p.servico) = 'EXTRA' then (horas_turno(p.ini, (extract(epoch from p.fi - p.ini) / 60)::int)).diurnas else 0 end,
         case when p.sit in ('presente', 'horario', 'substituido') and upper(p.servico) = 'EXTRA' then (horas_turno(p.ini, (extract(epoch from p.fi - p.ini) / 60)::int)).noturnas else 0 end,
         case when p.sit in ('presente', 'horario', 'substituido') then valor_turno(p.cargo, p.servico, p.ini, (extract(epoch from p.fi - p.ini) / 60)::int) else 0 end,
         p.obs
    from pago p
    join departamentos d on d.id = p.departamento_id
    left join servidores s on s.matricula = p.quem
    left join servidores ts on ts.matricula = p.titular
   order by d.sigla, p.delegacia_nome, p.inicio, p.vaga;
end $$;

revoke execute on function public.delegs_chefe(), public.pode_frequencia(int, int), public.chefe_da_vaga(bigint), public.servidor_na_frequencia(text), public.definir_chefe(int, text, text, boolean),
  public.listar_chefes(int), public.registrar_frequencia(bigint, text, text, timestamp, timestamp, text),
  public.fechar_frequencia(uuid, int), public.reabrir_frequencia(uuid, int), public.registrar_assinado(uuid, int, text),
  public.horas_turno(timestamp, int), public.pagamento(uuid) from public, anon;
grant execute on function public.delegs_chefe(), public.pode_frequencia(int, int), public.chefe_da_vaga(bigint), public.servidor_na_frequencia(text), public.definir_chefe(int, text, text, boolean),
  public.listar_chefes(int), public.registrar_frequencia(bigint, text, text, timestamp, timestamp, text),
  public.fechar_frequencia(uuid, int), public.reabrir_frequencia(uuid, int), public.registrar_assinado(uuid, int, text),
  public.horas_turno(timestamp, int), public.pagamento(uuid) to authenticated;
