-- funções internas: só as outras funções do banco usam
revoke execute on function public.vagas_do_pedido(uuid) from authenticated;
revoke execute on function public.unaccent_simples(text) from authenticated;
alter function public.bloquear_alteracao() set search_path = public;
alter function public.unaccent_simples(text) set search_path = public;
