-- =====================================================================
-- Plantão Eleições / Calculadora de efetivo – estrutura do banco
-- Polícia Civil do Ceará – DTO
--
-- Fluxo:
--   1. Focais lançam o pedido (delegacias + efetivo) de cada evento.
--   2. O DTO fecha versões do pedido (congeladas, com custo).
--   3. O DTO marca UMA versão como "aporte autorizado".
--   4. Vagas da escala:
--        - serviço que não é Extra (ordinário, compensação, extra sem aporte...):
--          saem do pedido atual e aparecem logo para o departamento;
--        - serviço Extra: saem SÓ da versão autorizada, na quantidade autorizada.
--   5. O departamento coloca o nome do servidor em cada vaga (ou "sem servidor").
--      O mesmo servidor nunca fica em duas vagas no mesmo horário,
--      mesmo que departamentos diferentes o escalem.
--
-- Acesso: ninguém escreve direto nas tabelas. Toda escrita passa pelas
-- funções (RPC) deste arquivo, que conferem quem é o usuário e o papel dele.
-- =====================================================================

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- Cadastros
-- ---------------------------------------------------------------------

create table public.departamentos (
  id     serial primary key,
  sigla  text not null unique,           -- DPI SUL, DPI NORTE, DPM, COPLAN...
  nome   text
);

create table public.delegacias (
  id              serial primary key,
  departamento_id int  not null references public.departamentos(id),
  nome            text not null,
  cidade          text,
  seccional       text,
  abre            time,                  -- horário padrão (opcional)
  fecha           time,
  tipo_padrao     text check (tipo_padrao in ('Ordinária','Extra')),
  ativa           boolean not null default true,
  unique (departamento_id, nome)
);

create table public.servidores (
  matricula        text primary key,
  nome             text not null,
  cargo            text not null check (cargo in ('OIP','DPC')),
  email            text unique,          -- e-mail institucional: recebe o código de acesso
  departamento_id  int references public.departamentos(id),
  delegacia_id     int references public.delegacias(id),   -- lotação
  ativo            boolean not null default true
);
create index on public.servidores (departamento_id);
create index on public.servidores (lower(email));

-- quem é focal de qual departamento, e quem é do DTO (vê e decide tudo)
create table public.papeis (
  matricula        text not null references public.servidores(matricula) on delete cascade,
  papel            text not null check (papel in ('focal','dto')),
  departamento_id  int references public.departamentos(id),
  unique nulls not distinct (matricula, papel, departamento_id),
  check (papel = 'dto' or departamento_id is not null)
);

create table public.valores_hora (
  cargo       text primary key check (cargo in ('OIP','DPC')),
  hora_dia    numeric(10,2) not null,   -- 06h às 22h em dia útil
  hora_noite  numeric(10,2) not null    -- 22h às 06h, e sábado, domingo e feriado inteiros
);

create table public.feriados (
  data       date primary key,
  descricao  text
);

-- ---------------------------------------------------------------------
-- Eventos e pedidos (o que a calculadora faz hoje)
-- ---------------------------------------------------------------------

create table public.eventos (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null unique,
  recebimento_aberto  boolean not null default true,   -- focais podem alterar o pedido
  escala_aberta       boolean not null default false,  -- departamentos podem escalar nomes
  criado_em           timestamptz not null default now()
);

create table public.evento_departamentos (
  evento_id        uuid not null references public.eventos(id) on delete cascade,
  departamento_id  int  not null references public.departamentos(id),
  situacao         text not null default 'Aguardando'
                   check (situacao in ('Aguardando','Em preenchimento','Enviado','Alterado após envio')),
  alterado_em      timestamptz,
  enviado_em       timestamptz,
  envios           int not null default 0,
  primary key (evento_id, departamento_id)
);

-- uma delegacia pedida num evento (período, horário e efetivo)
create table public.pedido_delegacias (
  id               uuid primary key default gen_random_uuid(),
  evento_id        uuid not null references public.eventos(id) on delete cascade,
  departamento_id  int  not null references public.departamentos(id),
  delegacia_id     int  references public.delegacias(id),
  delegacia_nome   text not null,
  tipo             text not null default 'Ordinária' check (tipo in ('Ordinária','Extra')),
  data_ini         date not null,
  data_fim         date,                 -- vazio = um dia só
  abre             time not null default '08:00',
  fecha            time not null default '08:00',   -- abre = fecha => 24h
  fim_ultimo_dia   time,                 -- no último dia do período, todos os turnos param aqui
  atualizado_em    timestamptz not null default now(),
  atualizado_por   text,
  check (data_fim is null or data_fim >= data_ini)
);
create index on public.pedido_delegacias (evento_id, departamento_id);

create table public.pedido_efetivo (
  id                 bigserial primary key,
  pedido_delegacia_id uuid not null references public.pedido_delegacias(id) on delete cascade,
  cargo              text not null check (cargo in ('OIP','DPC')),
  qtd                int  not null check (qtd between 1 and 200),
  servico            text not null check (servico in ('Ordinário','Extra','Extra sem aporte','Diária','Compensação de horário')),
  entrada            time not null,
  saida              time not null       -- saída = entrada => 24h; saída menor => passa da meia-noite
);
create index on public.pedido_efetivo (pedido_delegacia_id);

-- ---------------------------------------------------------------------
-- Versões (congeladas) e autorização do aporte
-- ---------------------------------------------------------------------

create table public.versoes (
  id                 uuid primary key default gen_random_uuid(),
  evento_id          uuid not null references public.eventos(id) on delete cascade,
  numero             int  not null,
  motivo             text,
  fechada_em         timestamptz not null default now(),
  fechada_por        text,
  delegacias         int not null default 0,
  vagas              int not null default 0,
  horas              numeric(12,2) not null default 0,
  custo              numeric(14,2) not null default 0,
  pedido             jsonb not null,     -- cópia do pedido inteiro, para restaurar depois
  aporte_autorizado  boolean not null default false,
  autorizado_em      timestamptz,
  autorizado_por     text,
  unique (evento_id, numero)
);
-- só uma versão autorizada por evento
create unique index versoes_uma_autorizada on public.versoes (evento_id) where aporte_autorizado;

-- cada vaga da versão, com valor calculado no momento em que foi fechada
create table public.versao_vagas (
  id               bigserial primary key,
  versao_id        uuid not null references public.versoes(id) on delete cascade,
  chave            text not null,
  departamento_id  int  not null references public.departamentos(id),
  delegacia_id     int  references public.delegacias(id),
  delegacia_nome   text not null,
  data             date not null,
  cargo            text not null,
  vaga             text not null,        -- OIP 1, OIP 2, DPC 1...
  servico          text not null,
  inicio           timestamp not null,
  fim              timestamp not null,
  horas_pagas      int not null,
  valor            numeric(12,2) not null,
  unique (versao_id, chave)
);

-- versões fechadas não se alteram
create function public.bloquear_alteracao() returns trigger language plpgsql as $$
begin
  raise exception 'Registro congelado: versões fechadas não podem ser alteradas.';
end $$;
create trigger versao_vagas_congeladas before update or delete on public.versao_vagas
  for each row when (pg_trigger_depth() = 0) execute function public.bloquear_alteracao();

-- ---------------------------------------------------------------------
-- Vagas da escala e escala
-- ---------------------------------------------------------------------

create table public.vagas (
  id               bigserial primary key,
  evento_id        uuid not null references public.eventos(id) on delete cascade,
  chave            text not null,
  origem           text not null check (origem in ('pedido','aporte')),
  versao_id        uuid references public.versoes(id),
  departamento_id  int  not null references public.departamentos(id),
  delegacia_id     int  references public.delegacias(id),
  delegacia_nome   text not null,
  data             date not null,
  cargo            text not null,
  vaga             text not null,
  servico          text not null,
  inicio           timestamp not null,
  fim              timestamp not null,
  valor            numeric(12,2) not null default 0,
  ativa            boolean not null default true,  -- false: a vaga saiu do pedido/autorização
  unique (evento_id, chave)
);
create index on public.vagas (evento_id, departamento_id, data);

create table public.escalas (
  vaga_id                  bigint primary key references public.vagas(id) on delete cascade,
  matricula                text references public.servidores(matricula),
  sem_servidor             boolean not null default false,
  periodo                  tsrange not null,   -- cópia do horário da vaga, para o bloqueio de conflito
  departamento_vaga_id     int not null references public.departamentos(id),
  departamento_servidor_id int references public.departamentos(id),
  escalado_por             text,
  escalado_em              timestamptz not null default now(),
  check ((matricula is null) = sem_servidor),
  -- a mesma pessoa não pode estar em dois lugares ao mesmo tempo
  constraint servidor_sem_conflito exclude using gist (matricula with =, periodo with &&)
    where (matricula is not null)
);
create index on public.escalas (matricula);

-- ---------------------------------------------------------------------
-- Quem é o usuário logado
-- ---------------------------------------------------------------------

create function public.eu() returns text
language sql stable security definer set search_path = public as $$
  select matricula from servidores
   where ativo and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
   limit 1
$$;

create function public.e_dto() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from papeis where matricula = eu() and papel = 'dto')
$$;

create function public.deps_focal() returns setof int
language sql stable security definer set search_path = public as $$
  select departamento_id from papeis where matricula = eu() and papel = 'focal'
$$;

create function public.pode_departamento(p_dep int) returns boolean
language sql stable security definer set search_path = public as $$
  select e_dto() or p_dep in (select deps_focal())
$$;

create function public.exigir_login() returns text
language plpgsql stable security definer set search_path = public as $$
declare m text := eu();
begin
  if m is null then raise exception 'Acesso negado: entre com a sua matrícula.'; end if;
  return m;
end $$;

create function public.exigir_dto() returns text
language plpgsql stable security definer set search_path = public as $$
declare m text := exigir_login();
begin
  if not e_dto() then raise exception 'Só o DTO pode fazer isso.'; end if;
  return m;
end $$;

-- ---------------------------------------------------------------------
-- Regra de pagamento (igual ao calcularPagamento da escala)
--   só "Extra" é pago; horas arredondadas para cima; cada hora pelo valor
--   diurno (06h–22h) ou noturno (22h–06h); sábado, domingo e feriado: noturno.
-- ---------------------------------------------------------------------

create function public.valor_turno(p_cargo text, p_servico text, p_inicio timestamp, p_minutos int)
returns numeric language plpgsql stable set search_path = public as $$
declare v valores_hora; t timestamp; total numeric := 0; especial boolean; h int;
begin
  if upper(p_servico) <> 'EXTRA' then return 0; end if;
  select * into v from valores_hora where cargo = upper(p_cargo);
  if not found then return 0; end if;
  for h in 0 .. ceil(p_minutos / 60.0)::int - 1 loop
    t := p_inicio + make_interval(hours => h);
    especial := extract(isodow from t) in (6, 7) or exists (select 1 from feriados f where f.data = t::date);
    total := total + case when especial or extract(hour from t) < 6 or extract(hour from t) >= 22
                          then v.hora_noite else v.hora_dia end;
  end loop;
  return round(total, 2);
end $$;

-- ---------------------------------------------------------------------
-- Vagas que o pedido atual gera (uma linha por policial por dia)
-- ---------------------------------------------------------------------

create function public.vagas_do_pedido(p_evento uuid)
returns table (chave text, departamento_id int, delegacia_id int, delegacia_nome text, data date,
               cargo text, vaga text, servico text, inicio timestamp, fim timestamp, horas_pagas int, valor numeric)
language sql stable security definer set search_path = public as $$
  with base as (
    select d.id as pid, d.departamento_id, d.delegacia_id, d.delegacia_nome, dia::date as dia,
           (dia::date = coalesce(d.data_fim, d.data_ini)) as ultimo, d.fim_ultimo_dia,
           e.id as eid, e.cargo, e.servico, e.entrada, e.saida, k
      from pedido_delegacias d
      join pedido_efetivo e on e.pedido_delegacia_id = d.id
      cross join lateral generate_series(d.data_ini, coalesce(d.data_fim, d.data_ini), interval '1 day') dia
      cross join lateral generate_series(1, e.qtd) k
     where d.evento_id = p_evento
  ), turno as (
    select b.*,
           extract(epoch from b.entrada)::int / 60 as ini_min,
           case when b.saida = b.entrada then 1440
                else ((extract(epoch from b.saida)::int - extract(epoch from b.entrada)::int) / 60 + 1440) % 1440 end as dur
      from base b
  ), cortado as (
    select t.*,
           case when t.ultimo and t.fim_ultimo_dia is not null
                then coalesce(nullif(extract(epoch from t.fim_ultimo_dia)::int / 60, 0), 1440) end as corte
      from turno t
  ), final as (
    select c.*, case when c.corte is null then c.dur else least(c.dur, c.corte - c.ini_min) end as minutos
      from cortado c
     where c.corte is null or c.ini_min < c.corte
  )
  select f.pid || '|' || f.dia || '|' || f.cargo || '/' || f.servico || '/' || to_char(f.entrada, 'HH24:MI') || '/' ||
           to_char(f.saida, 'HH24:MI') || '|' || f.k,
         f.departamento_id, f.delegacia_id, f.delegacia_nome, f.dia, f.cargo,
         f.cargo || ' ' || row_number() over (partition by f.pid, f.dia, f.cargo order by f.eid, f.k),
         f.servico,
         f.dia + f.entrada,
         f.dia + f.entrada + make_interval(mins => f.minutos),
         ceil(f.minutos / 60.0)::int,
         valor_turno(f.cargo, f.servico, f.dia + f.entrada, f.minutos)
    from final f
$$;

-- deixa a tabela "vagas" igual ao que deve existir agora:
--   não-Extra a partir do pedido atual; Extra a partir da versão autorizada
create function public.sincronizar_vagas(p_evento uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_autorizada uuid; n int;
begin
  select id into v_autorizada from versoes where evento_id = p_evento and aporte_autorizado;

  create temp table _desejadas on commit drop as
    select p.chave, 'pedido'::text as origem, null::uuid as versao_id, p.departamento_id, p.delegacia_id,
           p.delegacia_nome, p.data, p.cargo, p.vaga, p.servico, p.inicio, p.fim, p.valor
      from vagas_do_pedido(p_evento) p
     where p.servico <> 'Extra'
    union all
    select vv.chave, 'aporte', vv.versao_id, vv.departamento_id, vv.delegacia_id,
           vv.delegacia_nome, vv.data, vv.cargo, vv.vaga, vv.servico, vv.inicio, vv.fim, vv.valor
      from versao_vagas vv
     where vv.versao_id = v_autorizada and vv.servico = 'Extra';

  insert into vagas as v (evento_id, chave, origem, versao_id, departamento_id, delegacia_id, delegacia_nome,
                          data, cargo, vaga, servico, inicio, fim, valor, ativa)
  select p_evento, d.chave, d.origem, d.versao_id, d.departamento_id, d.delegacia_id, d.delegacia_nome,
         d.data, d.cargo, d.vaga, d.servico, d.inicio, d.fim, d.valor, true
    from _desejadas d
  on conflict (evento_id, chave) do update
     set origem = excluded.origem, versao_id = excluded.versao_id, departamento_id = excluded.departamento_id,
         delegacia_id = excluded.delegacia_id, delegacia_nome = excluded.delegacia_nome, data = excluded.data,
         cargo = excluded.cargo, vaga = excluded.vaga, servico = excluded.servico, inicio = excluded.inicio,
         fim = excluded.fim, valor = excluded.valor, ativa = true;

  -- vaga que deixou de existir: apaga se ninguém foi escalado; se foi, fica inativa para o DTO ver
  delete from vagas v where v.evento_id = p_evento
     and not exists (select 1 from _desejadas d where d.chave = v.chave)
     and not exists (select 1 from escalas e where e.vaga_id = v.id);
  update vagas v set ativa = false where v.evento_id = p_evento
     and not exists (select 1 from _desejadas d where d.chave = v.chave);

  -- horário da escala acompanha a vaga
  update escalas e set periodo = tsrange(v.inicio, v.fim, '[)')
    from vagas v where v.id = e.vaga_id and v.evento_id = p_evento and e.periodo <> tsrange(v.inicio, v.fim, '[)');

  select count(*) into n from vagas where evento_id = p_evento and ativa;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- RPC: pedido (focal lança; DTO vê e altera tudo)
-- ---------------------------------------------------------------------

-- p: {id?, evento_id, departamento_id, delegacia_id?, delegacia_nome, tipo, data_ini, data_fim?, abre, fecha,
--     fim_ultimo_dia?, efetivo: [{cargo, qtd, servico, entrada, saida}]}
create function public.salvar_pedido_delegacia(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare me text := exigir_login(); v_id uuid; v_ev eventos; v_dep int := (p ->> 'departamento_id')::int;
begin
  select * into v_ev from eventos where id = (p ->> 'evento_id')::uuid;
  if not found then raise exception 'Evento não encontrado.'; end if;
  if not pode_departamento(v_dep) then raise exception 'Você não é focal deste departamento.'; end if;
  if not v_ev.recebimento_aberto and not e_dto() then raise exception 'O recebimento deste evento foi encerrado pelo DTO.'; end if;
  if jsonb_array_length(coalesce(p -> 'efetivo', '[]')) = 0 then raise exception 'Informe o efetivo.'; end if;

  v_id := coalesce((p ->> 'id')::uuid, gen_random_uuid());
  if exists (select 1 from pedido_delegacias where id = v_id and (evento_id <> v_ev.id or not pode_departamento(departamento_id))) then
    raise exception 'Delegacia de outro evento ou departamento.';
  end if;

  insert into pedido_delegacias (id, evento_id, departamento_id, delegacia_id, delegacia_nome, tipo, data_ini, data_fim,
                                 abre, fecha, fim_ultimo_dia, atualizado_em, atualizado_por)
  values (v_id, v_ev.id, v_dep, (p ->> 'delegacia_id')::int, p ->> 'delegacia_nome', coalesce(p ->> 'tipo', 'Ordinária'),
          (p ->> 'data_ini')::date, nullif(p ->> 'data_fim', '')::date, coalesce((p ->> 'abre')::time, '08:00'),
          coalesce((p ->> 'fecha')::time, '08:00'), nullif(p ->> 'fim_ultimo_dia', '')::time, now(), me)
  on conflict (id) do update set delegacia_id = excluded.delegacia_id, delegacia_nome = excluded.delegacia_nome,
     tipo = excluded.tipo, data_ini = excluded.data_ini, data_fim = excluded.data_fim, abre = excluded.abre,
     fecha = excluded.fecha, fim_ultimo_dia = excluded.fim_ultimo_dia, atualizado_em = now(), atualizado_por = me;

  delete from pedido_efetivo where pedido_delegacia_id = v_id;
  insert into pedido_efetivo (pedido_delegacia_id, cargo, qtd, servico, entrada, saida)
  select v_id, x ->> 'cargo', (x ->> 'qtd')::int, x ->> 'servico', (x ->> 'entrada')::time, (x ->> 'saida')::time
    from jsonb_array_elements(p -> 'efetivo') x;

  insert into evento_departamentos (evento_id, departamento_id, situacao, alterado_em)
  values (v_ev.id, v_dep, 'Em preenchimento', now())
  on conflict (evento_id, departamento_id) do update
     set situacao = case when evento_departamentos.situacao in ('Enviado','Alterado após envio')
                         then 'Alterado após envio' else 'Em preenchimento' end,
         alterado_em = now();

  perform sincronizar_vagas(v_ev.id);
  return v_id;
end $$;

create function public.excluir_pedido_delegacia(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d pedido_delegacias; v_ev eventos;
begin
  perform exigir_login();
  select * into d from pedido_delegacias where id = p_id;
  if not found then return; end if;
  select * into v_ev from eventos where id = d.evento_id;
  if not pode_departamento(d.departamento_id) then raise exception 'Você não é focal deste departamento.'; end if;
  if not v_ev.recebimento_aberto and not e_dto() then raise exception 'O recebimento deste evento foi encerrado pelo DTO.'; end if;
  delete from pedido_delegacias where id = p_id;
  perform sincronizar_vagas(d.evento_id);
end $$;

create function public.enviar_pedido(p_evento uuid, p_dep int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_login();
  if not pode_departamento(p_dep) then raise exception 'Você não é focal deste departamento.'; end if;
  insert into evento_departamentos (evento_id, departamento_id, situacao, enviado_em, envios, alterado_em)
  values (p_evento, p_dep, 'Enviado', now(), 1, now())
  on conflict (evento_id, departamento_id) do update
     set situacao = 'Enviado', enviado_em = now(), alterado_em = now(),
         envios = evento_departamentos.envios + case when evento_departamentos.situacao = 'Enviado' then 0 else 1 end;
end $$;

-- ---------------------------------------------------------------------
-- RPC: versões e aporte (DTO)
-- ---------------------------------------------------------------------

create function public.fechar_versao(p_evento uuid, p_motivo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me text := exigir_dto(); v_id uuid; v_num int; v_ant uuid; v_snap jsonb;
begin
  if not exists (select 1 from pedido_delegacias where evento_id = p_evento) then
    raise exception 'Não há delegacias neste evento para fechar uma versão.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(d) || jsonb_build_object('efetivo',
           (select coalesce(jsonb_agg(to_jsonb(e) - 'id' - 'pedido_delegacia_id'), '[]') from pedido_efetivo e
             where e.pedido_delegacia_id = d.id)) order by d.departamento_id, d.delegacia_nome), '[]')
    into v_snap from pedido_delegacias d where d.evento_id = p_evento;

  select id into v_ant from versoes where evento_id = p_evento order by numero desc limit 1;
  if v_ant is not null and not exists (
       (select chave, valor from vagas_do_pedido(p_evento) except select chave, valor from versao_vagas where versao_id = v_ant)
       union all
       (select chave, valor from versao_vagas where versao_id = v_ant except select chave, valor from vagas_do_pedido(p_evento))) then
    raise exception 'Nada mudou desde a última versão. Não foi criada uma versão repetida.';
  end if;

  select coalesce(max(numero), 0) + 1 into v_num from versoes where evento_id = p_evento;
  insert into versoes (evento_id, numero, motivo, fechada_por, pedido)
  values (p_evento, v_num, p_motivo, me, v_snap) returning id into v_id;

  insert into versao_vagas (versao_id, chave, departamento_id, delegacia_id, delegacia_nome, data, cargo, vaga, servico,
                            inicio, fim, horas_pagas, valor)
  select v_id, chave, departamento_id, delegacia_id, delegacia_nome, data, cargo, vaga, servico, inicio, fim, horas_pagas, valor
    from vagas_do_pedido(p_evento);

  update versoes set
    delegacias = (select count(*) from pedido_delegacias where evento_id = p_evento),
    vagas = (select count(*) from versao_vagas where versao_id = v_id),
    horas = (select coalesce(sum(extract(epoch from fim - inicio) / 3600), 0) from versao_vagas where versao_id = v_id),
    custo = (select coalesce(sum(valor), 0) from versao_vagas where versao_id = v_id)
  where id = v_id;
  return v_id;
end $$;

create function public.autorizar_aporte(p_versao uuid) returns int
language plpgsql security definer set search_path = public as $$
declare me text := exigir_dto(); v versoes;
begin
  select * into v from versoes where id = p_versao;
  if not found then raise exception 'Versão não encontrada.'; end if;
  update versoes set aporte_autorizado = false, autorizado_em = null, autorizado_por = null
   where evento_id = v.evento_id and aporte_autorizado and id <> p_versao;
  update versoes set aporte_autorizado = true, autorizado_em = now(), autorizado_por = me where id = p_versao;
  return sincronizar_vagas(v.evento_id);
end $$;

create function public.definir_evento(p_evento uuid, p_recebimento boolean, p_escala boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_dto();
  update eventos set recebimento_aberto = coalesce(p_recebimento, recebimento_aberto),
                     escala_aberta = coalesce(p_escala, escala_aberta)
   where id = p_evento;
end $$;

-- ---------------------------------------------------------------------
-- RPC: escala
-- ---------------------------------------------------------------------

-- p_matricula = null e p_sem_servidor = false  -> limpa a vaga
-- p_matricula = null e p_sem_servidor = true   -> "SEM SERVIDOR"
create function public.escalar(p_vaga bigint, p_matricula text, p_sem_servidor boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare me text := exigir_login(); v vagas; ev eventos; s servidores; c record;
begin
  select * into v from vagas where id = p_vaga;
  if not found then raise exception 'Vaga não encontrada.'; end if;
  if not pode_departamento(v.departamento_id) then raise exception 'Esta vaga é de outro departamento.'; end if;
  select * into ev from eventos where id = v.evento_id;
  if not ev.escala_aberta and not e_dto() then raise exception 'A escala deste evento está fechada.'; end if;

  if p_matricula is null and not p_sem_servidor then
    delete from escalas where vaga_id = p_vaga;
    return;
  end if;
  if not v.ativa then raise exception 'Esta vaga não existe mais no pedido ou na autorização. Só é possível limpar.'; end if;

  if p_matricula is not null then
    select * into s from servidores where matricula = p_matricula;
    if not found or not s.ativo then raise exception 'Servidor % não encontrado ou inativo.', p_matricula; end if;
    if s.cargo <> v.cargo then
      raise exception '% é %, mas a vaga é de %.', s.nome, s.cargo, v.cargo;
    end if;
  end if;

  begin
    insert into escalas (vaga_id, matricula, sem_servidor, periodo, departamento_vaga_id, departamento_servidor_id, escalado_por, escalado_em)
    values (p_vaga, p_matricula, p_matricula is null, tsrange(v.inicio, v.fim, '[)'), v.departamento_id, s.departamento_id, me, now())
    on conflict (vaga_id) do update
       set matricula = excluded.matricula, sem_servidor = excluded.sem_servidor, periodo = excluded.periodo,
           departamento_servidor_id = excluded.departamento_servidor_id, escalado_por = me, escalado_em = now();
  exception when exclusion_violation then
    select x.delegacia_nome, x.inicio, x.fim, d.sigla into c
      from escalas e join vagas x on x.id = e.vaga_id join departamentos d on d.id = x.departamento_id
     where e.matricula = p_matricula and e.vaga_id <> p_vaga and e.periodo && tsrange(v.inicio, v.fim, '[)')
     limit 1;
    raise exception '% já está escalado(a) em % (%) de % a %.', s.nome, c.delegacia_nome, c.sigla,
      to_char(c.inicio, 'DD/MM HH24:MI'), to_char(c.fim, 'DD/MM HH24:MI');
  end;
end $$;

-- busca para o campo "NOME DO SERVIDOR"; p_outros = true é o botão "servidor de outro departamento"
create function public.buscar_servidores(p_texto text, p_cargo text, p_dep int, p_outros boolean default false)
returns table (matricula text, nome text, cargo text, departamento text, lotacao text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform exigir_login();
  if not pode_departamento(p_dep) then raise exception 'Você não é focal deste departamento.'; end if;
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

create function public.meu_perfil() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'matricula', s.matricula, 'nome', s.nome, 'cargo', s.cargo,
    'departamento', (select sigla from departamentos where id = s.departamento_id),
    'lotacao', (select nome from delegacias where id = s.delegacia_id),
    'dto', e_dto(),
    'focal_de', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'sigla', d.sigla) order by d.sigla)
                            from departamentos d where d.id in (select deps_focal())), '[]'))
  from servidores s where s.matricula = eu()
$$;

-- ---------------------------------------------------------------------
-- Leitura: o que cada um enxerga
-- ---------------------------------------------------------------------

-- vagas com a escala, prontas para a tela; o servidor comum vê só as próprias
create view public.escala_vagas with (security_invoker = true) as
  select v.id as vaga_id, v.evento_id, v.departamento_id, dep.sigla as departamento, v.delegacia_nome, v.data,
         v.cargo, v.vaga, v.servico, v.inicio, v.fim, v.valor, v.origem, v.ativa,
         e.matricula, s.nome as servidor, e.sem_servidor, sd.sigla as departamento_servidor,
         (e.departamento_servidor_id is not null and e.departamento_servidor_id <> v.departamento_id) as de_outro_departamento,
         e.escalado_por, e.escalado_em
    from vagas v
    join departamentos dep on dep.id = v.departamento_id
    left join escalas e on e.vaga_id = v.id
    left join servidores s on s.matricula = e.matricula
    left join departamentos sd on sd.id = e.departamento_servidor_id;

-- autorizado x escalado por departamento
create view public.resumo_escala with (security_invoker = true) as
  select v.evento_id, dep.sigla as departamento, v.servico, v.cargo,
         count(*) filter (where v.ativa) as vagas,
         count(e.matricula) filter (where v.ativa) as preenchidas,
         count(*) filter (where v.ativa and e.sem_servidor) as sem_servidor,
         count(*) filter (where v.ativa and e.vaga_id is null) as em_aberto,
         count(e.vaga_id) filter (where not v.ativa) as escalados_sem_vaga,
         coalesce(sum(v.valor) filter (where v.ativa), 0) as valor_autorizado,
         coalesce(sum(v.valor) filter (where v.ativa and e.matricula is not null), 0) as valor_escalado
    from vagas v
    join departamentos dep on dep.id = v.departamento_id
    left join escalas e on e.vaga_id = v.id
   group by v.evento_id, dep.sigla, v.servico, v.cargo;

-- ---------------------------------------------------------------------
-- Segurança (RLS): leitura conforme o papel; escrita só pelas funções
-- ---------------------------------------------------------------------

alter table public.departamentos        enable row level security;
alter table public.delegacias           enable row level security;
alter table public.servidores           enable row level security;
alter table public.papeis               enable row level security;
alter table public.valores_hora         enable row level security;
alter table public.feriados             enable row level security;
alter table public.eventos              enable row level security;
alter table public.evento_departamentos enable row level security;
alter table public.pedido_delegacias    enable row level security;
alter table public.pedido_efetivo       enable row level security;
alter table public.versoes              enable row level security;
alter table public.versao_vagas         enable row level security;
alter table public.vagas                enable row level security;
alter table public.escalas              enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon;
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
-- e-mail dos servidores não sai para as telas (só as funções de login usam)
revoke select on public.servidores from authenticated;
grant select (matricula, nome, cargo, departamento_id, delegacia_id, ativo) on public.servidores to authenticated;
grant execute on all functions in schema public to authenticated;
-- funções internas: não ficam expostas
revoke execute on function public.sincronizar_vagas(uuid) from authenticated;
revoke execute on function public.bloquear_alteracao() from authenticated;

-- tabelas de referência: qualquer servidor logado lê
create policy leitura on public.departamentos for select to authenticated using (eu() is not null);
create policy leitura on public.delegacias    for select to authenticated using (eu() is not null);
create policy leitura on public.valores_hora  for select to authenticated using (eu() is not null);
create policy leitura on public.feriados      for select to authenticated using (eu() is not null);
create policy leitura on public.eventos       for select to authenticated using (eu() is not null);

-- servidores: a própria linha; focal vê os do departamento; DTO vê todos (sem e-mail nas telas)
create policy leitura on public.servidores for select to authenticated
  using (matricula = eu() or e_dto() or departamento_id in (select deps_focal())
         -- servidor de outro departamento escalado numa vaga minha: vejo o nome
         or exists (select 1 from escalas e where e.matricula = servidores.matricula
                     and e.departamento_vaga_id in (select deps_focal())));
create policy leitura on public.papeis for select to authenticated
  using (matricula = eu() or e_dto());

create policy leitura on public.evento_departamentos for select to authenticated
  using (pode_departamento(departamento_id));
create policy leitura on public.pedido_delegacias for select to authenticated
  using (pode_departamento(departamento_id));
create policy leitura on public.pedido_efetivo for select to authenticated
  using (exists (select 1 from pedido_delegacias d where d.id = pedido_delegacia_id and pode_departamento(d.departamento_id)));

create policy leitura on public.versoes for select to authenticated using (e_dto());
create policy leitura on public.versao_vagas for select to authenticated
  using (e_dto() or departamento_id in (select deps_focal()));

create policy leitura on public.vagas for select to authenticated
  using (pode_departamento(departamento_id)
         or exists (select 1 from escalas e where e.vaga_id = vagas.id and e.matricula = eu()));
create policy leitura on public.escalas for select to authenticated
  using (matricula = eu() or pode_departamento(departamento_vaga_id)
         or departamento_servidor_id in (select deps_focal()));

-- valores da hora (mesmos da calculadora) e feriado inicial
insert into public.valores_hora values ('OIP', 36.15, 47.00), ('DPC', 50.60, 65.80);
insert into public.feriados values ('2026-04-03', 'Sexta-feira Santa');
