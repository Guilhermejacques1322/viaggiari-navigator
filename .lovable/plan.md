# Corrigir perda de estado ao voltar de outra aba

## Causa raiz (resumo)

Ao trocar de aba, o Supabase renova o token e emite `TOKEN_REFRESHED`. O listener em `use-auth.tsx` reage a **todos** os eventos chamando `setLoading(true)` + `loadRoles()` de novo. Os shells `minha-viagem.tsx` e `admin.tsx`, ao verem `loading=true`, retornam um placeholder "Carregando…" no lugar do `<Outlet/>`, **desmontando toda a subárvore** — perdendo scroll, accordion aberto, dialogs, formulários, etc. Quando o role recarrega, o `<Outlet/>` remonta do zero.

## Mudanças

### 1. `src/hooks/use-auth.tsx` — listener inteligente

- Só tratar `loading` no boot inicial (uma vez), nunca mais.
- No `onAuthStateChange`, sincronizar `session`/`user`, mas **não tocar em `loading`**.
- Só recarregar `roles` quando o `user.id` realmente mudar (login/logout/troca de usuário). Eventos `TOKEN_REFRESHED` / `USER_UPDATED` com o mesmo userId não devem disparar `loadRoles`.
- Limpar `roles` apenas em `SIGNED_OUT` (ou quando `newSession?.user` for nulo).

Efeito: refresh de token em background vira no-op para a UI.

### 2. `src/routes/minha-viagem.tsx` — não desmontar o Outlet

- Manter o redirect para `/login` quando `!user && !loading`.
- Remover o `return <div>Carregando…</div>` que substitui a árvore inteira. Renderizar sempre o shell + `<MyTripProvider>` + `<Outlet/>`.
- Mostrar um indicador discreto (ou nada) apenas no boot inicial quando `loading && !user`. Uma vez que `user` exista, nunca mais ocultar o Outlet por causa de `loading`.

### 3. `src/routes/admin.tsx` — mesma correção

- Mesma lógica: redirecionar se `!loading && !user`, redirecionar se `!loading && user && !isAdmin`.
- Não substituir a árvore por "Carregando…" depois do primeiro render com usuário válido. Manter `<Outlet/>` montado.

### 4. Verificação

- Build automático.
- Smoke test mental: login → abrir roteiro → expandir um dia → trocar de aba 30s → voltar → o dia continua expandido, scroll preservado, nenhuma navegação para "/" ou "/minha-viagem".

## Fora de escopo

- Migrar guards para `beforeLoad` no `_authenticated` (refator maior; fica como follow-up).
- Mudar o `NotFoundComponent` do root.
- Mexer em queries do React Query (já estão com `refetchOnWindowFocus: false`).
