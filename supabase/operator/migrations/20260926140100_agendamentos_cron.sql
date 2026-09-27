-- Operador DB · agendamentos das Edge Functions cambio-ptax e crawl-mic via pg_cron + pg_net.
-- A URL do projeto e a service role key ficam no Vault, nunca no código:
--   select vault.create_secret('https://<projeto>', 'project_url');
--   select vault.create_secret('<service_role_key>', 'service_role_key');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Chama uma Edge Function com a service role guardada no Vault.
create or replace function public.chamar_edge_function(funcao text, corpo jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  base  text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  chave text := (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key');
begin
  if base is null or chave is null then
    raise exception 'Segredos project_url e service_role_key ausentes no Vault';
  end if;
  return net.http_post(
    url := base || '/functions/v1/' || funcao,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || chave),
    body := corpo,
    timeout_milliseconds := 150000
  );
end;
$$;

-- Pega o próximo item ativo da fila do crawler e dispara uma página.
-- Um item em execução há mais de 10 min é considerado travado e pode ser retomado.
create or replace function public.crawler_despachar()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  item uuid;
begin
  select id into item
  from public.crawler_fila
  where ativo
    and (em_execucao_desde is null or em_execucao_desde < now() - interval '10 minutes')
  order by prioridade, atualizado_em nulls first
  limit 1
  for update skip locked;

  if item is null then
    return null;
  end if;

  update public.crawler_fila set em_execucao_desde = now() where id = item;
  perform public.chamar_edge_function('crawl-mic', jsonb_build_object('acao', 'pagina', 'fila_id', item));
  return item;
end;
$$;

revoke all on function public.chamar_edge_function(text, jsonb) from public, anon, authenticated;
revoke all on function public.crawler_despachar() from public, anon, authenticated;

-- PTAX: dias úteis às 16:30 UTC (13:30 em Brasília), depois do fechamento do BCB.
select cron.schedule('cambio-ptax-diario', '30 16 * * 1-5',
  $$select public.chamar_edge_function('cambio-ptax', '{"dias": 7}'::jsonb)$$);

-- Crawler: uma página a cada 2 minutos.
select cron.schedule('crawl-mic-fila', '*/2 * * * *', $$select public.crawler_despachar()$$);

-- Limpeza semanal de imagens além de 2 por SKU (domingo 03:00 UTC).
select cron.schedule('crawl-mic-limpar-imagens', '0 3 * * 0',
  $$select public.chamar_edge_function('crawl-mic', '{"acao": "limpar_imagens"}'::jsonb)$$);
