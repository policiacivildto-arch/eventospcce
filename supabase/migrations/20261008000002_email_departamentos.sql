-- E-mail institucional de cada departamento
alter table public.departamentos add column if not exists email text;
update public.departamentos set email = 'dpis@pc.ce.gov.br' where sigla = 'DPI SUL';
update public.departamentos set email = 'dpni@pc.ce.gov.br' where sigla = 'DPI NORTE';
