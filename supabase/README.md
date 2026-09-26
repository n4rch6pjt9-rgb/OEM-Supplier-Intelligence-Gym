# Supabase

Estrutura do ADR-003: um Operador DB (HUB) e um Client DB por consignatário.

| Pasta | Conteúdo |
| --- | --- |
| `operator/migrations/` | Migrações do Operador DB (catálogo global, câmbio, agendamentos) |
| `client/migrations/` | Migrações de cada Client DB (processos Comex, pedidos) |
| `functions/` | Edge Functions |

## Edge Functions

| Função | O que faz | Agendamento |
| --- | --- | --- |
| `cambio-ptax` | Busca a PTAX USD/BRL no Banco Central e grava em `cambio` | Dias úteis, 16:30 UTC |
| `crawl-mic` | Catálogo Made-in-China: fábricas, séries, produtos, atributos, embalagens e 2 imagens por SKU | Uma página da `crawler_fila` a cada 2 min |

## Instalação no Operador DB

1. Aplicar as migrações de `operator/migrations/` em ordem.
2. Gravar os segredos no Vault (a service role nunca vai para o código):

   ```sql
   select vault.create_secret('https://<projeto>', 'project_url');
   select vault.create_secret('<service_role_key>', 'service_role_key');
   ```

3. Publicar as funções: `supabase functions deploy cambio-ptax` e `supabase functions deploy crawl-mic`.
4. Cadastrar uma fábrica: `POST /functions/v1/crawl-mic` com `{ "acao": "descobrir", "url": "https://<loja>.en.made-in-china.com/" }`. O agendamento processa a fila a partir daí.
