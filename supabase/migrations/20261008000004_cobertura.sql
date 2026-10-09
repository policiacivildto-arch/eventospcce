-- =====================================================================
-- Cobertura: municípios, abrangência das plantonistas e mapa
--   * cada município tem (ou não) delegacia própria;
--   * no evento, cada plantonista recebe uma lista de municípios (abrangência);
--   * a plantonista funciona sempre 24h, com ou sem pedido de aporte;
--   * em cada hora, a cidade é atendida pela delegacia própria se ela estiver
--     aberta no pedido (ou se for plantonista); senão, pela plantonista;
--     sem plantonista e sem delegacia aberta, fica descoberta.
-- =====================================================================

create table public.municipios (
  ibge int primary key,
  nome text not null unique
);
insert into public.municipios (ibge, nome) values
(2300101, 'Abaiara'),
(2300150, 'Acarape'),
(2300200, 'Acaraú'),
(2300309, 'Acopiara'),
(2300408, 'Aiuaba'),
(2300507, 'Alcântaras'),
(2300606, 'Altaneira'),
(2300705, 'Alto Santo'),
(2300754, 'Amontada'),
(2300804, 'Antonina do Norte'),
(2300903, 'Apuiarés'),
(2301000, 'Aquiraz'),
(2301109, 'Aracati'),
(2301208, 'Aracoiaba'),
(2301257, 'Ararendá'),
(2301307, 'Araripe'),
(2301406, 'Aratuba'),
(2301505, 'Arneiroz'),
(2301604, 'Assaré'),
(2301703, 'Aurora'),
(2301802, 'Baixio'),
(2301851, 'Banabuiú'),
(2301901, 'Barbalha'),
(2301950, 'Barreira'),
(2302008, 'Barro'),
(2302057, 'Barroquinha'),
(2302107, 'Baturité'),
(2302206, 'Beberibe'),
(2302305, 'Bela Cruz'),
(2302404, 'Boa Viagem'),
(2302503, 'Brejo Santo'),
(2302602, 'Camocim'),
(2302701, 'Campos Sales'),
(2302800, 'Canindé'),
(2302909, 'Capistrano'),
(2303006, 'Caridade'),
(2303105, 'Cariré'),
(2303204, 'Caririaçu'),
(2303303, 'Cariús'),
(2303402, 'Carnaubal'),
(2303501, 'Cascavel'),
(2303600, 'Catarina'),
(2303659, 'Catunda'),
(2303709, 'Caucaia'),
(2303808, 'Cedro'),
(2303907, 'Chaval'),
(2303931, 'Choró'),
(2303956, 'Chorozinho'),
(2304004, 'Coreaú'),
(2304103, 'Crateús'),
(2304202, 'Crato'),
(2304236, 'Croatá'),
(2304251, 'Cruz'),
(2304269, 'Deputado Irapuan Pinheiro'),
(2304277, 'Ererê'),
(2304285, 'Eusébio'),
(2304301, 'Farias Brito'),
(2304350, 'Forquilha'),
(2304400, 'Fortaleza'),
(2304459, 'Fortim'),
(2304509, 'Frecheirinha'),
(2304608, 'General Sampaio'),
(2304657, 'Graça'),
(2304707, 'Granja'),
(2304806, 'Granjeiro'),
(2304905, 'Groaíras'),
(2304954, 'Guaiúba'),
(2305001, 'Guaraciaba do Norte'),
(2305100, 'Guaramiranga'),
(2305209, 'Hidrolândia'),
(2305233, 'Horizonte'),
(2305266, 'Ibaretama'),
(2305308, 'Ibiapina'),
(2305332, 'Ibicuitinga'),
(2305357, 'Icapuí'),
(2305407, 'Icó'),
(2305506, 'Iguatu'),
(2305605, 'Independência'),
(2305654, 'Ipaporanga'),
(2305704, 'Ipaumirim'),
(2305803, 'Ipu'),
(2305902, 'Ipueiras'),
(2306009, 'Iracema'),
(2306108, 'Irauçuba'),
(2306207, 'Itaiçaba'),
(2306256, 'Itaitinga'),
(2306306, 'Itapajé'),
(2306405, 'Itapipoca'),
(2306504, 'Itapiúna'),
(2306553, 'Itarema'),
(2306603, 'Itatira'),
(2306702, 'Jaguaretama'),
(2306801, 'Jaguaribara'),
(2306900, 'Jaguaribe'),
(2307007, 'Jaguaruana'),
(2307106, 'Jardim'),
(2307205, 'Jati'),
(2307254, 'Jijoca de Jericoacoara'),
(2307304, 'Juazeiro do Norte'),
(2307403, 'Jucás'),
(2307502, 'Lavras da Mangabeira'),
(2307601, 'Limoeiro do Norte'),
(2307635, 'Madalena'),
(2307650, 'Maracanaú'),
(2307700, 'Maranguape'),
(2307809, 'Marco'),
(2307908, 'Martinópole'),
(2308005, 'Massapê'),
(2308104, 'Mauriti'),
(2308203, 'Meruoca'),
(2308302, 'Milagres'),
(2308351, 'Milhã'),
(2308377, 'Miraíma'),
(2308401, 'Missão Velha'),
(2308500, 'Mombaça'),
(2308609, 'Monsenhor Tabosa'),
(2308708, 'Morada Nova'),
(2308807, 'Moraújo'),
(2308906, 'Morrinhos'),
(2309003, 'Mucambo'),
(2309102, 'Mulungu'),
(2309201, 'Nova Olinda'),
(2309300, 'Nova Russas'),
(2309409, 'Novo Oriente'),
(2309458, 'Ocara'),
(2309508, 'Orós'),
(2309607, 'Pacajus'),
(2309706, 'Pacatuba'),
(2309805, 'Pacoti'),
(2309904, 'Pacujá'),
(2310001, 'Palhano'),
(2310100, 'Palmácia'),
(2310209, 'Paracuru'),
(2310258, 'Paraipaba'),
(2310308, 'Parambu'),
(2310407, 'Paramoti'),
(2310506, 'Pedra Branca'),
(2310605, 'Penaforte'),
(2310704, 'Pentecoste'),
(2310803, 'Pereiro'),
(2310852, 'Pindoretama'),
(2310902, 'Piquet Carneiro'),
(2310951, 'Pires Ferreira'),
(2311009, 'Poranga'),
(2311108, 'Porteiras'),
(2311207, 'Potengi'),
(2311231, 'Potiretama'),
(2311264, 'Quiterianópolis'),
(2311306, 'Quixadá'),
(2311355, 'Quixelô'),
(2311405, 'Quixeramobim'),
(2311504, 'Quixeré'),
(2311603, 'Redenção'),
(2311702, 'Reriutaba'),
(2311801, 'Russas'),
(2311900, 'Saboeiro'),
(2311959, 'Salitre'),
(2312007, 'Santana do Acaraú'),
(2312106, 'Santana do Cariri'),
(2312205, 'Santa Quitéria'),
(2312304, 'São Benedito'),
(2312403, 'São Gonçalo do Amarante'),
(2312502, 'São João do Jaguaribe'),
(2312601, 'São Luís do Curu'),
(2312700, 'Senador Pompeu'),
(2312809, 'Senador Sá'),
(2312908, 'Sobral'),
(2313005, 'Solonópole'),
(2313104, 'Tabuleiro do Norte'),
(2313203, 'Tamboril'),
(2313252, 'Tarrafas'),
(2313302, 'Tauá'),
(2313351, 'Tejuçuoca'),
(2313401, 'Tianguá'),
(2313500, 'Trairi'),
(2313559, 'Tururu'),
(2313609, 'Ubajara'),
(2313708, 'Umari'),
(2313757, 'Umirim'),
(2313807, 'Uruburetama'),
(2313906, 'Uruoca'),
(2313955, 'Varjota'),
(2314003, 'Várzea Alegre'),
(2314102, 'Viçosa do Ceará')
on conflict (ibge) do update set nome = excluded.nome;

alter table public.delegacias add column municipio_ibge int references public.municipios;

-- liga cada unidade territorial ao município pelo nome ("... de Crato", "... da Capital")
with alvo as (
  select u.id, lower(unaccent_simples(u.nome)) as n
    from public.delegacias u join public.departamentos d on d.id = u.departamento_id
   where d.sigla in ('DPI SUL', 'DPI NORTE', 'DPM', 'DPC', 'COPLAN')
     and u.nome !~* '^(n[uú]cleo|seop|seint|n\.o|departamento|.*seccional)'
), nomes as (
  select ibge, lower(unaccent_simples(nome)) as n from public.municipios
  union all select 2307254, 'jijoca jericoacoara'        -- grafia usada na lotação
), casou as (
  select distinct on (a.id) a.id, m.ibge
    from alvo a join nomes m on a.n ~ ('\m(de|do|da) ' || m.n || '$')
   order by a.id, length(m.n) desc
)
update public.delegacias u set municipio_ibge = c.ibge from casou c where c.id = u.id;

update public.delegacias u set municipio_ibge = 2304400                  -- Fortaleza
  from public.departamentos d
 where d.id = u.departamento_id and d.sigla in ('DPC', 'COPLAN')
   and u.municipio_ibge is null and u.nome ~* 'da capital$';

create table public.abrangencias (
  evento_id      uuid not null references public.eventos on delete cascade,
  municipio_ibge int  not null references public.municipios,
  delegacia_id   int  not null references public.delegacias,   -- plantonista
  atualizado_em  timestamptz not null default now(),
  atualizado_por text,
  primary key (evento_id, municipio_ibge)
);
create index on public.abrangencias (evento_id, delegacia_id);

alter table public.municipios   enable row level security;
alter table public.abrangencias enable row level security;
create policy leitura on public.municipios   for select to authenticated using (eu() is not null);
create policy leitura on public.abrangencias for select to authenticated using (eu() is not null);
grant select on public.municipios, public.abrangencias to authenticated;

-- ---------------------------------------------------------------------
-- Faixas de funcionamento de cada delegacia no pedido (uma por dia)
--   mesma regra das vagas: abre = fecha é 24h; o último dia para em fim_ultimo_dia
-- ---------------------------------------------------------------------
create function public.faixas_pedido(p_evento uuid)
returns table (delegacia_id int, faixa tsrange)
language sql stable security definer set search_path = public as $$
  with b as (
    select d.delegacia_id, dia::date as dia, d.abre,
           extract(epoch from d.abre)::int / 60 as ini,
           case when d.fecha = d.abre then 1440
                else ((extract(epoch from d.fecha)::int - extract(epoch from d.abre)::int) / 60 + 1440) % 1440 end as dur,
           case when dia::date = coalesce(d.data_fim, d.data_ini) and d.fim_ultimo_dia is not null
                then coalesce(nullif(extract(epoch from d.fim_ultimo_dia)::int / 60, 0), 1440) end as corte
      from pedido_delegacias d
      cross join lateral generate_series(d.data_ini, coalesce(d.data_fim, d.data_ini), interval '1 day') dia
     where d.evento_id = p_evento and d.delegacia_id is not null
  )
  select delegacia_id,
         tsrange(dia + abre, dia + abre + make_interval(mins => case when corte is null then dur else least(dur, corte - ini) end))
    from b
   where corte is null or ini < corte
$$;
revoke execute on function public.faixas_pedido(uuid) from public, anon, authenticated;

create function public.minutos(m tsmultirange) returns int
language sql immutable set search_path = public as $$
  select coalesce(sum(extract(epoch from upper(r) - lower(r)) / 60), 0)::int from unnest(m) r
$$;

create function public.faixas_texto(m tsmultirange, p_dia date) returns text
language sql immutable set search_path = public as $$
  select string_agg(to_char(lower(r), 'HH24:MI') || '–' ||
                    case when upper(r) = p_dia + 1 then '24:00' else to_char(upper(r), 'HH24:MI') end,
                    ', ' order by lower(r))
    from unnest(m) r
$$;

create function public.exigir_gestor() returns text
language plpgsql stable security definer set search_path = public as $$
declare m text := exigir_login();
begin
  if not (e_dto() or exists (select 1 from deps_focal())) then
    raise exception 'Só o DTO e os focais veem a cobertura.';
  end if;
  return m;
end $$;

-- período analisado: o que o DTO definir; se vazio, do primeiro turno que abre ao último que fecha
alter table public.eventos add column cobertura_ini timestamp, add column cobertura_fim timestamp;

create function public.janela_evento(p_evento uuid) returns tsrange
language sql stable security definer set search_path = public as $$
  select tsrange(coalesce(e.cobertura_ini, a.ini), coalesce(e.cobertura_fim, a.fim))
    from eventos e,
         (select min(lower(faixa)) as ini, max(upper(faixa)) as fim from faixas_pedido(p_evento)) a
   where e.id = p_evento and coalesce(e.cobertura_ini, a.ini) < coalesce(e.cobertura_fim, a.fim)
$$;

create function public.definir_janela_cobertura(p_evento uuid, p_ini timestamp, p_fim timestamp)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exigir_dto();
  if p_ini is not null and p_fim is not null and p_fim <= p_ini then
    raise exception 'O fim do período precisa ser depois do início.';
  end if;
  update eventos set cobertura_ini = p_ini, cobertura_fim = p_fim where id = p_evento;
end $$;
revoke execute on function public.janela_evento(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Relatório: uma linha por município por dia da operação
-- ---------------------------------------------------------------------
create function public.cobertura(p_evento uuid)
returns table (ibge int, municipio text, dia date, situacao text,
               delegacias_proprias text, horario_proprio text, minutos_proprios int,
               plantonista_id int, plantonista text, plantonista_departamento text,
               horario_plantao text, minutos_plantao int,
               horario_descoberto text, minutos_descobertos int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform exigir_gestor();
  return query
  with f as (select * from faixas_pedido(p_evento)),
  jan as (select janela_evento(p_evento) as w),
  dias as (
    select d::date as dia,
           tsmultirange(tsrange(greatest(d::timestamp, lower(jan.w)), least(d::timestamp + interval '1 day', upper(jan.w)))) as w
      from jan, generate_series(lower(jan.w)::date::timestamp, (upper(jan.w) - interval '1 second')::date::timestamp, interval '1 day') d
     where jan.w is not null
  ),
  -- turnos do pedido + plantonistas abertas o período inteiro (24h)
  f2 as (
    select delegacia_id, faixa from f
    union all
    select distinct a.delegacia_id, jan.w from abrangencias a, jan where a.evento_id = p_evento and jan.w is not null
  ),
  propria as (
    select u.municipio_ibge as ibge, u.nome, range_agg(f2.faixa) as mr
      from f2 join delegacias u on u.id = f2.delegacia_id
     where u.municipio_ibge is not null
     group by 1, 2
  ),
  plant as (
    select a.municipio_ibge as ibge, a.delegacia_id, u.nome, dp.sigla
      from abrangencias a
      join delegacias u on u.id = a.delegacia_id
      join departamentos dp on dp.id = u.departamento_id
     where a.evento_id = p_evento
  ),
  base as (
    select m.ibge, m.nome as municipio, d.dia, d.w,
           (select coalesce(range_agg(r), '{}'::tsmultirange)
              from propria p, unnest(p.mr * d.w) r where p.ibge = m.ibge) as own,
           (select string_agg(p.nome || ' (' || faixas_texto(p.mr * d.w, d.dia) || ')', '; ' order by p.nome)
              from propria p where p.ibge = m.ibge and not isempty(p.mr * d.w)) as nomes,
           pl.delegacia_id, pl.nome as pl_nome, pl.sigla,
           case when pl.delegacia_id is null then '{}'::tsmultirange else d.w end as pl_mr
      from municipios m cross join dias d
      left join plant pl on pl.ibge = m.ibge
  ),
  calc as (
    select b.*, b.pl_mr - b.own as pl_util, b.w - b.own - b.pl_mr as desc_mr from base b
  )
  select c.ibge, c.municipio, c.dia,
         case when minutos(c.desc_mr) = 0 and minutos(c.pl_util) = 0 then 'Delegacia própria'
              when minutos(c.desc_mr) = 0 and minutos(c.own) > 0 then 'Própria + plantão'
              when minutos(c.desc_mr) = 0 then 'Plantão'
              when minutos(c.own) = 0 then 'Sem abrangência'
              else 'Descoberta em parte' end,
         c.nomes, faixas_texto(c.own, c.dia), minutos(c.own),
         c.delegacia_id, c.pl_nome, c.sigla, faixas_texto(c.pl_util, c.dia), minutos(c.pl_util),
         faixas_texto(c.desc_mr, c.dia), minutos(c.desc_mr)
    from calc c
   order by c.dia, c.municipio;
end $$;

-- ---------------------------------------------------------------------
-- Dados do mapa: faixas de cada cidade, para mostrar quem atende a cada hora
-- ---------------------------------------------------------------------
create function public.cobertura_mapa(p_evento uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform exigir_gestor();
  with jan as (select janela_evento(p_evento) as w),
  f as (
    select delegacia_id, faixa from faixas_pedido(p_evento)
    union all
    select distinct a.delegacia_id, jan.w from abrangencias a, jan where a.evento_id = p_evento and jan.w is not null
  ),
  propria as (
    select u.municipio_ibge as ibge,
           jsonb_agg(jsonb_build_object('d', u.nome, 'i', lower(f.faixa), 'f', upper(f.faixa)) order by lower(f.faixa)) as j
      from f join delegacias u on u.id = f.delegacia_id
     where u.municipio_ibge is not null group by 1
  ),
  plant as (
    select a.municipio_ibge as ibge, a.delegacia_id,
           coalesce((select jsonb_build_array(jsonb_build_object('i', lower(jan.w), 'f', upper(jan.w))) from jan where jan.w is not null), '[]') as j
      from abrangencias a
     where a.evento_id = p_evento
  )
  select jsonb_build_object(
           'janela', (select jsonb_build_object('i', lower(w), 'f', upper(w)) from janela_evento(p_evento) w),
           'municipios', coalesce(jsonb_object_agg(m.ibge, jsonb_build_object(
               'p', pl.delegacia_id, 'pf', coalesce(pl.j, '[]'), 'o', coalesce(o.j, '[]'))), '{}'))
    into r
    from municipios m
    left join propria o on o.ibge = m.ibge
    left join plant pl on pl.ibge = m.ibge;
  return r;
end $$;

-- ---------------------------------------------------------------------
-- Gravar a abrangência de uma plantonista (substitui a lista dela)
--   a cidade que estava com outra plantonista passa para esta
-- ---------------------------------------------------------------------
create function public.definir_abrangencia(p_evento uuid, p_delegacia int, p_municipios int[])
returns int language plpgsql security definer set search_path = public as $$
declare me text := exigir_login(); v_dep int; conflito record; n int;
begin
  select departamento_id into v_dep from delegacias where id = p_delegacia;
  if v_dep is null then raise exception 'Delegacia não encontrada.'; end if;
  if not pode_departamento(v_dep) then
    raise exception 'Você só pode definir a abrangência das delegacias do seu departamento.';
  end if;
  if not exists (select 1 from eventos where id = p_evento) then raise exception 'Evento não encontrado.'; end if;

  select m.nome as cidade, u.nome as plantonista into conflito
    from abrangencias a join delegacias u on u.id = a.delegacia_id join municipios m on m.ibge = a.municipio_ibge
   where a.evento_id = p_evento and a.municipio_ibge = any(coalesce(p_municipios, '{}'))
     and a.delegacia_id <> p_delegacia and not pode_departamento(u.departamento_id)
   limit 1;
  if found then
    raise exception '% já está na abrangência de %, de outro departamento. Peça ao DTO para mudar.',
      conflito.cidade, conflito.plantonista;
  end if;

  delete from abrangencias
   where evento_id = p_evento and delegacia_id = p_delegacia
     and not (municipio_ibge = any(coalesce(p_municipios, '{}')));
  insert into abrangencias (evento_id, municipio_ibge, delegacia_id, atualizado_por)
  select p_evento, x, p_delegacia, me from unnest(coalesce(p_municipios, '{}')) x
  on conflict (evento_id, municipio_ibge)
  do update set delegacia_id = excluded.delegacia_id, atualizado_em = now(), atualizado_por = me;
  select count(*) into n from abrangencias where evento_id = p_evento and delegacia_id = p_delegacia;
  return n;
end $$;

-- copia a abrangência de um evento para outro (só o DTO)
create function public.copiar_abrangencia(p_origem uuid, p_destino uuid)
returns int language plpgsql security definer set search_path = public as $$
declare me text := exigir_dto(); n int;
begin
  insert into abrangencias (evento_id, municipio_ibge, delegacia_id, atualizado_por)
  select p_destino, municipio_ibge, delegacia_id, me from abrangencias where evento_id = p_origem
  on conflict (evento_id, municipio_ibge)
  do update set delegacia_id = excluded.delegacia_id, atualizado_em = now(), atualizado_por = me;
  get diagnostics n = row_count;
  return n;
end $$;

-- corrige a cidade de uma unidade (só o DTO)
create function public.definir_municipio_delegacia(p_delegacia int, p_ibge int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exigir_dto();
  update delegacias set municipio_ibge = p_ibge where id = p_delegacia;
end $$;

revoke execute on function public.cobertura(uuid), public.cobertura_mapa(uuid),
  public.definir_abrangencia(uuid, int, int[]), public.copiar_abrangencia(uuid, uuid),
  public.definir_municipio_delegacia(int, int), public.definir_janela_cobertura(uuid, timestamp, timestamp),
  public.exigir_gestor() from public, anon;
grant execute on function public.cobertura(uuid), public.cobertura_mapa(uuid),
  public.definir_abrangencia(uuid, int, int[]), public.copiar_abrangencia(uuid, uuid),
  public.definir_municipio_delegacia(int, int), public.definir_janela_cobertura(uuid, timestamp, timestamp)
  to authenticated;
