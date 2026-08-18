# Corrigir layout de desktop no app Android

## O que está acontecendo

Na foto, o app instalado no Android abre a área do cliente com a **barra lateral de desktop** (menu à esquerda) em vez da navegação inferior do celular, com textos minúsculos.

O que já foi verificado: a tag de viewport (`width=device-width, initial-scale=1`) está presente no HTML entregue, e o service worker do app não guarda páginas em cache. Ou seja, o código está correto — o Android está informando ao app uma largura de tela "de computador" (isso acontece quando o atalho foi criado a partir de uma aba com "Site para computador" ativado, ou em aparelhos/modos que reportam largura grande).

Como não dá para depender do usuário desmarcar essa opção, a correção é fazer o layout não depender só da largura.

## Correção proposta

1. **Layout por tipo de aparelho, não só por largura**: criar uma regra "desktop" que exige largura grande **e** mouse (ponteiro fino). Qualquer aparelho com tela sensível ao toque passa a receber sempre a interface mobile: barra inferior de navegação, sem barra lateral, tipografia e espaçamentos de celular.
2. **Aplicar essa regra na área do cliente** (`/minha-viagem` e telas internas): cabeçalho, barra lateral, barra inferior e larguras/paddings de conteúdo.
3. **Ajustes do app instalado**: adicionar `viewport-fit=cover` (para respeitar a barra de status/gestos do Android) e `display_override` no manifesto, para o app abrir sempre em modo aplicativo.
4. **Verificação**: simular no navegador uma janela larga com ponteiro por toque e confirmar que a interface mobile aparece; conferir também que no computador nada muda.

## Detalhes técnicos

- Adicionar em `src/styles.css` um `@custom-variant desktop (@media (min-width: 768px) and (pointer: fine))`.
- Em `src/routes/minha-viagem.tsx` (shell do cliente) trocar os prefixos `md:` estruturais por `desktop:` (sidebar `hidden desktop:flex`, bottom nav `desktop:hidden`, `desktop:pl-64`, paddings).
- Revisar as telas filhas (`minha-viagem.*.tsx`) onde `md:` altera estrutura (grids em colunas, larguras fixas) e aplicar a mesma variante.
- `src/routes/__root.tsx`: `viewport` → `width=device-width, initial-scale=1, viewport-fit=cover`.
- `public/manifest.webmanifest`: `"display_override": ["standalone", "minimal-ui"]`.
- Nenhuma mudança de dados ou de regras de negócio.
