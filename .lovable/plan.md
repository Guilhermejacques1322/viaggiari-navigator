## Diagnóstico

### 1) Por que os tempos aparecem como "—" no roteiro

Confirmei no banco: a tabela `activity_routes` tem **0 linhas**. Ou seja, nenhuma rota foi calculada ainda. O componente `RouteConnector` renderiza "—" quando não encontra o registro de rota para aquele par de atividades.

**Como funciona hoje, na prática:**
1. Cada atividade precisa ter `latitude`/`longitude` (geocodificadas pelo botão "Geocodificar" no admin).
2. O admin abre o roteiro do dia → clica no botão **"Calcular rotas"** (canto direito, só visível para admin).
3. O servidor chama o Mapbox Directions para cada par consecutivo (driving + walking) e estima transit como `driving × 1.6`.
4. Só depois disso o `RouteConnector` mostra tempo/km.

Atividades **sem coordenadas são ignoradas** com aviso. No dia 1 da viagem atual, da atividade 9 em diante (Almoço, Apart Hotel, etc.) faltam lat/lng — esses trechos nunca terão rota até serem geocodificados.

### 2) Por que o Mapbox manda para o lugar errado (dia 1, atividade "Paseo Bandera")

No banco, o endereço `Bandera 100, 8320297 401, Santiago, Región Metropolitana, Chile` foi geocodificado para `-36.81, -73.05` — isso é **Concepción**, ~500 km ao sul de Santiago.

Causas:
- A função `geocodeAddress` faz uma chamada crua com `limit=1` e **sem filtro de país nem viés de proximidade**. O endereço tem um "401" estranho no meio que confunde o ranqueador do Mapbox e ele escolhe outra cidade.
- Não há revisão visual: o admin clica "Geocodificar" e o primeiro resultado é salvo cegamente.

## Plano de correção

### A. Tornar os tempos visíveis automaticamente (sem precisar clicar "Calcular rotas")
- No `RouteConnector`, quando `route` for `null` mas ambas atividades tiverem coordenadas, disparar `computeDayRoutes` em background uma vez por dia (debounce/lock por `dayId` em memória) e atualizar via `refetch`.
- Para o admin: manter o botão manual "Calcular rotas" (refresh forçado) e adicionar tooltip explicando o cache.
- Quando um trecho não puder ser calculado (sem coords), exibir mensagem clara: "Adicionar endereço para calcular" em vez de "—".

### B. Melhorar geocodificação (resolver o caso Santiago)
1. **Filtros mais inteligentes** em `geocodeAddress`:
   - Aceitar parâmetros opcionais `country` (ISO, ex. `cl`) e `proximity` (`lng,lat`).
   - Pedir `limit=5` e retornar todos os candidatos com `place_name`, `center`, `relevance`.
2. **Viés automático por viagem**: no admin, ao geocodificar, passar como `proximity` a média das coordenadas já existentes da mesma viagem (se houver) — isso evita pular para outra cidade.
3. **Seleção manual de candidato**: o botão "Geocodificar" abre um pequeno popover com a lista dos 5 melhores resultados (nome completo + país); o admin clica no certo. Se só houver 1 com alta relevância, auto-seleciona.
4. **Ajuste fino opcional**: permitir que o admin edite `latitude`/`longitude` à mão (campos numéricos) e veja um mini-mapa Mapbox com pin arrastável para corrigir casos extremos.
5. **Re-geocodificar em massa (admin)**: botão "Re-geocodificar viagem" que reprocessa todas as atividades aplicando o viés de proximidade — útil para corrigir os pontos já errados como o "Paseo Bandera".

### C. Limpeza dos dados atuais
- Após implementar B, rodar a re-geocodificação na viagem atual para corrigir Paseo Bandera e os outros pontos suspeitos, e completar lat/lng das atividades 9–15 do dia 1.

## Arquivos afetados

- `src/lib/mapbox.functions.ts` — aceitar `country`/`proximity`, retornar lista de candidatos.
- `src/routes/admin.viagens.$tripId.tsx` — popover de candidatos, mini-mapa com pin arrastável, botão "Re-geocodificar viagem", campos lat/lng editáveis.
- `src/components/route-connector.tsx` — auto-compute em background + mensagem de "sem endereço".
- `src/lib/routes.functions.ts` — sem mudanças funcionais (talvez aceitar `tripId` para auto-call sem checar admin? mantém RLS).

## Decisões que preciso de você

1. **Auto-cálculo de rotas**: ok disparar automaticamente quando o usuário abrir o dia (gasta tokens Mapbox mas evita o "—"), ou prefere manter só manual no admin?
2. **Re-geocodificação em massa**: pode rodar agora na viagem atual para corrigir os pontos errados, ou prefere revisar um a um?
