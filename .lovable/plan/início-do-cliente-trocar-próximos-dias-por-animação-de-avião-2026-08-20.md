# Início do cliente: trocar "Próximos dias" por animação de avião

## O que muda

Na tela inicial de `/minha-viagem` (a primeira coisa que o viajante vê ao logar):

1. Remover a seção "Próximos dias" com os 3 cards de dias do roteiro.
2. No lugar dela, uma animação leve e contínua: um avião que percorre uma rota tracejada de um ponto de origem até um ponto de destino, e recomeça em loop.

## Como será a animação

- Faixa horizontal discreta dentro de um card, com dois pontos (origem e destino) ligados por uma linha tracejada.
- O aviãozinho desliza da esquerda para a direita ao longo da linha, com leve subida/descida, e reinicia suavemente (loop de ~4s).
- A trilha percorrida se preenche na cor primária (terracota) enquanto o avião avança.
- Sem imagens novas: só ícone `Plane` do lucide + CSS.
- Respeita `prefers-reduced-motion`: com movimento reduzido, o avião fica parado no meio da rota.

## Detalhes técnicos

- `src/routes/minha-viagem.index.tsx`: remover o bloco `days.length > 0 && (...)` de "Próximos dias" e renderizar no lugar um novo componente.
- Novo componente `src/components/flight-animation.tsx` (apresentacional, sem dados).
- Keyframes adicionados em `src/styles.css` (`fly-across`, `trail-grow`), usando tokens semânticos existentes — sem cores hardcoded.
- Os cards de estatística (Dias de roteiro, Documentos, etc.) e o checklist permanecem como estão; a navegação para o roteiro continua pela barra inferior/lateral.

O avião precisa estar em loop, reiniciando para nunca perder ali a animação. 

&nbsp;