# Rotas e Modos de Transporte (estilo Wanderlog)

Sim, totalmente possível. Mapbox já está configurado (`MAPBOX_PUBLIC_TOKEN`) e a tabela `itinerary_activities` já tem `latitude`/`longitude`. Falta só calcular o trecho entre pontos consecutivos, cachear no banco e mostrar a linha de conexão + bottom sheet.

## 1. Banco de dados

**Nova tabela `activity_routes**` (cache de rotas — evita chamar a API Mapbox toda vez):

- `from_activity_id`, `to_activity_id` (FK, cascade)
- `driving_duration_sec`, `driving_distance_m`
- `transit_duration_sec`, `transit_distance_m` *(ver nota abaixo)*
- `walking_duration_sec`, `walking_distance_m`
- `computed_at`
- UNIQUE (from, to)
- RLS: cliente lê rotas da própria viagem; admin gerencia.

**Preferência de modo** — duas colunas, sem nova tabela:

- `itinerary_activities.transport_mode_to_next` (`driving|transit|walking|hidden|null`) — override por trecho.
- `trips.default_transport_mode` (mesmo enum, default `driving`) — usado pelo botão "Alterar padrão para todos os lugares".

## 2. Lógica (server functions Mapbox)

Arquivo novo `src/lib/routes.functions.ts`:

- `computeDayRoutes({ dayId })` — protegida por `requireSupabaseAuth`. Busca atividades ordenadas por `position` com lat/lon, monta pares consecutivos, e para cada par sem cache (ou stale) chama Mapbox Directions:
  - Driving: `mapbox/driving-traffic`
  - Walking: `mapbox/walking`
  - Transit: Mapbox **não tem** Directions de transporte público. Estratégia: usar `mapbox/driving` como estimativa-base e aplicar um fator (~1.5x duração, mesma distância) marcado como "estimado", **ou** integrar Google Directions Transit depois. Recomendo começar com a estimativa Mapbox e flag `transit_is_estimate: true` no retorno — alternativa: pedir conexão Google Maps (já temos guidance). Decidir antes de implementar.
  - Upsert em `activity_routes`.
- `getDayRoutes({ dayId })` — só lê o cache.
- `setTripDefaultTransport({ tripId, mode })` e `setSegmentTransport({ fromActivityId, mode })`.

Endereços sem coordenadas: geocodar no momento do save da atividade (já existe `geocodeAddress` em `mapbox.functions.ts`) — adicionar trigger no admin para preencher lat/lon ao criar/editar.

## 3. UI

`**use-my-trip` hook**: incluir `routes` no fetch (single query por trip) e o `default_transport_mode` da trip.

**Componente novo `RouteConnector**` renderizado entre cada par de `ActivityCard` no roteiro:

- Linha tracejada vertical fina + chip horizontal: ícone do modo atual + "42 min • 24 km" + link "Direções".
- Se não há rota calculada ainda: botão "Calcular rotas do dia" (chama `computeDayRoutes`).
- Se modo do trecho = `hidden`: render mínimo "Ocultas".
- Clique abre **Bottom Sheet** (Sheet `side="bottom"` do shadcn — já existe).

**Bottom Sheet "Modo de transporte"**:

- Título centralizado.
- Lista: Condução / Transporte / Caminhada — cada linha com ícone (`Car`, `Bus`, `Footprints` do lucide), nome, e à direita "tempo • km". Selecionar marca como padrão **deste trecho** (`setSegmentTransport`).
- Linha "Ocultar direções" (`EyeOff`).
- Divider + botão texto "Alterar padrão para todos os lugares" → chama `setTripDefaultTransport` com o modo selecionado e limpa overrides do trecho.

**Admin (`admin.viagens.$tripId`)**: botão "Recalcular rotas" por dia (chama `computeDayRoutes` ignorando cache).

## 4. Custos / performance

- Cache em `activity_routes` evita chamadas repetidas; só recalcula quando atividades são adicionadas/movidas (invalidar via trigger ou botão admin).
- 3 chamadas Mapbox por par de pontos. Dia com 5 pontos = 4 pares × 3 = 12 requests, ~1s total.

## Decisões necessárias antes de implementar

1. **Transporte público**: estimativa via Mapbox driving × fator, **ou** adicionar conector Google Maps (Routes API suporta `TRANSIT`)?  
  
via mapbox  

2. **Quando recalcular**: automático ao salvar atividade (admin) ou só botão manual?  
  
Só manual

Posso seguir com (1) estimativa Mapbox + (2) botão manual + auto na criação, se você não responder — mas confirme.