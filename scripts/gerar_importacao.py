"""Gera o SQL de importação de departamentos, unidades (delegacias) e servidores.

Uso: python3 -I gerar_importacao.py LISTA_SERVIDORES.csv CALCULADORA.txt SAIDA.sql RELATORIO.txt

- Servidores: só cargos OIP e DPC.
- Ativo = tem departamento atual e a observação não indica exoneração, aposentadoria,
  falecimento ou demissão.
- Unidades: todas as lotações da lista, no departamento informado na lista; as delegacias
  do cadastro da calculadora entram também (com seccional), no departamento do cadastro.
- E-mail: a lista não traz; fica vazio até ser importado.
"""
import csv, io, re, sys, unicodedata, collections as C

def norm(s):
    s = unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', s).strip().upper()

def lit(v):
    return 'null' if v in (None, '') else "'" + str(v).replace("'", "''") + "'"

lista, calc, saida, relatorio = sys.argv[1:5]
rows = list(csv.reader(open(lista, encoding='utf-8')))
h = next(i for i, r in enumerate(rows) if len(r) > 2 and r[1] == 'NOME')
col = {x: i for i, x in enumerate(rows[h])}
dados = [r for r in rows[h + 1:] if len(r) > 2 and r[1].strip()]
g = lambda r, c: r[col[c]].strip()

t = open(calc, encoding='utf-8').read()
parts = re.split(r'^## Sheet name: (.+)\n', t, flags=re.M)
secs = {parts[i].strip(): list(csv.reader(io.StringIO(parts[i + 1]))) for i in range(1, len(parts), 2)}
cad = [r for r in secs['Cadastro de delegacias'][1:] if len(r) > 1 and r[1].strip()]

INATIVO = re.compile(r'EXONER|APOSENT|FALECID|DEMIT|DEMISS')
rel = []
deps = set()
unidades = {}          # (departamento, nome normalizado) -> [dep, nome, seccional, origem]
# COPLAN cobre só o plantão das 2ª, 7ª, 10ª, 13ª, 20ª, 22ª e 24ª DP da Capital;
# as demais delegacias da Capital são só do DPC
PLANTAO = {2, 7, 10, 13, 20, 22, 24}
ignoradas_coplan = []
for r in cad:
    dep = r[0].strip()
    m = re.match(r'(\d+)\D+DELEGACIA DE POLICIA CIVIL DA CAPITAL$', norm(r[1]))
    if dep == 'COPLAN' and m and int(m.group(1)) not in PLANTAO:
        ignoradas_coplan.append(r[1].strip()); continue
    deps.add(dep)
    unidades[(dep, norm(r[1]))] = [dep, r[1].strip(), (r[5].strip() if len(r) > 5 else ''), 'cadastro']

servs, vistos, dup, fora = [], {}, [], C.Counter()
for r in dados:
    cargo = g(r, 'CARGO ATUAL')
    if cargo not in ('OIP', 'DPC'):
        fora[cargo] += 1; continue
    mat = re.sub(r'[^0-9A-Za-z]', '', g(r, 'MATRÍCULA')).upper()
    dep = g(r, 'DEPARTAMENTO (ATUAL)')
    lot = g(r, 'UND. LOTAÇÃO (ATUAL)')
    obs = norm(g(r, 'OBSERVAÇÃO'))
    ativo = bool(dep) and not INATIVO.search(obs)
    if mat in vistos:
        dup.append((mat, vistos[mat], g(r, 'NOME'))); continue
    vistos[mat] = g(r, 'NOME')
    if dep: deps.add(dep)
    if lot and dep and not any(k[1] == norm(lot) for k in unidades):
        unidades[(dep, norm(lot))] = [dep, lot, '', 'lista']
    servs.append((mat, g(r, 'NOME'), cargo, dep, lot, ativo))

sql = ['-- Importação gerada a partir da lista de servidores por lotação', 'begin;']
sql.append('insert into departamentos (sigla) values ' +
           ', '.join('(' + lit(d) + ')' for d in sorted(deps)) + ' on conflict (sigla) do nothing;')
sql.append('insert into delegacias (departamento_id, nome, seccional) select d.id, v.nome, v.sec from (values ' +
           ', '.join('(%s, %s, %s)' % (lit(u[0]), lit(u[1]), lit(u[2])) for u in unidades.values()) +
           ') v(dep, nome, sec) join departamentos d on d.sigla = v.dep on conflict (departamento_id, nome) do nothing;')
for i in range(0, len(servs), 500):
    bloco = servs[i:i + 500]
    sql.append(
        'insert into servidores (matricula, nome, cargo, departamento_id, delegacia_id, ativo) select v.mat, v.nome, v.cargo, d.id, '
        '(select l.id from delegacias l where upper(unaccent_simples(l.nome)) = upper(unaccent_simples(v.lot)) '
        'order by (l.departamento_id = d.id) desc limit 1), v.ativo from (values ' +
        ', '.join('(%s, %s, %s, %s, %s, %s)' % (lit(s[0]), lit(s[1]), lit(s[2]), lit(s[3]), lit(s[4]), 'true' if s[5] else 'false')
                  for s in bloco) +
        ') v(mat, nome, cargo, dep, lot, ativo) left join departamentos d on d.sigla = v.dep '
        'on conflict (matricula) do update set nome = excluded.nome, cargo = excluded.cargo, '
        'departamento_id = excluded.departamento_id, delegacia_id = excluded.delegacia_id, ativo = excluded.ativo;')
sql.append('commit;')
cab = ['create or replace function unaccent_simples(t text) returns text language sql immutable as $$',
       "  select translate(t, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc') $$;"]
open(saida, 'w', encoding='utf-8').write('\n'.join(cab + sql) + '\n')

at = sum(1 for s in servs if s[5])
rel += [f'Linhas na lista: {len(dados)}',
        f'Servidores OIP/DPC importados: {len(servs)} (ativos: {at}, inativos: {len(servs) - at})',
        f'  OIP: {sum(1 for s in servs if s[2] == "OIP")} | DPC: {sum(1 for s in servs if s[2] == "DPC")}',
        f'Fora da importação (outros cargos): {sum(fora.values())} -> {dict(fora)}',
        f'Departamentos: {len(deps)}',
        f'Unidades: {len(unidades)} (do cadastro da calculadora: {sum(1 for u in unidades.values() if u[3] == "cadastro")})',
        f'COPLAN: só as delegacias de plantão (2ª, 7ª, 10ª, 13ª, 20ª, 22ª e 24ª); ignoradas do cadastro: {len(ignoradas_coplan)}',
        f'Matrículas repetidas na lista (mantida a 1ª ocorrência): {len(dup)}']
rel += [f'  {m}: {a} / {b}' for m, a, b in dup]
rel.append(f'Ativos sem lotação: {sum(1 for s in servs if s[5] and not s[4])}')
rel.append('E-mail: a lista não tem e-mail; o login por código só funciona depois de importar os e-mails.')
open(relatorio, 'w', encoding='utf-8').write('\n'.join(rel) + '\n')
print('\n'.join(rel))
