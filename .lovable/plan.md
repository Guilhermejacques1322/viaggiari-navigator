## Melhorias no roteiro e nova área de Parceiros

### 1. Imagens e curiosidades nas atividades

Adicionar dois campos novos em `itinerary_activities`:
- `image_url` (text) — URL pública da imagem do local
- `curiosities` (text) — texto livre "Curiosidades e Recomendações"

**Admin** (`admin.viagens.$tripId.tsx` — formulário de atividade):
- Input "URL da imagem" + preview pequeno ao colar
- Textarea "Curiosidades e Recomendações"

**Cliente** (`minha-viagem.roteiro.tsx`):
- Imagem renderizada no topo do card da atividade (aspect 16/9, lazy, fallback se vazio)
- Bloco "Curiosidades" expandível abaixo da descrição

**Pré-roteiro** (`minha-viagem.preroteiro.tsx`):
- Quando o cliente favorita ("want"), a imagem aparece junto no card
- Curiosidades também visíveis (ajudam o cliente a decidir)

### 2. Parceiros operacionais por atividade (item 4)

Nova tabela `activity_partners` (vinculada a `itinerary_activities`):
- `activity_id`, `name`, `role` (guia, tradutor, motorista, agência...), `cost`, `currency`, `included_in_package` (bool), `notes`

**Admin**: dentro do editor da atividade, seção "Parceiros operacionais" com lista + botão adicionar.

**Cliente** (no card da atividade do roteiro): badge discreto tipo
`👤 Guia: João (incluso)` ou `🗣 Tradutor: +R$ 200`.

### 3. Vitrine global de parceiros (item 5) — nova aba

Nova tabela `partner_products`:
- `store_name`, `product_name`, `purchase_url`, `image_url`, `description` (opcional), `category` (opcional: mala, eletrônico, seguro, etc.), `display_order`, `active` (bool)
- RLS: admin gerencia tudo; qualquer cliente autenticado vê os ativos

**Admin** — nova rota `/admin/parceiros`:
- Lista em cards (foto, loja, produto, link)
- Botão "Adicionar parceiro" → modal com upload de URL da imagem, nome da loja, nome do produto, link, categoria
- Editar/desativar/excluir inline
- Link no menu lateral do admin

**Cliente** — nova rota `/minha-viagem/parceiros`:
- Grid responsivo de cards (imagem em destaque, nome do produto, loja em texto pequeno, badge de categoria, botão "Ver na loja →" abrindo `purchase_url` em nova aba)
- Filtro por categoria (chips no topo) se houver mais de uma
- Empty state amigável se ainda não há parceiros
- Adicionar item "Parceiros" na navegação de `minha-viagem.tsx`

### Detalhes técnicos

**Migração SQL** (uma única migration):
```sql
ALTER TABLE itinerary_activities
  ADD COLUMN image_url text,
  ADD COLUMN curiosities text;

CREATE TABLE activity_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES itinerary_activities(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  cost numeric DEFAULT 0,
  currency text DEFAULT 'BRL',
  included_in_package boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: admin all; cliente SELECT via join trips.visible_to_client + contacts.user_id (mesmo padrão das atividades)

CREATE TABLE partner_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL,
  product_name text NOT NULL,
  purchase_url text NOT NULL,
  image_url text,
  description text,
  category text,
  display_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: admin ALL; authenticated SELECT WHERE active = true
```

**Cliente — hook `use-my-trip`**: incluir `activity_partners` no fetch agrupado por atividade.

**Validação URLs**: aceitar qualquer https; usar `<img loading="lazy" onError={hide}>` para falhas.

### Fora de escopo
- Upload real de imagens para storage (item futuro)
- CRM completo de parceiros por país/cidade (a base por atividade já cobre o uso operacional pedido)
- Vinculação dos `partner_products` da vitrine com atividades específicas (a vitrine é global)
