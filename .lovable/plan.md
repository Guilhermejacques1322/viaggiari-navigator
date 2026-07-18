
## 1. Capa do dia (URL manual)

**Banco** — migration adiciona coluna à tabela `itinerary_days`:
- `cover_image_url text null`

**Admin — editor do dia** (`admin.viagens.$tripId.tsx`, `DayEditor`):
- Novo campo "Imagem de capa (URL)" no cabeçalho de cada dia, ao lado do título/data.
- Preview 16:9 pequeno abaixo do input quando há URL válida; botão "Remover".
- Salva no blur (mesmo padrão dos outros campos do dia).
- Validação leve: aceita `http(s)://…`; se a imagem falhar em carregar, mostra badge "Não foi possível carregar" sem quebrar o layout.

**Cliente — roteiro** (`minha-viagem.roteiro.tsx`):
- Cada dia vira um **hero grande** (largura total do container, aspect ~21:9 no desktop, 16:9 no mobile), com a imagem em `object-cover`, gradiente escuro embaixo, e por cima:
  - "Dia N" pequeno em cima
  - Título do dia em texto grande branco
  - Data formatada em BR (menor, opacidade 80%)
  - Chevron de collapse no canto
- Se não houver `cover_image_url`, fallback elegante: bloco com gradiente da marca (terracota→oliva) + mesma tipografia (nada de placeholder cinza).
- Abaixo do hero, as atividades continuam como estão hoje (mesmos cards + `RouteConnector`).
- Hero é o próprio toggle (clicável) para expandir/recolher — mantém o comportamento atual.
- No admin também mostro o mesmo hero (menor, ~16:9) no topo do dia para paridade visual.

## 2. Exportar PDF do roteiro (admin)

**Onde**: botão "Exportar PDF" no header da aba **Roteiro** em `admin.viagens.$tripId.tsx`, ao lado de "Calcular rotas pendentes".

**Como**: gerado no cliente com `jspdf` + `jspdf-autotable` (já é padrão do projeto em `quote-pdf.ts`) — sem server function, sem custo extra. Fontes já registradas no util existente serão reaproveitadas/estendidas.

**Conteúdo** (roteiro completo):
1. **Capa**: logo Viaggiari, título da viagem, cliente, período (data início–fim), destino principal.
2. **Índice**: lista de dias com data e título, número da página.
3. **Um dia por seção** (page break entre dias):
   - Cabeçalho: "Dia N — data — título"
   - Imagem de capa do dia (se houver), largura ~metade da página
   - Para cada atividade em ordem:
     - Horário (se houver) + nome (bold)
     - Endereço
     - Descrição curta
     - Parceiro vinculado (se houver)
     - Foto principal da atividade (thumbnail, quando `image_url` existir)
   - Entre atividades: linha com **modo de transporte selecionado + tempo + distância** vinda de `activity_routes` (mesmo dado do `RouteConnector`). Se não houver rota calculada, omite silenciosamente.
4. **Página final — Parceiros da viagem**: lista consolidada de todos os `activity_partners` únicos do roteiro (nome, tipo, contato/link).

**Detalhes técnicos**:
- Imagens carregadas via `fetch → blob → dataURL` antes de montar o PDF (jsPDF exige base64). URLs que falharem são puladas com log.
- Loading toast "Gerando PDF…" enquanto processa; nome do arquivo: `roteiro-{trip.title}-{yyyy-mm-dd}.pdf`.
- Usa `parseISODateLocal`/`formatDateBR` (evita bug de timezone já resolvido).
- Reutiliza cores/tipografia da marca definidas em `styles.css` (terracota + oliva).

## 3. Fora de escopo (para não inflar esta entrega)
- Sugestão automática de foto (Unsplash/Mapbox).
- Fallback da 1ª atividade.
- PDF para o cliente (fica só admin).
- Mescla com PDFs de documentos.

## Arquivos afetados
- **Migration**: adicionar `cover_image_url` em `itinerary_days`.
- `src/hooks/use-my-trip.tsx`: nada (tipo já vem do `Database`).
- `src/routes/minha-viagem.roteiro.tsx`: novo hero por dia.
- `src/routes/admin.viagens.$tripId.tsx`: input de capa no `DayEditor` + botão "Exportar PDF" no header do Roteiro.
- `src/lib/roteiro-pdf.ts` (novo): função `exportRoteiroPDF(tripId)` que lê `trips` + `itinerary_days` + `itinerary_activities` + `activity_partners` + `activity_routes` e monta o documento.
