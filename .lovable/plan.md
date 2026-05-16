# Viaggiari Travel — Plano de Construção

Projeto grande com 3 sistemas integrados (landing, área do cliente, painel admin). Vou entregar em **fases incrementais**, validando com você ao final de cada uma antes de seguir. Tentar entregar tudo de uma vez resultaria em código superficial e bugs.

## Stack
- TanStack Start (React 19 + Vite) — já configurado no template
- Tailwind CSS v4 + design system com tokens (azul aço #6B9DC2, Montserrat + DM Sans)
- **Lovable Cloud** (Supabase gerenciado) — auth, banco, storage
- Logo da Viaggiari como asset oficial em todo o sistema

## Fase 1 — Fundação (esta entrega)
1. Ativar Lovable Cloud
2. Design system completo em `src/styles.css` (cores oklch, tipografia, tokens)
3. Logo importada como asset
4. Landing page pública completa (`/`):
   - Hero, "Como funciona" (3 serviços), "Roteiros prontos", "Por que a Viaggiari", formulário de lead, footer
   - Totalmente responsiva
5. Esquema do banco no Cloud — todas as tabelas listadas com RLS
6. Tabela `user_roles` com enum (`admin`, `client`) + função `has_role` (padrão seguro)
7. Auth: páginas `/login`, `/signup` (cliente), redirecionamento por role
8. Estrutura de rotas: `/`, `/login`, `/_authenticated/minha-viagem`, `/_admin/admin`

## Fase 2 — Área do cliente (mobile-first)
- Dashboard com contagem regressiva
- Timeline do roteiro (dia a dia, expansível, link Maps, notas, avaliações)
- Documentos e ingressos (visualizador, filtros, alertas)
- Parceiros (cards com links afiliados)
- Pré-roteiro: cliente aprova/recusa atividades propostas
- Bottom nav mobile / sidebar desktop

## Fase 3 — Painel admin (desktop-first) — núcleo
- Dashboard com métricas e feed
- CRM: lista de contatos, perfil, filtros, notas
- Módulo de Viagens: lista + tela de viagem
- **Editor de roteiro** (drag-drop dias/atividades) — peça central
- Upload de documentos (Supabase Storage)
- Toggle visibilidade / modo pré-roteiro
- Botão "Visualizar como cliente"

## Fase 4 — Admin avançado
- Módulo financeiro (parcelas 50/50, visão mensal)
- Gerador de orçamento com PDF
- Biblioteca de destinos reutilizável
- Avaliações agregadas
- Notificações programadas (geração automática + edição)
- Envio de e-mails segmentados

## Detalhes técnicos relevantes
- Roles em tabela separada (`user_roles`) — nunca em `profiles`. Função `has_role()` security definer para evitar recursão de RLS.
- Server functions (`createServerFn`) para lógica protegida, não Edge Functions.
- Storage: bucket `trip-documents` privado, acesso via RLS por viagem.
- E-mails: usaremos Resend via server function (precisará da API key na Fase 4).
- PDFs de orçamento: gerados client-side com `jspdf` ou via server function.
- Push notifications reais ficam fora do escopo inicial — usaremos notificações in-app (banner/lista) que cobrem o caso de uso.

## Algumas decisões que preciso confirmar antes de avançar das fases:

1. **Imagens da landing** — gero hero/destinos com IA (estilo fotográfico premium) ou você prefere placeholders neutros que você troca depois? *(Sugestão: gerar com IA)*
2. **E-mails transacionais** (boas-vindas do cliente, notificações) — ok integrar Resend na Fase 2/4? Vai precisar de uma API key gratuita do resend.com.
3. **Idioma da UI** — tudo em português brasileiro, certo?
4. **Pagamentos** — o financeiro é apenas registro manual (Nani marca pago/pendente), sem integração com Stripe/Mercado Pago, correto?

---

Posso começar pela **Fase 1** assim que você aprovar. Ao final dela você terá: landing page navegável, login funcional, banco pronto e as rotas estruturadas. Aí seguimos para a área do cliente.