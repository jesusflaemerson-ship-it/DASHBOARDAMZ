-- ============================================================
-- SCHEMA SUPABASE — Painel Operacional Marketplace
-- Rode isso no SQL Editor do seu projeto Supabase (supabase.com)
-- ============================================================

create extension if not exists "uuid-ossp";

-- Perfis de usuário (ligado ao auth.users do Supabase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  created_at timestamptz default now()
);

-- Pedidos (equivalente à aba "Controle Geral" da planilha)
create table orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data date not null,
  pedido text not null,
  produto text not null,
  venda_bruta numeric(12,2) default 0,
  custo numeric(12,2) default 0,
  taxas_amazon numeric(12,2) default 0,
  status text check (status in ('Pago','Pendente','Problema','Cancelado')) default 'Pendente',
  conta text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Colunas calculadas como VIEW (equivalente às fórmulas da planilha)
create view orders_calc as
select *,
  (venda_bruta - custo) as lucro_caixa,
  (venda_bruta - taxas_amazon) as amazon_vai_pagar,
  (venda_bruta - (custo + taxas_amazon)) as lucro_final
from orders;

-- Despesas (Painel Financeiro)
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data date not null,
  descricao text,
  categoria text,
  valor numeric(12,2) default 0,
  created_at timestamptz default now()
);

-- Reembolsos / problemas
create table refunds (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  order_id uuid references orders(id) on delete set null,
  data date not null,
  tipo text check (tipo in ('Envio errado','Reembolso parcial','Prejuízo operacional','Cliente suspeito','Chargeback')),
  valor numeric(12,2) default 0,
  observacoes text,
  created_at timestamptz default now()
);

-- Estoque
create table stock (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  produto text not null,
  quantidade integer default 0,
  custo_medio numeric(12,2) default 0,
  fornecedor text,
  estoque_minimo integer default 5,
  created_at timestamptz default now()
);

-- Movimentação de estoque (histórico)
create table stock_movements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  stock_id uuid references stock(id) on delete cascade,
  tipo text check (tipo in ('entrada','saida')),
  quantidade integer,
  motivo text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (cada usuário só vê seus próprios dados)
-- ============================================================
alter table orders enable row level security;
alter table expenses enable row level security;
alter table refunds enable row level security;
alter table stock enable row level security;
alter table stock_movements enable row level security;

create policy "usuarios veem seus proprios pedidos" on orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "usuarios veem suas proprias despesas" on expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "usuarios veem seus proprios reembolsos" on refunds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "usuarios veem seu proprio estoque" on stock
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "usuarios veem suas proprias movimentacoes" on stock_movements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Índices úteis
create index idx_orders_user_data on orders(user_id, data desc);
create index idx_orders_status on orders(user_id, status);
create index idx_expenses_user_data on expenses(user_id, data desc);
