# Plano: Navegação automática para Roteiro após aplicar atividades da IA

## Problema
Quando o usuário clica em "Adicionar selecionadas ao roteiro", as atividades são inseridas no banco, mas ele continua na aba "Criação por IA" sem feedback visual. A aba Roteiro usa `staleTime: Infinity` e não refetcha sozinho, exigindo que o usuário crie uma atividade manualmente para "acordar" a lista.

## Solução

### 1. Tornar Tabs controlados no AiCreationTab
- Substituir `<Tabs defaultValue="info">` por `<Tabs value={tab} onValueChange={setTab}>`
- Adicionar `useState("info")` para gerenciar a aba ativa

### 2. Atualizar callback onApplied no AiCreationTab
- Invalidar queries com `refetchType: "all"` para forçar refetch mesmo se o componente estiver desmontado
- Chamar `setTab("roteiro")` para navegar automaticamente para a aba Roteiro
- Manter o toast de confirmação

### 3. Limpar lógica de onApply no AiCreationTab
- Remover toast redundante de "abra a aba Roteiro"
- Manter `clearDraft()` para limpar seleção

### 4. Corrigir query do RoteiroTab
- Alterar `staleTime: Infinity` para `staleTime: 0` na query `["trip-days", tripId]`
- Isso garante que ao remontar (quando a aba Roteiro for ativada), uma nova requisição seja feita

## Resultado esperado
Usuário clica "Adicionar selecionadas ao roteiro" → vê toast de confirmação → é automaticamente redirecionado para a aba Roteiro → atividades já aparecem listadas, sem necessidade de gatilho manual.

## Fora do escopo
- Sem alterações na IA, schema ou criação de dias.
