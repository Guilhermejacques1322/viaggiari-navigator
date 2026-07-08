
# Plano: estabilidade + tempo no admin + mapa + aba Utilidades

Quatro frentes, todas na mesma rodada. Nada muda no fluxo de IA nem em schema existente além do necessário para Utilidades.

## 1) Bug do "This page didn't load / Try again"

Sintoma: depois de um tempo montando dias/atividades, cai no `errorComponent` do root. Causas prováveis observadas no código:

- Várias queries do admin usam `staleTime: Infinity` + `refetchOnWindowFocus: false`. Se um `useQuery` lança (ex.: token do Mapbox falha, RLS estoura, rede oscila), o erro sobe até o boundary raiz porque não há `errorComponent` nas rotas.
- `RoteiroTab` faz `Promise.all` de N updates ao reordenar; um único erro rejeita a promise e vai pro boundary sem `try/catch` visível (hoje há try/catch, mas o rollback usa `qc.setQueryData` com snapshot já mutado por referência — pode deixar cache inconsistente).
- `TripMap` importa `mapbox-gl` dinamicamente dentro de `useEffect`. Se o import falha (rede/cache), a Promise não tratada dispara o listener `unhandledrejection` do `error-capture` e a próxima resposta SSR pode ser normalizada como 500.
- Toda a árvore do admin (`admin.tsx` e filhos) não tem `errorComponent` nem `notFoundComponent`, então qualquer throw em loader/render sobe pro raiz.

Ações:
- Adicionar `errorComponent` local em `src/routes/admin.tsx`, `src/routes/admin.viagens.$tripId.tsx` e `src/routes/minha-viagem.tsx` mostrando uma mensagem contextual com botão "Tentar novamente" que faz `router.invalidate() + reset()` sem derrubar a viagem inteira.
- Em `RoteiroTab.handleDragEnd`, capturar `prev` como snapshot profundo (`structuredClone`) antes de mutar, para que o rollback restaure de verdade.
- `TripMap`: envolver o import dinâmico em `try/catch`, exibir card de erro com "Recarregar mapa" e evitar `setState` após unmount (já tem `disposed`, adicionar guarda no catch).
- Query do token do Mapbox: `retry: 2`, `staleTime: 10min`, e `throwOnError: false` — em caso de falha renderizar o mesmo card de erro do mapa.

## 2) Tempo entre atividades no admin (igual ao viajante)

Hoje o `RouteConnector` só aparece em `src/routes/minha-viagem.roteiro.tsx`. Vamos reutilizá-lo em `DayEditor` do admin, entre linhas de atividade.

- Estender a query `["trip-days", tripId]` do admin para trazer também `activity_routes` das atividades do dia e o `default_transport_mode` da viagem (já disponível em `trip`).
- Renderizar `<RouteConnector … isAdmin />` entre cada par consecutivo de atividades dentro do `SortableContext`, fora dos itens sorteáveis (para não interferir no DnD).
- Após persistir reordenação/edição/criação de atividade, disparar `computeDayRoutes({ dayId })` (server fn já existe) e invalidar `["trip-days", tripId]`. Chamada disparada com `void` (fire-and-forget) + toast discreto em erro; nunca bloqueia UI.
- Botão manual "Recalcular tempos" no cabeçalho do dia, útil quando coordenadas mudarem.

## 3) Mapa que não carrega em alguns desktops

Além do try/catch do item 1:
- Quando o mapa vive dentro de uma `Tabs` que começa oculta (`display:none`), o Mapbox inicializa com container 0×0 e não desenha. Corrigir chamando `map.resize()` em um `ResizeObserver` do container e também em um `requestAnimationFrame` após a tab virar visível (detectar via `IntersectionObserver` ou hook simples que observa `offsetParent`).
- Pré-carregar `mapbox-gl` com `import(/* webpackPrefetch: true */ 'mapbox-gl')` — no Vite basta um `import('mapbox-gl')` disparado assim que a rota da viagem monta, para o chunk já estar em cache quando a aba abrir.
- Estilo `streets-v12` já é leve; garantir `preserveDrawingBuffer: false` (default) e não recriar o mapa em cada troca de aba (o `useEffect` atual só cria se `mapRef.current` for null — ok).
- Card de fallback com botão "Tentar novamente" quando `tokenData` falhar ou o import quebrar.

## 4) Nova aba "Utilidades" (admin + cliente)

Campos por item: `kind` (texto livre — tipo de utilidade), `name`, `address`, `maps_url`. Nada de coordenadas, nada de mapa.

Schema (migration nova):
- Tabela `public.trip_utilities` com colunas: `id uuid pk default gen_random_uuid()`, `trip_id uuid fk trips on delete cascade`, `kind text not null`, `name text not null`, `address text`, `maps_url text`, `position int default 0`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
- `GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_utilities TO authenticated;` + `GRANT ALL … TO service_role;`.
- RLS: `SELECT` para admin (via `has_role`) ou dono da viagem (mesmo padrão de `itinerary_days`); `INSERT/UPDATE/DELETE` só admin.
- Trigger `touch_updated_at`.

Admin (`admin.viagens.$tripId.tsx`):
- Nova aba "Utilidades" após "Checklist" no `TabsList`.
- Componente `UtilitiesTab` com lista simples, botão "Adicionar utilidade", diálogo com os 4 campos, ações editar/excluir.

Cliente:
- Nova rota `src/routes/minha-viagem.utilidades.tsx` listando utilidades da viagem atual (via `useMyTrip` estendido para trazer `utilities`).
- Incluir `utilities` no `MyTripProvider` (`src/hooks/use-my-trip.tsx`): novo fetch em paralelo, tipo `TripUtility[]`.
- Adicionar item "Utilidades" no `NAV` de `src/routes/minha-viagem.tsx` (mobile + desktop). No mobile a grid vira `grid-cols-7` (ou reduzir texto/ícones para caber).
- UI cliente: cards com `kind` como chip, nome em destaque, endereço e link "Abrir no Maps" (usa `maps_url` ou fallback `https://www.google.com/maps/search/?api=1&query=<address>`).

## Fora do escopo
- Nenhuma alteração na criação por IA.
- Nenhuma alteração em schema de `itinerary_*` ou `activity_routes`.
- Sem otimizações de performance além das descritas (mapa e drag-and-drop).

## Detalhes técnicos rápidos
- `computeDayRoutes` já existe em `src/lib/routes.functions.ts` e escreve em `activity_routes` via admin client.
- `RouteConnector` já aceita `isAdmin` — reutilização direta.
- `structuredClone` está disponível no runtime moderno usado pelo TanStack Start; se não, `JSON.parse(JSON.stringify(prev))` como fallback.
