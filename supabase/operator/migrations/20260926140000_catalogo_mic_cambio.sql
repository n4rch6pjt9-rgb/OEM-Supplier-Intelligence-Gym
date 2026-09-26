-- Operador DB · catálogo global (Made-in-China) e câmbio PTAX.
-- Tabelas usadas pelas Edge Functions crawl-mic e cambio-ptax.
-- Dados globais do HUB: não têm tenant_id e ficam fora dos Client DBs (ADR-003).

create extension if not exists pgcrypto;

-- ---------- câmbio ----------
create table if not exists public.cambio (
  id          bigint generated always as identity primary key,
  data        date not null,
  moeda       text not null,
  compra      numeric(12, 6) not null,
  venda       numeric(12, 6) not null,
  fonte       text not null,
  criado_em   timestamptz not null default now(),
  unique (data, moeda, fonte)
);

-- ---------- portos ----------
create table if not exists public.portos (
  id         uuid primary key default gen_random_uuid(),
  locode     text not null unique,
  nome       text not null,
  pais       text not null,
  criado_em  timestamptz not null default now()
);

insert into public.portos (locode, nome, pais) values
  ('CNTXG', 'Tianjin Xingang', 'CN'),
  ('CNTAO', 'Qingdao', 'CN'),
  ('CNNGB', 'Ningbo', 'CN'),
  ('CNSHA', 'Shanghai', 'CN'),
  ('CNXMN', 'Xiamen', 'CN'),
  ('CNYTN', 'Shenzhen Yantian', 'CN')
on conflict (locode) do nothing;

-- ---------- fábricas, linhas e produtos ----------
create table if not exists public.fabricas (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  nome_curto         text,
  slug               text not null unique,
  url_mic            text unique,
  cidade             text,
  provincia          text,
  porto_embarque_id  uuid references public.portos (id),
  porto_confirmado   boolean not null default false,
  observacoes        text,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

create table if not exists public.linhas (
  id          uuid primary key default gen_random_uuid(),
  fabrica_id  uuid not null references public.fabricas (id) on delete cascade,
  codigo      text not null,
  nome        text,
  categoria   text,
  criado_em   timestamptz not null default now(),
  unique (fabrica_id, codigo)
);

create table if not exists public.produtos (
  id                 uuid primary key default gen_random_uuid(),
  fabrica_id         uuid not null references public.fabricas (id) on delete cascade,
  linha_id           uuid references public.linhas (id) on delete set null,
  sku                text not null,
  nome_curto         text,
  nome_original      text,
  ncm                text,
  preco_fob_usd      numeric(14, 2),
  preco_fob_usd_max  numeric(14, 2),
  peso_liquido_kg    numeric(10, 2),
  montado_c_mm       numeric(10, 1),
  montado_l_mm       numeric(10, 1),
  montado_a_mm       numeric(10, 1),
  origem             text,
  visto_site_em      timestamptz,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  unique (fabrica_id, sku)
);
create index if not exists produtos_linha_idx on public.produtos (linha_id);

-- ---------- anúncios Made-in-China ----------
create table if not exists public.anuncios_mic (
  id                     uuid primary key default gen_random_uuid(),
  fabrica_id             uuid not null references public.fabricas (id) on delete cascade,
  url                    text not null unique,
  titulo_original        text,
  codigo_detectado       text,
  preco_min_usd          numeric(14, 2),
  preco_max_usd          numeric(14, 2),
  moq                    integer,
  unidade                text,
  atributos_brutos       jsonb not null default '{}'::jsonb,
  hash_conteudo          text,
  produto_id             uuid references public.produtos (id) on delete set null,
  status_vinculo         text not null default 'pendente'
                         check (status_vinculo in ('pendente', 'sugerido', 'confirmado', 'descartado')),
  score_similaridade     numeric(5, 4),
  imagens_insuficientes  boolean not null default false,
  extraido_em            timestamptz not null default now()
);
create index if not exists anuncios_mic_fabrica_idx on public.anuncios_mic (fabrica_id);
create index if not exists anuncios_mic_produto_idx on public.anuncios_mic (produto_id);

-- ---------- imagens, atributos e embalagens ----------
create table if not exists public.produto_imagens (
  id            uuid primary key default gen_random_uuid(),
  produto_id    uuid references public.produtos (id) on delete cascade,
  anuncio_id    uuid references public.anuncios_mic (id) on delete set null,
  url_origem    text not null,
  storage_path  text,
  ordem         integer not null default 0,
  principal     boolean not null default false,
  criado_em     timestamptz not null default now(),
  -- a mesma foto pode servir a mais de um SKU: uma linha por produto, apontando para o mesmo arquivo
  unique nulls not distinct (produto_id, url_origem)
);
create index if not exists produto_imagens_url_idx on public.produto_imagens (url_origem);
create index if not exists produto_imagens_produto_idx on public.produto_imagens (produto_id, ordem);

create table if not exists public.produto_atributos (
  id             uuid primary key default gen_random_uuid(),
  produto_id     uuid not null references public.produtos (id) on delete cascade,
  chave          text not null,
  valor          text not null,
  unidade        text,
  fonte          text not null,
  confianca      smallint not null default 1,
  documento_ref  text,
  criado_em      timestamptz not null default now()
);
create index if not exists produto_atributos_produto_idx on public.produto_atributos (produto_id, fonte, documento_ref);

create table if not exists public.embalagens (
  id              uuid primary key default gen_random_uuid(),
  produto_id      uuid not null references public.produtos (id) on delete cascade,
  tipo_embalagem  text not null default 'outro',
  comprimento_cm  numeric(10, 2),
  largura_cm      numeric(10, 2),
  altura_cm       numeric(10, 2),
  cbm             numeric(12, 6) generated always as (comprimento_cm * largura_cm * altura_cm / 1000000) stored,
  peso_bruto_kg   numeric(10, 2),
  fonte           text not null,
  observacao      text,
  criado_em       timestamptz not null default now()
);
create index if not exists embalagens_produto_idx on public.embalagens (produto_id, fonte);

-- ---------- condições comerciais e certificações da fábrica ----------
create table if not exists public.fabrica_condicoes (
  fabrica_id     uuid not null references public.fabricas (id) on delete cascade,
  chave          text not null,
  valor          text not null,
  fonte_url      text,
  atualizado_em  timestamptz not null default now(),
  primary key (fabrica_id, chave)
);

create table if not exists public.fabrica_certificacoes (
  fabrica_id   uuid not null references public.fabricas (id) on delete cascade,
  certificado  text not null,
  escopo       text not null check (escopo in ('empresa', 'produto')),
  fonte_url    text,
  visto_em     timestamptz not null default now(),
  primary key (fabrica_id, certificado, escopo)
);

-- ---------- fila e execuções do crawler ----------
create table if not exists public.crawler_fila (
  id                    uuid primary key default gen_random_uuid(),
  fabrica_id            uuid not null references public.fabricas (id) on delete cascade,
  url_loja              text not null unique,
  tipo                  text not null check (tipo in ('grupo', 'loja')),
  linha_nome            text,
  prioridade            integer not null default 100,
  proxima_pagina        integer not null default 1,
  ultimo_primeiro_link  text,
  tentativas            integer not null default 0,
  ativo                 boolean not null default true,
  em_execucao_desde     timestamptz,
  atualizado_em         timestamptz
);
create index if not exists crawler_fila_proximo_idx on public.crawler_fila (prioridade, atualizado_em) where ativo;

create table if not exists public.crawler_jobs (
  id                    uuid primary key default gen_random_uuid(),
  fabrica_id            uuid references public.fabricas (id) on delete cascade,
  url                   text not null,
  tipo                  text,
  status                text not null default 'executando',
  paginas_processadas   integer not null default 0,
  anuncios_encontrados  integer not null default 0,
  erros                 jsonb not null default '[]'::jsonb,
  iniciado_em           timestamptz not null default now(),
  finalizado_em         timestamptz
);

-- ---------- imagens além do limite por SKU (usada por crawl-mic acao=limpar_imagens) ----------
-- storage_path volta nulo quando outra linha que fica usa o mesmo arquivo: apaga a linha, não o arquivo.
create or replace function public.imagens_excedentes(max_por_sku integer, limite integer)
returns table (id uuid, storage_path text)
language sql
stable
as $$
  with ordenadas as (
    select pi.id, pi.storage_path,
           row_number() over (partition by pi.produto_id order by pi.principal desc, pi.ordem, pi.criado_em) as n
    from public.produto_imagens pi
    where pi.produto_id is not null
  ),
  excedentes as (select o.id, o.storage_path from ordenadas o where o.n > max_por_sku limit limite)
  select e.id,
         case when exists (
           select 1 from public.produto_imagens outra
           where outra.storage_path = e.storage_path
             and outra.id not in (select x.id from excedentes x)
         ) then null else e.storage_path end
  from excedentes e;
$$;

-- ---------- acesso ----------
-- As Edge Functions usam a service role (ignora RLS). Usuários logados só leem o catálogo.
do $$
declare t text;
begin
  foreach t in array array[
    'cambio', 'portos', 'fabricas', 'linhas', 'produtos', 'anuncios_mic', 'produto_imagens',
    'produto_atributos', 'embalagens', 'fabrica_condicoes', 'fabrica_certificacoes', 'crawler_fila', 'crawler_jobs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  foreach t in array array[
    'cambio', 'portos', 'fabricas', 'linhas', 'produtos', 'produto_imagens',
    'produto_atributos', 'embalagens', 'fabrica_condicoes', 'fabrica_certificacoes'
  ] loop
    execute format('drop policy if exists leitura_autenticados on public.%I', t);
    execute format('create policy leitura_autenticados on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;

-- ---------- bucket das imagens de produto ----------
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;
