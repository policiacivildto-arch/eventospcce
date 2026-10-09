-- Modelo para dar acesso. Os acessos reais ficam fora do repositório (pasta dados/),
-- porque têm matrícula e e-mail dos servidores.
-- Troque MATRICULA, nome@pc.ce.gov.br e a sigla do departamento e rode no SQL Editor.

-- 1) e-mail institucional (sem e-mail o servidor não consegue entrar)
update public.servidores set email = 'nome@pc.ce.gov.br' where matricula = 'MATRICULA';

-- 2a) administrador (DTO)
insert into public.papeis (matricula, papel, departamento_id) values ('MATRICULA', 'dto', null) on conflict do nothing;

-- 2b) focal de um departamento
insert into public.papeis (matricula, papel, departamento_id)
  select 'MATRICULA', 'focal', id from public.departamentos where sigla = 'DPI NORTE'
  on conflict do nothing;
