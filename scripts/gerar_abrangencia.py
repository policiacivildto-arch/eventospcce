"""Lê a tabela de abrangência (Departamento<TAB>Municípios<TAB>Plantonista) e gera o SQL.
Uso: python3 scripts/gerar_abrangencia.py dados/abrangencia_2turno.txt mapa/municipios.sql "NOME DO EVENTO" saida.sql
"""
import re, sys, unicodedata
src, munsql, evento, out = sys.argv[1:5]
norm = lambda t: re.sub(r"\s+", " ", unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()).strip()
mun = {norm(n): (int(c), n) for c, n in re.findall(r"\((\d+), '((?:[^']|'')+)'\)", open(munsql, encoding="utf-8").read())}
APELIDO = {"itapajes": "itapaje", "nova jaguaribara": "jaguaribara", "sao joao jaguaribe": "sao joao do jaguaribe",
           "pquet carneiro": "piquet carneiro", "sao goncalo": "sao goncalo do amarante",
           "1a, 2a, 3a, 4a e 5a dp de caucaia": "caucaia", "guaiuba": "guaiuba"}
# plantonista -> (departamento, nome exato da delegacia)
PLANT = {
 "2a dp sobral": ("DPI NORTE", "2ª Delegacia de Polícia Civil de Sobral"),
 "dp tiangua": ("DPI NORTE", "Delegacia de Polícia Civil de Tianguá"), "dp camocim": ("DPI NORTE", "Delegacia de Polícia Civil de Camocim"),
 "dp caninde": ("DPI NORTE", "Delegacia de Polícia Civil de Canindé"), "dp baturite": ("DPI NORTE", "Delegacia de Polícia Civil de Baturité"),
 "dp crateus": ("DPI NORTE", "Delegacia de Polícia Civil de Crateús"), "dp itapipoca": ("DPI NORTE", "Delegacia de Polícia Civil de Itapipoca"),
 "dp acarau": ("DPI NORTE", "Delegacia de Polícia Civil de Acaraú"),
 "crato": ("DPI SUL", "Delegacia de Polícia Civil de Crato"), "aracati": ("DPI SUL", "Delegacia de Polícia Civil de Aracati"),
 "russas": ("DPI SUL", "Delegacia de Polícia Civil de Russas"), "brejo santo": ("DPI SUL", "Delegacia de Polícia Civil de Brejo Santo"),
 "juazeiro do norte": ("DPI SUL", "1ª Delegacia de Polícia Civil de Juazeiro do Norte"), "quixada": ("DPI SUL", "Delegacia de Polícia Civil de Quixadá"),
 "iguatu": ("DPI SUL", "Delegacia de Polícia Civil de Iguatu"), "taua": ("DPI SUL", "Delegacia de Polícia Civil de Tauá"),
 "ico": ("DPI SUL", "Delegacia de Polícia Civil de Icó"), "senador pompeu": ("DPI SUL", "Delegacia de Polícia Civil de Senador Pompeu"),
 "caucaia": ("DPM", "1ª Delegacia de Polícia Civil de Caucaia"), "maracanau": ("DPM", "1ª Delegacia de Polícia Civil de Maracanaú"),
 "aquiraz": ("DPM", "Delegacia de Polícia Civil de Aquiraz"), "horizonte": ("DPM", "Delegacia de Polícia Civil de Horizonte"),
 "pacatuba": ("DPM", "1ª Delegacia de Polícia Civil de Pacatuba"),
 "capital": ("COPLAN", "2ª Delegacia de Polícia Civil da Capital"),
}
PREFERE = {"ico": "ico"}   # cidade listada em duas plantonistas: fica com a da própria cidade
atrib, avisos = {}, []
for linha in open(src, encoding="utf-8"):
    p = [x.strip() for x in linha.rstrip("\n").split("\t")]
    if len(p) < 3 or not p[1]: continue
    pl = norm(p[2])
    if pl == "itaitinga": avisos.append("ITAITINGA (Sistema Penal) não tem cidade; Itaitinga fica com Horizonte."); continue
    if pl not in PLANT: avisos.append("Plantonista não reconhecida: " + p[2]); continue
    if pl == "capital": nomes = ["fortaleza"]
    else:
        t = norm(p[1]).rstrip(".")
        t = APELIDO.get(t, t)
        t = t.replace("sobral carire", "sobral, carire").replace("1a, 2a, 3a, 4a e 5a dp de caucaia", "caucaia")
        nomes = [APELIDO.get(x.strip(" ."), x.strip(" .")) for x in re.split(r",|\.\s| e ", t) if x.strip(" .")]
    for n in nomes:
        n = APELIDO.get(n, n)
        if n not in mun: avisos.append(f"Cidade não encontrada: '{n}' ({p[2]})"); continue
        if n in atrib and atrib[n] != pl:
            fica = PREFERE.get(n, atrib[n]) if PREFERE.get(n) in (pl, atrib[n]) else atrib[n]
            avisos.append(f"{mun[n][1]} aparece em {atrib[n].upper()} e {pl.upper()}: fica com {fica.upper()}.")
            atrib[n] = fica; continue
        atrib[n] = pl
linhas = [f"  ({mun[n][0]}, '{PLANT[pl][0]}', '{PLANT[pl][1]}')" for n, pl in sorted(atrib.items())]
ev = evento.replace("'", "''")
open(out, "w", encoding="utf-8").write(f"""-- Abrangência das plantonistas: {evento}
insert into public.abrangencias (evento_id, municipio_ibge, delegacia_id, atualizado_por)
select e.id, v.ibge, u.id, 'carga inicial'
  from (values
{",".join(chr(10) + l for l in linhas).lstrip(chr(10))}
  ) v(ibge, dep, delegacia)
  join public.departamentos d on d.sigla = v.dep
  join public.delegacias u on u.departamento_id = d.id and u.nome = v.delegacia
  cross join (select id from public.eventos where nome = '{ev}') e
on conflict (evento_id, municipio_ibge) do update set delegacia_id = excluded.delegacia_id, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
""")
semnada = sorted(v[1] for k, v in mun.items() if k not in atrib)
print(len(atrib), "cidades com plantonista;", len(set(atrib.values())), "plantonistas")
print("\n".join(avisos))
print("Sem plantonista na lista:", ", ".join(semnada))
