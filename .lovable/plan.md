## Visão geral

Nova aba **Inspiração** dentro de `/admin/marketing` para monitorar perfis do Instagram, ver o que postam e gerar ideias com IA — tudo sob demanda (sem cron), 12 posts por atualização.

## Ator Apify escolhido

Você abriu o `apify/instagram-hashtag-scraper` — esse é por hashtag. Para perfis, vou usar dois atores oficiais Apify:

- **`apify/instagram-profile-scraper`** → bio, foto, seguidores, total de posts.
- **`apify/instagram-scraper`** com `resultsType: "posts"` e `resultsLimit: 12` → últimos 12 posts (foto/reel/carrossel, legenda, likes, comments, timestamp, hashtags, thumbnail).

Chamada via REST sync:
`POST https://api.apify.com/v2/acts/{actor}/run-sync-get-dataset-items?token=APIFY_API_TOKEN`

Custo aproximado: **~US$ 0,03 por perfil por atualização**.

## Setup (1 passo manual seu)

1. Apify Console → Settings → **Integrations → Personal API tokens** → Create token.
2. Eu peço o secret `APIFY_API_TOKEN` via tool segura — você cola lá, sem expor no código.

## Banco (1 migração)

```text
instagram_profiles
  username (unique), display_name, bio, profile_pic_url,
  followers, posts_count, niche_note,
  last_scraped_at, last_ai_summary, last_ai_summary_at

instagram_posts
  profile_id, external_id, posted_at, media_type,
  caption, thumbnail_url, permalink, likes, comments, hashtags[]

instagram_ai_ideas
  profile_id (nullable = ideia cruzada), title, body,
  suggested_media_type, suggested_networks[], created_at,
  used_post_id (nullable, vira FK p/ marketing_posts)
```

Tudo com RLS `admin only` (mesma policy de `marketing_posts`).

## Server functions (`src/lib/instagram.functions.ts`)

Todas com `requireSupabaseAuth` + checagem `has_role(admin)`:

- `addProfile({ username, niche_note })` — insere e dispara scrape inicial.
- `scrapeProfile({ profileId })` — chama os 2 atores Apify, salva perfil + 12 posts (upsert por `external_id`).
- `analyzeProfile({ profileId })` — pega últimos posts, manda pro Lovable AI Gateway (`google/gemini-3-flash-preview`) e gera:
  - **Resumo de estilo** (tom, temas, formato preferido, hashtags recorrentes, frequência por semana, melhores horários aparentes).
  - **5 ideias de postagem** adaptadas para Viaggiari → salvas em `instagram_ai_ideas`.
- `analyzeCrossTrends()` — recebe resumos dos perfis monitorados e devolve **tendências cruzadas** (temas/formatos em alta).
- `convertIdeaToPost({ ideaId, publishAt, networks })` — cria registro em `marketing_posts` pré-preenchido e marca `used_post_id`.
- `removeProfile({ profileId })`.

Tudo no servidor: token Apify e `LOVABLE_API_KEY` nunca chegam ao browser.

## UI (`src/routes/admin.marketing.tsx`)

Vira `Tabs` no topo: **Cronograma** (o que já existe) | **Inspiração** (novo).

Aba Inspiração:
- Botão **+ Adicionar perfil** (input `@handle` + nota de nicho).
- Botão **Analisar tendências cruzadas** no header (habilita com 3+ perfis).
- Grid de cards de perfil:
  - Avatar, @handle, seguidores, posts/semana (calculado dos timestamps).
  - Mix de formato (foto/reel/carrossel) em barra fina.
  - Botões: **Atualizar** (re-scrape), **Analisar com IA**, **Remover**.
  - Expand: últimos 12 posts em grid 4×3 (thumb + likes + tipo); resumo de IA renderizado em markdown; lista de ideias com botão **Usar como postagem** (abre o `PostDialog` já existente pré-preenchido).
- Card separado "Tendências cruzadas" quando gerado.

Loading states com skeletons, toast em erros Apify (rate limit, perfil privado), confirm na exclusão usando `confirmAction` existente.

## Tratamento de erros

- Apify 429/insuficiência de créditos → toast claro, sem quebrar UI.
- Perfis privados → marcar `is_private` e bloquear scrape.
- IA 402/429 (Lovable AI Gateway) → toast pedindo tentar novamente / verificar créditos.

## Fora deste plano (futuro)

- Cron diário automático.
- Análise de hashtags via `apify/instagram-hashtag-scraper`.
- Histórico de evolução de seguidores (gráfico).
- Detecção automática de "post viralizou" (alerta).

## Ordem de execução

1. Pedir `APIFY_API_TOKEN` via secret tool.
2. Migration (tabelas + RLS + grants).
3. `src/lib/instagram.functions.ts` (Apify + IA).
4. Refator de `admin.marketing.tsx` em Tabs + novo componente `MarketingInspiration.tsx`.
5. Smoke test: adicionar 1 perfil real, scrape, analisar, converter ideia em postagem.
