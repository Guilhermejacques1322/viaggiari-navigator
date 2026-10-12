# Arrastar dias inteiros + nova logo no app

## 1. Arrastar e reordenar dias do roteiro (admin)
- Cada cartão de dia ganha uma alça própria no cabeçalho, ao lado do título.
- Arrastar um dia para cima ou para baixo muda a ordem dele em relação aos outros dias.
- Ao soltar, o roteiro inteiro é renumerado: os números (Dia 1, 2, 3…) e as datas ficam na mesma sequência de antes, e o conteúdo de cada dia (título, capa, atividades, documentos) vai junto com ele para a nova posição.
  - Exemplo: se o Dia 2 (12/10) for trocado com o Dia 3 (13/10), o conteúdo que era do Dia 3 vira o Dia 2, em 12/10, e o antigo Dia 2 vira o Dia 3, em 13/10.
- Enquanto você arrasta, aparece uma prévia compacta do dia (só número e título). Os outros dias ficam recolhidos para facilitar.
- O arrasto de atividades que já existe continua funcionando igual, inclusive mover atividades entre dias.
- Depois de reordenar, a tela se atualiza e aparece uma confirmação. Se der erro, a ordem volta a ser a anterior.
- Rotas entre atividades de dias diferentes não são afetadas, porque são calculadas dentro de cada dia.

## 2. Nova logo em todo o app
- A logo enviada (laranja com o avião verde) passa a aparecer na tela inicial (topo e rodapé), no login, no menu do admin (computador e celular), na área do viajante, na página de orçamento e na página de interesse.
- É a mesma arte do PDF da viagem. O PDF não muda.
- O ícone "VG" do app instalado no celular continua o mesmo.
- Os tamanhos são ajustados para a logo nova, que é mais larga e tem o subtítulo "agência de viagens", ficar legível no celular.

## Detalhes técnicos
- Lista de dias: um `SortableContext` de dias dentro do `DndContext` que já existe. Os ids do arrasto recebem o prefixo `day:` para distinguir de atividades em `handleDragStart`/`handleDragEnd`.
- Persistência: as atribuições de (day_number, date) ordenadas são mantidas por posição e reaplicadas na nova ordem. Para não colidir com uma possível unicidade de day_number, primeiro todos os dias recebem números temporários (+1000) e depois os definitivos. A atualização na tela é otimista via queryClient, com rollback se der erro.
- Logo: a imagem enviada vira um asset no CDN (`viaggiari-logo-brand.png.asset.json`), e a variante com nome (`withWordmark`) do `src/components/brand/logo.tsx` passa a usá-la. Os tamanhos nas páginas são ajustados. Não há mudança no banco de dados.
