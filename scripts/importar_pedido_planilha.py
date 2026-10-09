import csv,io,re,sys,json
t=open(sys.argv[1],encoding='utf-8').read();parts=re.split(r'^## Sheet name: (.+)\n',t,flags=re.M);secs={parts[i].strip():list(csv.reader(io.StringIO(parts[i+1]))) for i in range(1,len(parts),2)}
rows=[r for r in secs['Delegacias'][1:] if len(r)>9 and r[0]]
S={'Ordinário':'O','Extra':'E','Extra sem aporte':'S','Diária':'D','Compensação de horário':'C'}
lin=[]
for r in rows:
  ef=';'.join(f"{g['cargo']},{g['qtd']},{S[g['servico']]},{g['ini']},{g['fim']}" for g in json.loads(r[9]))
  lin.append('|'.join([r[2],r[3],'X' if r[4]=='Extra' else 'O',r[5],r[6],r[7],r[8],(r[11] if len(r)>11 else ''),ef]))
txt='\n'.join(lin).replace("'","''")
sql=f"""create temp table _l on commit drop as select regexp_split_to_array(l,'\\|') a from regexp_split_to_table('{txt}', E'\\n') l;
create temp table _imp on commit drop as select a[1] dep, a[2] nome, case a[3] when 'X' then 'Extra' else 'Ordinária' end tipo,
  a[4]::date ini, nullif(a[5],'')::date fim, a[6]::time abre, a[7]::time fecha, nullif(a[8],'')::time ult, a[9] ef from _l;
with ev as (select id from eventos where nome = 'ELEIÇÕES 2026 - 2º TURNO'),
novos as (
  insert into pedido_delegacias (evento_id, departamento_id, delegacia_id, delegacia_nome, tipo, data_ini, data_fim, abre, fecha, fim_ultimo_dia, atualizado_por)
  select ev.id, d.id,
         (select l.id from delegacias l where l.departamento_id = d.id and upper(unaccent_simples(l.nome)) = upper(unaccent_simples(i.nome)) limit 1),
         i.nome, i.tipo, i.ini, i.fim, i.abre, i.fecha, i.ult, 'importado da planilha'
    from _imp i join departamentos d on d.sigla = i.dep cross join ev
  returning id, departamento_id, delegacia_nome, data_ini, abre
)
insert into pedido_efetivo (pedido_delegacia_id, cargo, qtd, servico, entrada, saida)
select n.id, g[1], g[2]::int,
       case g[3] when 'O' then 'Ordinário' when 'E' then 'Extra' when 'S' then 'Extra sem aporte' when 'D' then 'Diária' else 'Compensação de horário' end,
       g[4]::time, g[5]::time
  from novos n join departamentos d on d.id = n.departamento_id
  join _imp i on i.dep = d.sigla and i.nome = n.delegacia_nome and i.ini = n.data_ini and i.abre = n.abre
  cross join lateral regexp_split_to_table(i.ef, ';') x
  cross join lateral regexp_split_to_array(x, ',') g;"""
open(sys.argv[2],'w').write(sql);print(len(sql))
