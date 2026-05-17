# Plano de melhorias

## 1. Botão "Voltar ao início" no planejamento

Em `src/routes/interesse.tsx` (formulário de cadastro/planejamento inicial), adicionar um botão secundário no topo e/ou rodapé: "← Voltar ao início" que navega para `/`. Útil caso o usuário desista do cadastro.

## 2. Reorganização: Viagens × Orçamentos

### 2.1 Viagens (foco no cliente)

- `src/routes/admin.viagens.$tripId.tsx`: remover a aba "Financeiro" (50/50 nosso recebimento) dessa seção.
- Manter na aba financeira da viagem **apenas custos do roteiro do cliente** — por atividade/dia (quanto o cliente vai gastar em cada item). Será exibido no roteiro entregue para que ele veja o valor total estimado.
- Nova tabela `activity_costs` ou colunas `estimated_cost` + `currency` em `itinerary_activities` para registrar quanto cada atividade custa para o cliente. Agregado por dia e total da viagem.

### 2.2 Orçamentos com fases

Adicionar coluna `status` em `quotes` com enum:

- `sent` (Orçamento enviado)
- `follow_up` (Fazer follow-up — destacado em amarelo na lista)
- `lost` (Cliente desistiu — abre modal pedindo `lost_reason` e marca para futuro CRM)
- `closed` (Orçamento fechado)

Em `src/routes/admin.orcamentos.tsx`:

- Listagem com sub-abas: **Em aberto** (sent + follow_up), **Perdidos**, **Fechados**.
- Cards de follow-up com destaque visual (badge âmbar, borda).
- Botão de mudar fase em cada orçamento; ao escolher "Cliente desistiu" abre dialog com motivo.

### 2.3 Financeiro por orçamento fechado

- Mover o módulo de pagamentos 50/50 da viagem para **dentro de cada orçamento fechado**.
- Tabela `payments` já existe e tem `trip_id` — adicionar `quote_id` (nullable) para vincular ao orçamento. Quando o orçamento é fechado, criar automaticamente 2 parcelas (50% sinal / 50% pré-viagem).
- Nova aba "Financeiro" dentro da página de detalhe do orçamento fechado: parcelas, status, forma de pagamento, comprovante.

### 2.4 Aba "Fechados" com relatório

- Painel agregado: clientes fechados no período, total faturado, total recebido, ticket médio, forma de pagamento mais usada.

## 3. Biblioteca de atividades com país/cidade

- `destination_activities` já existe. Adicionar colunas `country` e `city` (text).
- Em `admin.viagens.$tripId.tsx` (Roteiro), no dialog de criar/editar atividade, adicionar botão "Salvar atividade na biblioteca" — insere em `destination_activities` com país/cidade preenchidos.
- Em `admin.destinos.tsx` (biblioteca), adicionar filtros por país e cidade.
- Ao criar nova atividade no roteiro, oferecer também "Buscar da biblioteca" com filtro país/cidade.

## 4. UX — perda de estado ao trocar de aba do navegador

Já mitigado para o admin (Dialog + `refetchOnWindowFocus: false`). Auditar:

- `admin.viagens.$tripId.tsx`: garantir que **todas** as queries (`trip-days`, `documents`, `payments`) tenham `refetchOnWindowFocus: false` e `staleTime: Infinity`.
- Verificar formulários inline restantes (NewActivityForm, edição de dia) e converter qualquer um que ainda perca estado em Dialog.
- No PWA/mobile, verificar se há `visibilitychange` listener causando reload — remover.

---

## Detalhes técnicos (migrações)

```sql
-- 1. Fases de orçamento
CREATE TYPE quote_status AS ENUM ('sent','follow_up','lost','closed');
ALTER TABLE quotes
  ADD COLUMN status quote_status NOT NULL DEFAULT 'sent',
  ADD COLUMN lost_reason text,
  ADD COLUMN follow_up_at timestamptz,
  ADD COLUMN closed_at timestamptz;

-- 2. Vincular pagamentos a orçamento
ALTER TABLE payments
  ADD COLUMN quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  ADD COLUMN payment_method text;
ALTER TABLE payments ALTER COLUMN trip_id DROP NOT NULL;

-- 3. Custo por atividade do cliente
ALTER TABLE itinerary_activities
  ADD COLUMN estimated_cost numeric DEFAULT 0,
  ADD COLUMN currency text DEFAULT 'BRL';

-- 4. País/cidade na biblioteca de atividades
ALTER TABLE destination_activities
  ADD COLUMN country text,
  ADD COLUMN city text;
```

Arquivos a tocar:

- `src/routes/interesse.tsx` — botão voltar
- `src/routes/admin.orcamentos.tsx` — sub-abas, fases, dialog "perdeu", financeiro embutido
- `src/routes/admin.viagens.$tripId.tsx` — remover financeiro 50/50, adicionar custos por atividade, botão "Salvar na biblioteca", queries com staleTime
- `src/routes/admin.destinos.tsx` — filtros país/cidade
- Nova migração SQL

## Confirmação antes de começar

Antes de executar, quero confirmar 2 pontos:

1. **Custo por atividade**: registrar em `itinerary_activities.estimated_cost` (simples) ou criar tabela separada `activity_costs` com itens (transporte, ingresso, alimentação)? Sugiro o simples agora.  
  
iremos para o simples agora. 

&nbsp;

1. **Parcelas automáticas ao fechar orçamento**: criar duas de 50% (sinal + final) automaticamente, ou deixar manual? Sugiro automático com opção de editar.  
  
deixar manual, caso o cliente quero pagar a vista.