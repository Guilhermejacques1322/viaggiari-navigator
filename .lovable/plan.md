## Objetivo
1) Trocar o campo "Imagem de capa (URL)" de cada dia por upload de imagem.
2) Corrigir o PDF do roteiro: eliminar a duplicação do "Dia X" (manter só o badge laranja que você aprovou) e remover textos que ficam sobre a imagem.

---

## 1. Upload de imagem na capa do dia

**Backend**
- Criar bucket público `trip-covers` no Storage.
- Policies: leitura pública; INSERT/UPDATE/DELETE apenas para admin autenticado (mesmo padrão dos outros módulos).
- Coluna `itinerary_days.cover_image_url` continua igual — passa a guardar a URL pública do bucket.

**Admin (`src/routes/admin.viagens.$tripId.tsx`, componente `DayEditor`)**
- Substituir o `<Input type="url">` por um bloco de upload:
  - Botão "Enviar imagem" (`<input type="file" accept="image/*">`).
  - Ao selecionar: upload para `trip-covers/{tripId}/{dayId}-{timestamp}.{ext}`, salva `publicUrl` em `cover_image_url` e faz `invalidateQueries`.
  - Prévia da imagem atual + botão "Remover" (apaga arquivo do bucket e zera a coluna).
  - Loading state durante o upload; validar tamanho (≤ 5 MB) e tipo.
- Cliente (`minha-viagem.roteiro.tsx`) não muda — já consome `cover_image_url`.

---

## 2. Ajustes no PDF (`src/lib/roteiro-pdf.ts`)

Analisando o PDF anexado + código atual, os problemas de "dia duplicado" e "texto sobre imagem" vêm de:

- **Capa**: o índice de dias sobrepõe a faixa navy quando há muitos dias, e o subtítulo/hero podem se aproximar do título em roteiros longos.
- **Página do dia**: hoje aparece:
  1. Badge laranja "DIA X" (o que você gostou) + dia da semana ao lado.
  2. Título grande logo abaixo — se o `title` do dia já contém "Dia 1 – …", vira duplicação visual.
  3. Sidebar "ROTEIRO DO DIA" repetindo os nomes das atividades que já aparecem na timeline ao lado.
- **Textos sobre imagem**: em roteiros com muitas atividades, o "DIA X (cont.)" da página de continuação era desenhado sem margem de topo suficiente e podia colidir com a próxima hero.

**Correções propostas**

Capa
- Reduzir levemente a altura do hero (68 → 60 mm) e aumentar respiro entre hero, faixa navy e índice.
- Índice: paginar automaticamente se ultrapassar o espaço disponível, sem sobrepor a tagline.

Página de cada dia
- Manter apenas o **badge laranja "DIA X"** como identificador do dia (você aprovou esse).
- No título do dia, **remover automaticamente** prefixos redundantes como `"Dia 1 - "`, `"DIA 1 -"`, `"Dia 1: "` do `day.title` antes de renderizar, para nunca duplicar.
- Nunca sobrepor texto à imagem: garantir que hero image ocupe faixa própria, e todo o conteúdo (badge, weekday, título, descrição, timeline) fique abaixo com margem mínima de 6 mm.
- Página de continuação: badge "DIA X (cont.)" com margem de topo maior e sem hero (a hero só na primeira página do dia).
- Sidebar: manter só a "DICA VIAGGIARI" (a caixa "ROTEIRO DO DIA" duplicava a timeline principal). Isso libera espaço horizontal para a timeline principal ficar mais legível.
- Weekday ao lado do badge: truncar/quebrar se passar da coluna, para não invadir a sidebar.

Verificação
- Depois de aplicar, gerar um PDF de uma viagem com 5+ dias no admin e conferir visualmente: sem duplicação de "Dia X", nenhum texto sobre imagem, tudo abaixo da hero.

---

## Arquivos alterados
- `src/routes/admin.viagens.$tripId.tsx` — substitui input URL por upload de imagem no `DayEditor`.
- `supabase/migrations/…` — bucket `trip-covers` público + policies.
- `src/lib/roteiro-pdf.ts` — remover duplicação de dia, remover sidebar "ROTEIRO DO DIA", ajustar espaçamentos e sanitizar título.

Nada muda no lado do cliente final (`minha-viagem.*`) — continua lendo `cover_image_url` como URL pública.