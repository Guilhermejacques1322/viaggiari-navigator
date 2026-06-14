# Criação de roteiro com IA

Nova aba dentro de **Admin → Viagens → (viagem)**, ao lado de Roteiro/Documentos/etc., que recebe um prompt livre, chama a IA e devolve uma lista editável de sugestões prontas para virar atividades nos dias já existentes da viagem.

## Fluxo (UX)

1. Usuário abre a aba **Criação de roteiro**.
2. Vê um resumo curto da viagem (destino, datas, nº de dias existentes) + uma `Textarea` grande para o prompt (ex.: "5 dias em Roma com foco em arte renascentista, casal, gosta de jantar tarde…").
3. Botão **Gerar sugestões**. Enquanto roda: skeleton + indicador "IA pensando…".
4. Resultado: cards agrupados por **Dia 1, Dia 2…** (conforme a IA propôs). Cada card mostra uma lista de atividades sugeridas com:
   - checkbox (marcado por padrão)
   - título editável
   - horário sugerido editável (HH:MM)
   - endereço textual editável
   - descrição curta editável
   - select **"Adicionar ao dia"** — pré-selecionado com o dia correspondente da viagem (Dia 1 da IA → primeiro `itinerary_day` existente, Dia 2 → segundo, e assim por diante). Usuário pode mudar.
5. Se a IA propôs mais dias do que a viagem tem, os "dias extras" aparecem com aviso amarelo: "Sem dia correspondente — selecione manualmente ou desmarque". (Não criamos dias novos — decisão do usuário.)
6. Botões finais:
   - **Adicionar selecionadas ao roteiro** → insere em `itinerary_activities` (posição = final do dia escolhido) e mostra toast "X atividades adicionadas".
   - **Descartar** → limpa o resultado.
   - **Regenerar** → roda a IA de novo com o mesmo prompt (ou prompt editado).
7. Após adicionar, sugerimos abrir a aba Roteiro (link/toast com ação).

## IA

- Modelo: `google/gemini-3-flash-preview` via Lovable AI Gateway (sem chave do usuário).
- Server function `generateItinerarySuggestions` em `src/lib/itinerary-ai.functions.ts`:
  - Input: `{ tripId, prompt }`.
  - Middleware: `requireSupabaseAuth` + checagem de admin via `has_role`.
  - Carrega `trip` (destino, datas, nº de dias) para enriquecer o system prompt.
  - Usa **AI SDK `generateText` com `Output.object`** e schema Zod estrito:
    ```
    { days: Array<{
        day_label: string,        // ex: "Dia 1 — Centro histórico"
        suggested_day_number: number,
        activities: Array<{
          title: string,
          time: string | null,    // "HH:MM" ou null
          address: string | null,
          description: string | null
        }>
      }> }
    ```
  - System prompt: contextualiza destino+datas, instrui para sugerir agrupamento lógico por região, horários realistas, sem inventar endereços específicos demais (usar nome do local + cidade quando inseguro), responder em português.
  - Tratamento de erro 429/402 do gateway → mensagem clara no toast.

- Persistência (segunda server function `applyItinerarySuggestions`):
  - Input: `{ tripId, items: Array<{ day_id, title, time, address, description }> }`.
  - Mesmo middleware + checagem admin.
  - Para cada `day_id` envolvido, calcula `MAX(position)+1` e insere em sequência. Retorna contagem inserida.

## Arquivos afetados

- `src/lib/itinerary-ai.functions.ts` (novo) — `generateItinerarySuggestions` e `applyItinerarySuggestions`.
- `src/routes/admin.viagens.$tripId.tsx` — adicionar nova `TabsTrigger`/`TabsContent` "Criação de roteiro" e o componente `AiItineraryTab` (no mesmo arquivo, seguindo padrão das outras tabs daqui).
- `package.json` — confirmar que `ai` e `@ai-sdk/openai-compatible` já estão instalados (a stack já usa). Caso não, adicionar.

## Fora de escopo

- Não cria dias novos automaticamente.
- Não busca fotos/coordenadas (geocoding continua via botão "Geo faltantes" que já existe).
- Não toca no app do cliente — só admin.
- Não persiste o histórico de prompts/gerações (cada sessão é efêmera).

Posso seguir?
