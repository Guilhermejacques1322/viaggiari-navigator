
## 1. Delete de dias no roteiro

O que já existe está correto no nível de banco (cascade em `itinerary_activities` e `activity_routes`) e nas políticas RLS (admin tem `ALL`). Então o problema mais provável é UI: hoje `remove()` chama apenas `supabase.from("itinerary_days").delete()` e depois `onChanged()`, sem tratar dois pontos que costumam causar "não deletou":

- Se ocorre um erro no `toast.error`, o usuário vê a mensagem mas nada mais acontece — vou logar `error` completo no console pra facilitar diagnóstico.
- O botão de excluir fica dentro do `SortableActivityRow` de arrasto — em alguns casos o `pointerdown` inicia um drag e o clique nunca dispara. Vou envolver o `Trash2` num `button` com `onPointerDown={(e) => e.stopPropagation()}` (mesmo padrão já usado nas linhas de atividade) e adicionar `type="button"`.
- Adicionar `await` explícito e invalidar a query do trip (`queryClient.invalidateQueries({ queryKey: ["admin-trip", tripId] })`) logo após o delete pra garantir refresh imediato mesmo se o `onChanged` do pai estiver com estado stale.
- Como fallback defensivo, apagar em ordem `activity_routes` → `itinerary_activities` → `itinerary_days` (o cascade já faz, mas se por acaso alguém desativar o cascade em migração futura, isso segura). Só se a primeira tentativa direta retornar erro.

## 2. Mapa não abre

Vou investigar e corrigir os pontos mais prováveis de quebra:

- O `import "mapbox-gl/dist/mapbox-gl.css"` no topo do arquivo é avaliado no SSR e pode explodir dependendo do bundler — mover pra dentro do `useEffect` de init junto com o `import("mapbox-gl")` dinâmico.
- Adicionar `console.error` visível quando `getMapboxToken` falhar (hoje só marca `tokenError` genérico), pra sabermos se é ausência do secret `MAPBOX_PUBLIC_TOKEN` em produção vs erro de rede.
- Garantir que o container tenha altura antes do `new mapboxgl.Map(...)` — se o div estiver com `h-[60vh]` mas dentro de uma aba `hidden`, o Mapbox inicializa em 0×0 e nunca renderiza. Detectar via `getBoundingClientRect()` e adiar init até `ResizeObserver` reportar altura > 0.
- Se `mapError` continuar acontecendo, exibir o texto exato do erro no card "Tentar novamente" (hoje mostramos a mensagem, mas se for o import falhar, é `undefined`).
- Testar via Playwright headless em `/minha-viagem/roteiro` e em `admin.viagens.$tripId?tab=roteiro` pra reproduzir e confirmar a correção.

## 3. Cálculo manual de rotas (admin)

Confirmação: **sim, é isso que você descreveu, e é a abordagem correta**. Hoje, mesmo com o modo `onlyMissing`, sempre que uma atividade é criada/movida o admin dispara `computeDayRoutes` em background, o que:

- Consome API Mapbox Directions em cascata a cada edição.
- Bloqueia a UI enquanto revalida queries.
- Piora quando o dia tem muitas atividades (N-1 chamadas paralelas por dia).

Proposta:

- **Remover todos os `recomputeRoutes` automáticos** disparados após criar / mover / editar atividade. As rotas ficam "desatualizadas" até o admin clicar em calcular.
- No cabeçalho de cada dia, trocar o ícone `MapPin` atual por um botão claro **"Calcular rotas"** que fica em destaque quando existir pelo menos um par sem rota calculada (badge amarelo com o número de trechos pendentes, ex: "Calcular rotas (3)").
- Ao clicar, calcula **só aquele dia** e mostra `Calculando…` com spinner no próprio botão. Usa `onlyMissing: true` por padrão; um menu "…" oferece "Forçar recálculo total" quando quiser refazer tudo do dia.
- No topo da aba Roteiro, adicionar um botão global **"Calcular rotas pendentes"** que roda todos os dias com pendências em sequência (não em paralelo entre dias, pra não estourar rate-limit da Mapbox), com barra de progresso "Dia 2 de 5".
- Para o cliente (view `/minha-viagem`) nada muda: continua rápido porque só lê `activity_routes` já persistidas.

### Detalhes técnicos
- Adicionar coluna virtual "pendências" no admin: contar pares `(atividade[i], atividade[i+1])` com coords válidas que não existem em `day.routes`. Isso já pode ser derivado no cliente sem query nova.
- O botão dispara `computeDayRoutes({ data: { dayId, onlyMissing: true } })` e invalida `["admin-trip", tripId]` no `onSuccess`.
- Manter o `RouteConnector` renderizando o placeholder ("— calcular —") quando não há rota persistida, ao invés de esconder o segmento.

## Arquivos a alterar
- `src/routes/admin.viagens.$tripId.tsx` — delete de dia, remover auto-recompute, novo botão por dia + botão global.
- `src/components/map/trip-map.tsx` — CSS lazy, guard de altura, logs claros.
- `src/lib/routes.functions.ts` — nenhuma mudança de schema, só será chamado sob demanda.
