# Drag-and-drop de atividades no admin

Sim, é totalmente possível. Hoje o ícone à esquerda (`GripVertical`) é apenas decorativo. Vou transformá-lo num **handle real de arrastar**, permitindo:

- Reordenar atividades dentro do mesmo dia (subir/descer).
- Mover uma atividade para outro dia, soltando sobre o card de outro dia.
- Feedback visual durante o arraste (sombra, cursor, item "fantasma").
- Persistência imediata no banco (atualiza `position` e, se mudou de dia, `day_id`).

## Escopo

Apenas a tela **Admin → Viagens → Roteiro** (`src/routes/admin.viagens.$tripId.tsx`). Não mexo no app do cliente.

## Como vai funcionar (UX)

1. Usuário segura o quadradinho `⋮⋮` à esquerda da atividade.
2. O card "flutua" seguindo o cursor/dedo (suporte mouse + touch).
3. Áreas de soltar válidas:
   - Outras posições **dentro do mesmo dia** → reordena.
   - **Cabeçalho de outro dia** (e qualquer área da lista daquele dia) → move para o final daquele dia, ou entre atividades se soltar entre dois cards.
4. Ao soltar, o estado da UI atualiza otimisticamente e a persistência roda em background. Se falhar, faz rollback e exibe toast de erro.

## Implementação técnica

### Biblioteca
- Adicionar `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (leve, acessível, com suporte a teclado e touch — padrão React moderno).

### Estrutura
- Envolver a lista de dias num único `<DndContext>` no componente raiz do tab Roteiro, para permitir cross-day drag.
- Cada dia vira um `SortableContext` com `verticalListSortingStrategy`, recebendo os IDs das suas atividades.
- Cada atividade vira um `useSortable` item; o `listeners` é aplicado **apenas no `GripVertical`** (handle), para que cliques nos botões Editar/Lixeira/Maps continuem funcionando.
- O cabeçalho/dropzone do dia também vira um `useDroppable` para aceitar drop em dia vazio ou ao final.

### Persistência
Novo server function `reorderActivities` em `src/lib/routes.functions.ts` (ou novo `src/lib/itinerary.functions.ts`):
- Input: `{ tripId, updates: Array<{ id, day_id, position }> }`.
- Usa `requireSupabaseAuth` + checagem de admin (`has_role`).
- Faz `update` em lote em `itinerary_activities` numa transação (loop com `Promise.all`, ou uma função SQL `reorder_activities` para garantir atomicidade).
- Recalcula `position` sequencialmente (0,1,2,...) nos dias afetados para evitar colisão com a constraint única `(day_id, position)` se existir.

Estratégia anti-colisão (caso haja unique constraint):
1. Primeiro `UPDATE` move tudo do(s) dia(s) afetado(s) para `position = position + 1000` (offset temporário).
2. Depois aplica as posições finais. Vai como uma migration que cria a função RPC `reorder_activities(payload jsonb)`.

### UI/estado
- Estado local `days` já existe; após reorder otimista, dispara o server fn e em caso de erro chama `refetch`/rollback.
- Feedback: `DragOverlay` mostra um clone do card com sombra; cursor `grab`/`grabbing` no handle; opacidade reduzida no item original.
- Acessibilidade: dnd-kit já fornece navegação por teclado (Space para pegar, setas para mover, Space para soltar).

### Arquivos afetados
- `src/routes/admin.viagens.$tripId.tsx` — DndContext, SortableContext, handle, DragOverlay, otimismo.
- `src/lib/itinerary.functions.ts` (novo) — `reorderActivities` server fn.
- `supabase/migrations/*.sql` (novo, se necessário) — função RPC `reorder_activities` e/ou ajuste de constraint para `DEFERRABLE`.
- `package.json` — `@dnd-kit/*`.

## Fora de escopo
- Drag-and-drop de **dias inteiros** (só atividades).
- Mudar o app do cliente (`minha-viagem.roteiro.tsx`) — continua read-only.
- Auto-recálculo de horário ao mover (mantém o `time` original; usuário ajusta via Editar se quiser).

Posso seguir?
