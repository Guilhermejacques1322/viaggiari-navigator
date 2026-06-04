# Rebranding Viaggiari

Aplicação da nova identidade visual em todo o app — admin e cliente — substituindo a marca antiga "Viaggiari Travel" pela nova "Viaggiari".

## 1. Nova identidade visual

**Paleta extraída dos logos:**
- Verde-oliva (fundo institucional): `#7A7A5C` aprox.
- Laranja terracota (acento/primária da marca): `#D17A47` aprox.
- Creme (texto claro / superfícies sobre escuro): `#F0E6D2`
- Tons neutros escuros mantidos para texto

**Nova primária do sistema:** laranja terracota (substitui o steel-blue atual). O verde-oliva passa a ser usado em sidebar admin, hero e superfícies "ink".

## 2. Assets a substituir/criar

Upload via `lovable-assets` a partir de `/mnt/user-uploads/`:
- `viaggiari-logo-full.png` (v2 — fundo oliva, plane laranja) → wordmark padrão escuro
- `viaggiari-logo-full-orange.png` (v1 — fundo laranja, plane oliva) → variante alternativa
- `viaggiari-monogram-vg.png` (T.png — VG + avião) → ícone do app (PWA / favicon / apple-touch-icon)

Gerar a partir do monograma:
- `/public/icon-512.png` (PWA standalone, mantém o nome do arquivo para não quebrar manifest)
- `/public/icon-192.png`
- `/public/favicon.ico` substituído

## 3. Arquivos a editar

**Design system:**
- `src/styles.css` — atualizar tokens `--primary` (laranja), `--primary-soft`, `--sidebar` (oliva escuro), `--ink` (oliva), `--ring`, `--chart-*`. Manter contraste light/dark.

**Logo:**
- `src/components/brand/logo.tsx` — trocar `viaggiari-logo.png` pelo novo asset wordmark; remover "Viaggiari Travel" do wordmark — só "Viaggiari".

**Identidade textual ("Travel" → remover):**
- `index.html` (title, meta)
- `src/routes/__root.tsx` (todos meta tags, og, twitter, apple-mobile-web-app-title já é "Viaggiari" ✓, mas title e descriptions usam "Viaggiari Travel")
- `public/manifest.webmanifest` — `name`, `short_name`, `description`
- `src/routes/index.tsx` (landing — headlines/copy)
- `src/routes/login.tsx`, `src/routes/interesse.tsx`
- `src/routes/orcamento.$token.tsx` (PDF/template)
- `src/lib/quote-pdf.ts` (header do PDF)
- `src/routes/sitemap[.]xml.ts` se houver título
- Qualquer ocorrência de "Viaggiari Travel" em alt text, footers, emails, etc. — busca global por `Viaggiari Travel` e `viaggiari travel`.

**PWA / mobile:**
- `public/manifest.webmanifest` — `theme_color` e `background_color` atualizados para a nova paleta (oliva escuro `#3F3F2E` ou similar), ícone monograma VG
- `public/sw.js` — verificar se referencia ícones antigos

## 4. Aplicação visual nas telas

Não vou redesenhar layouts — apenas trocar tokens e logo, o que propaga automaticamente para:
- Shell admin (`src/routes/admin.tsx`) — sidebar passa a oliva
- Shell cliente (`src/routes/minha-viagem.tsx`) — header + bottom nav usam nova primária laranja
- Botões, badges, charts, links — herdam via tokens
- Landing (`index.tsx`), login, orçamento público — herdam

## 5. QA

Após mudanças, abrir preview e verificar:
- Landing `/`
- Login `/login`
- Cliente `/minha-viagem` (e sub-rotas)
- Admin `/admin` (dashboard, viagens, marketing, etc.)
- Orçamento público
- Manifest no DevTools (ícone PWA correto)
- Busca residual por "Travel" no nome da marca

## Detalhes técnicos

- Cores em `oklch()` conforme convenção do `styles.css`. Aproximações:
  - `--primary: oklch(0.68 0.13 45)` (terracota)
  - `--sidebar: oklch(0.32 0.02 95)` (oliva escuro)
  - `--ink: oklch(0.42 0.025 95)` (oliva)
- Logo component aceita prop `withWordmark` — wordmark agora é apenas "Viaggiari" (uppercase tracking mantém no `.brand-title`).
- Assets via `lovable-assets` CLI, importados como JSON pointer.
- Não tocar em lógica de negócio, banco, auth, server functions.
