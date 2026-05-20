# Plano de Otimização — Viaggiari

Aplicado em ordem de impacto. Cada bloco é independente e pode ser revertido isoladamente.

---

## 1. Lazy import do `jsPDF` (~350kB fora do bundle admin)

`jspdf` está em `src/lib/quote-pdf.ts` (não diretamente em `admin.orcamentos.tsx`). Vou:

- Converter `quote-pdf.ts` para exportar uma função `async` que faz `const { default: jsPDF } = await import("jspdf")` dentro dela.
- Ajustar `admin.orcamentos.tsx` para `await generateQuotePdf(...)` no handler do clique.
- Resultado: `jspdf` vira chunk separado, baixado só ao gerar PDF.

---

## 2. `trip-map.tsx` — estabilidade de re-render

Já está ok em duas coisas (token com `staleTime: Infinity`, `useMemo` em `daysWithCoords`). Faltam:

- `export const TripMap = memo(function TripMap(...))` — evita re-render do mapa quando o pai atualiza por motivos não relacionados.
- `useCallback` em handlers de clique de dia/marker.
- `useMemo` na lista de markers derivada de `daysWithCoords` + `selectedDay`, para não recriar Mapbox markers a cada render.
- No pai (`minha-viagem.mapa.tsx`), envolver `days` em `useMemo` antes de passar (a referência hoje vem do contexto e pode ser nova a cada render).

---

## 3. `use-my-trip.tsx` — contexto memoizado e staleTime maior

Hoje o `value` do Provider é um objeto novo a cada render → toda a área `/minha-viagem` re-renderiza por motivos espúrios.

- Envolver `value` em `useMemo(() => ({ data, loading, refetch }), [data, query.isLoading, query.refetch])`.
- Subir `staleTime` de `30_000` para `5 * 60_000` (5 min) — dados de roteiro não mudam a cada segundo.
- Adicionar `gcTime: 30 * 60_000`.
- Separação em dois contexts não é necessária aqui: o context hoje só carrega `data + loading + refetch`, não há "UI state" misturado. Skip o subitem 3b.

---

## 4. `admin.viagens.$tripId.tsx` (850 linhas) — split + memo

Quebrar em sub-componentes no diretório `src/components/admin/trip/`:

- `TripHeaderSection.tsx`
- `AtividadesSection.tsx`
- `VoosSection.tsx`
- `HospedagemSection.tsx`
- `DocumentosSection.tsx`
- `PagamentosSection.tsx` (se existir)

Cada um:
- `export default memo(Section)`
- Recebe apenas os dados que consome (props enxutas).
- Lazy render condicional via tabs: `{tab === "voos" && <VoosSection .../>}` — não montar todas as seções no DOM.

Auditar mutations:
- Cada `useMutation.onSuccess` deve invalidar **apenas** a chave afetada (`["trip", tripId, "activities"]`, etc.) — sem `invalidateQueries()` sem argumento.

---

## 5. `minha-viagem.roteiro.tsx` — virtualização + skeleton

- Adicionar `@tanstack/react-virtual` (não está instalado ainda — `bun add @tanstack/react-virtual`).
- Aplicar `useVirtualizer` **só** quando `activities.length > 15` (abaixo disso, virtualização atrapalha mais que ajuda).
- Skeleton já é trivial: substituir o estado vazio durante `loading` por 3 cards `<Skeleton>`.

---

## 6. `index.tsx` (landing, 341 linhas)

- Hero `<img>`: `loading="eager" fetchpriority="high" decoding="async"` + dimensões explícitas (evita CLS).
- Restante das imagens: `loading="lazy" decoding="async"`.
- Adicionar `<link rel="preload" as="image" ...>` da hero no `head()` da rota.
- Seções abaixo da dobra (depoimentos, FAQ, parceiros): extrair em componentes próprios e carregar com `React.lazy(() => import(...))` + `<Suspense fallback={null}>`.
- Verificar se `embla-carousel`/`recharts` aparecem na landing — se sim, lazy também. (Recharts geralmente não aparece em landing pública.)

---

## 7. Queries Supabase — revisão geral

- Substituir todos os `.select("*")` por listas explícitas de colunas usadas pela UI. Foco nos pontos quentes: `use-my-trip.tsx`, `admin.viagens.tsx`, `admin.orcamentos.tsx`, `admin.crm.tsx`.
- Garantir `.limit()` explícito em todas as listas paginadas/admin (default 50 ou 100).
- Migration adicionando índices que provavelmente faltam:
  - `idx_trips_contact_id`, `idx_trips_visible_to_client`
  - `idx_itinerary_days_trip_id`, `idx_itinerary_activities_day_id`
  - `idx_documents_trip_id`, `idx_payments_trip_id`
  - `idx_contacts_user_id`
  - `idx_leads_status_created_at`
  (Vou inspecionar o schema antes de criar a migration — só adicionar os que não existirem.)

---

## Ordem de execução

1. Lazy jsPDF (1 arquivo, ganho imediato no admin).
2. Memoização `use-my-trip` + bump de `staleTime`.
3. `memo`/`useMemo`/`useCallback` no `trip-map`.
4. Split do `admin.viagens.$tripId.tsx` em sub-componentes memoizados + lazy por tab.
5. Roteiro: skeleton agora, virtualização se a auditoria mostrar listas longas.
6. Landing: img attrs + lazy de seções abaixo da dobra.
7. Auditoria de `select("*")` + migration de índices (último, requer aprovação separada).

## Fora de escopo

- Realtime Supabase (mencionado em conversas anteriores) — não está nesta lista.
- Refactor visual / mudança de design.
- Habilitar SSR streaming adicional.

## Verificações no fim

- `bun run build` — comparar tamanhos dos chunks antes/depois (esperado: `admin.orcamentos` ~350kB menor; `index` menor por lazy seções).
- Smoke test manual: gerar PDF, abrir mapa, navegar tabs do admin de viagem, abrir roteiro do cliente.
