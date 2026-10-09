"""Gera dados/emails.sql a partir de dados/emails.csv (colunas: matricula,email).

Uso: python3 -I gerar_emails.py dados/emails.csv dados/emails.sql
A importação de servidores não mexe no e-mail, então os e-mails continuam
valendo mesmo depois de reimportar a lista.
"""
import csv, re, sys

entrada, saida = sys.argv[1:3]
linhas, erros = [], []
for i, r in enumerate(csv.DictReader(open(entrada, encoding='utf-8')), start=2):
    mat = re.sub(r'[^0-9A-Za-z]', '', r.get('matricula', '')).upper()
    email = (r.get('email') or '').strip().lower()
    if not mat or not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', email):
        erros.append(f'linha {i}: matrícula ou e-mail inválido ({mat!r}, {email!r})'); continue
    linhas.append(f"update servidores set email = '{email}' where matricula = '{mat}';")
sql = ['begin;'] + linhas + [
    '-- conferência: matrículas da lista de e-mails que não existem no cadastro',
    'select m as matricula_nao_encontrada from (values ' +
    ', '.join("('%s')" % re.search(r"matricula = '([^']+)'", l).group(1) for l in linhas) +
    ') v(m) where not exists (select 1 from servidores s where s.matricula = v.m);' if linhas else '',
    'commit;']
open(saida, 'w', encoding='utf-8').write('\n'.join(sql) + '\n')
print(f'{len(linhas)} e-mail(s) gerado(s)'); [print(e) for e in erros]
