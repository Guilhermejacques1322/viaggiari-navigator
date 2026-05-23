## Dashboard com métricas, filtros de período e exportação

### Objetivo

Transformar o dashboard atual em uma central de insights com filtro de período global, cards expandidos e exportação Excel por relatório.

### 1. Filtro de período global (topo do dashboard)

Seletor único que afeta todos os blocos:

- **Este mês** (padrão)
- **Mês passado**
- **Últimos 30 dias**
- **Últimos 90 dias**
- **Este ano**
- **Personalizado** (date range picker)

### 2. Cards de métricas (linha superior)

Cada card mostra o valor + variação % vs período anterior equivalente:

- **Leads no período** (contagem em `leads`)
- **Orçamentos enviados** (contagem em `quotes` no período)
- **Orçamentos em aberto** (status `sent` + `follow_up`, total acumulado)
- **Taxa de conversão** (orçamentos fechados ÷ enviados no período)
- **Receita no período** (soma `payments.amount` onde `status=paid` e `paid_date` no range)
- **Ticket médio** (receita ÷ clientes fechados)
- **Viagens em andamento** (status `building/delivered/in_progress`)
- **Clientes ativos** (contacts `active_client`)

### 3. Relatórios detalhados (cada um com botão "Exportar Excel" no canto superior direito)

Cada painel terá ícone `Download` que gera um `.xlsx` via biblioteca `xlsx` (SheetJS). Arquivo nomeado `{relatorio}_{periodo}.xlsx`.

**Relatórios:**

1. **Leads recentes** — nome, email, telefone, destino, período, origem, data
2. **Orçamentos em aberto** — cliente, destino, valor, status, dias desde envio, follow-up agendado
3. **Receita detalhada** — data pagamento, cliente, viagem/orçamento, parcela, valor, forma pagamento
4. **Próximas viagens** — título, cliente, destinos, datas, status, valor total
5. **Funil de conversão** *(novo — recomendação)* — lead → contato → orçamento → fechado, com counts e %
6. **Performance por destino** *(novo — recomendação)* — agrupa leads + viagens + receita por destino, ranking dos top destinos

### 4. Gráficos visuais (recomendações extras)

Usando `recharts` (já comum no stack shadcn):

- **Receita ao longo do tempo** — line chart agrupado por dia/semana/mês conforme o range
- **Leads por origem** — bar chart (source de `leads`/`contacts`)
- **Status dos orçamentos** — donut (sent / follow_up / closed / lost)

### 5. Outras recomendações baseadas no app

- **Alertas operacionais** no topo: orçamentos sem follow-up há >7 dias, pagamentos vencidos, viagens começando em <7 dias sem documentos
- **Próximos pagamentos a vencer** (próximos 30 dias) — ajuda no fluxo de caixa
- **Atividades favoritadas pendentes de confirmação** no pré-roteiro — útil para o time saber o que está aguardando resposta
- **Aniversário de viagem** *(opcional)* — clientes cuja viagem acontece no mês, gancho para reengajamento

### Detalhes técnicos

- Adicionar `bun add xlsx` (SheetJS) para exportação client-side
- Criar helper `src/lib/export-xlsx.ts` com `exportToExcel(filename, rows, columns)`
- Refatorar `admin.index.tsx`: extrair cada painel em componente próprio recebendo `dateRange` via prop, com seu próprio `useQuery` e botão de export
- Date range usando `react-day-picker` (já instalado via shadcn calendar)
- Comparação % vs período anterior: calcular range espelho automaticamente
- Cores de variação: verde (+), vermelho (-), cinza (=) usando tokens semânticos

### Fora de escopo

- Exportar PDF (Excel é o pedido)
- Agendamento/envio automático de relatórios por email
- Dashboard configurável (drag-and-drop de widgets)

### Pergunta antes de implementar

Quer que eu inclua **todos** os relatórios + gráficos + alertas listados acima, ou prefere começar enxuto (só os 5 relatórios que você citou + filtro de período + export) e adicionarmos gráficos/alertas em uma segunda rodada?

&nbsp;

Pode adicionar todos os relatórios. 