# Corrigir a instalação do app no Android

## O que está acontecendo

Verifiquei o projeto e encontrei dois motivos que impedem o Chrome no Android de oferecer "Instalar aplicativo":

1. **O service worker nunca é registrado.** O arquivo `public/sw.js` existe, mas o único código que o registrava está no componente de notificações, que foi retirado da tela do cliente. Sem service worker ativo, o Chrome no Android não considera o site instalável (só oferece "Adicionar à tela inicial" simples, sem virar app).
2. **O service worker não tem um handler de `fetch`.** Mesmo se fosse registrado, o Chrome exige que ele responda a requisições de navegação para liberar a instalação.

Além disso, hoje não existe nenhum botão de "Instalar app" no site — o usuário depende do menu do navegador.

## Correção proposta

1. **Registrar o service worker automaticamente** em toda visita, a partir de um único módulo com proteção: não registra no preview do Lovable, em iframe nem em desenvolvimento (para não gerar cache velho durante a edição), e aceita `?sw=off` para desinstalar.
2. **Adicionar ao `sw.js` um handler de navegação "rede primeiro"** — busca sempre a versão nova na internet e só usa o fallback quando está offline. Isso satisfaz o requisito de instalação sem risco de tela branca por conteúdo velho. As partes de push/notificação continuam intactas.
3. **Criar um botão "Instalar aplicativo"** que aparece só quando o Android/Chrome sinaliza que a instalação é possível (evento `beforeinstallprompt`), na tela inicial e na área do cliente. Em iPhone, mostrar a instrução de "Compartilhar → Adicionar à Tela de Início", já que o iOS não tem prompt.
4. **Ajustar o manifesto**: separar um ícone `maskable` (exigido pelo Android para o ícone não ficar cortado) e apontar `start_url` para uma rota pública que redireciona ao destino certo, evitando abrir o app já numa tela de login travada.
5. **Verificar** com o navegador headless: conferir que o manifesto carrega, que o service worker fica ativo e que os critérios de instalação são atendidos na build de produção.

## Detalhes técnicos

- Novo `src/lib/pwa.ts` com `registerServiceWorker()` guardado por `import.meta.env.PROD`, checagem de iframe, hostnames de preview (`id-preview--`, `preview--`, `*.lovableproject.com`, `*.lovableproject-dev.com`, `*.beta.lovable.dev`) e `?sw=off` (nesses casos, faz `unregister`). Chamado uma vez em `src/routes/__root.tsx`.
- `public/sw.js`: acrescentar `fetch` com estratégia NetworkFirst apenas para `request.mode === "navigate"`, cache próprio versionado (`viaggiari-shell-v1`), sem cachear `/~oauth` nem chamadas de API.
- Novo `src/components/install-app-button.tsx` capturando `beforeinstallprompt`/`appinstalled`, com detecção de iOS e de modo `standalone`.
- `public/manifest.webmanifest`: ícone 512 com `purpose: "any"` + entrada extra `purpose: "maskable"`; manter nome, cores e `display_override`.
- Observação: a instalação só funciona no site publicado (HTTPS), não dentro do preview do editor.
