
## 1. Download de documentos não funciona

**Causa provável (a confirmar na implementação):**
- O botão de download chama `createSignedUrl(path, 300)` **sem** o parâmetro `{ download: filename }` e depois faz `window.open(url, "_blank")`.
- Em PWA/mobile e navegadores modernos, `window.open` de outra origem (bucket Supabase) é frequentemente bloqueado como popup; o clique simplesmente "não faz nada". Além disso, sem `download:` na URL assinada, arquivos como PDF/imagem abrem inline (parece que "não baixou") e outros formatos ficam parados.
- No admin, após o upload, o cache do cliente (`useMyTrip`, staleTime 5 min) não é invalidado — o viajante que já estava com o app aberto não vê o documento novo.

**Correção:**
- `src/routes/minha-viagem.documentos.tsx` (`DocCard.open`): pedir URL com forçar download (`createSignedUrl(path, 300, { download: doc.name })`) e disparar o download por `<a href download>` criado programaticamente + `.click()` em vez de `window.open`. Fallback: se `download` falhar, abrir em nova aba via `location.assign` no gesto do usuário.
- Ajustar também o abrir/baixar no admin (`admin.viagens.$tripId.tsx`, funções que abrem documentos) para o mesmo padrão.
- Após upload/remoção de documento no admin, invalidar `["my-trip"]` (via `queryClient.invalidateQueries`) para o app do cliente puxar de novo quando reabrir.

## 2. Utilidades: reordenar itens (admin) + entregar ordem ao cliente

- `UtilitiesTab` em `admin.viagens.$tripId.tsx`: envolver a lista em `DndContext` + `SortableContext` (`@dnd-kit`, já instalado), usando `position` como ordem. Handle igual ao das atividades (grip à esquerda). Ao soltar, `UPDATE trip_utilities SET position = ...` em batch e invalidar a query.
- Como alternativa/complemento para mobile: botões ↑/↓ ao lado do "Editar" para casos em que arrastar é ruim (mesmo padrão só como fallback discreto).
- Cliente (`minha-viagem.utilidades.tsx`) já ordena por `position` no fetch; nada muda além da agrupagem da parte 3.

## 3. Seções nas Utilidades

Objetivo: catalogar cada utilidade sob uma seção (ex.: "Chegada", "Emergências", "Compras", "Retorno") para indicar o momento certo — no admin e no cliente.

**Banco (migration):**
- Nova tabela `trip_utility_sections`:
  - `trip_id` (fk trips), `title text not null`, `position int`, `created_at/updated_at`.
  - RLS: admin CRUD; cliente lê seções da própria viagem (mesmo padrão de `trip_utilities`); GRANT + policies.
- `trip_utilities`: adicionar `section_id uuid null references trip_utility_sections(id) on delete set null`.

**Admin (`UtilitiesTab`):**
- Novo painel "Seções" no topo com input + botão "Adicionar seção", lista com editar/renomear/excluir e DnD para ordenar.
- No form de utilidade, novo `Select` "Seção" (com opção "Sem seção").
- Renderização agrupada por seção (na ordem de `position` da seção; "Sem seção" por último). DnD funciona dentro de cada seção. Arrastar uma utilidade de uma seção para outra atualiza `section_id` + `position`.

**Cliente (`minha-viagem.utilidades.tsx`):**
- Renderizar como grupos: título da seção (tipografia da marca, oliva/terracota, sutil) + lista de cards. Seções sem itens não aparecem. Itens sem seção caem em bloco "Outras utilidades" no fim.

## Detalhes técnicos

- Reuso do `@dnd-kit` já presente em `admin.viagens.$tripId.tsx` (Roteiro). Extrair helper mínimo local ou copiar o padrão do `DayEditor` para a lista de utilidades.
- Toda a mutação de posição é otimista com rollback em erro (padrão já usado no Roteiro).
- Cache: invalidar `["trip-utilities", tripId]` no admin e `["my-trip"]` do lado do cliente.
- Segurança de download: manter bucket `trip-documents` privado; usar sempre URL assinada com `download:`.

## Arquivos afetados
- **Migration nova**: cria `trip_utility_sections` (com GRANT/RLS), adiciona `section_id` em `trip_utilities`.
- `src/routes/minha-viagem.documentos.tsx`: corrigir download (assinada com `download:` + anchor click).
- `src/routes/admin.viagens.$tripId.tsx`: mesmo fix nos downloads do admin; invalidar `my-trip` após upload/delete; `UtilitiesTab` ganha DnD, CRUD de seções e agrupamento; form de utilidade com `Select` de seção.
- `src/routes/minha-viagem.utilidades.tsx`: render agrupado por seção.
- `src/hooks/use-my-trip.tsx`: trazer `trip_utility_sections` no fetch (`MyTripData.utilitySections`).

## Fora de escopo
- Compartilhamento público de documento (link externo).
- Reordenar utilidades no lado do cliente.
- Sugestões automáticas de utilidades por destino.
