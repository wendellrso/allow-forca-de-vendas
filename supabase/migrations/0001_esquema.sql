-- 0001 — Esquema do Allow, Fase 1.
-- Reversão: drop schema app cascade; (destrutiva; apenas em ambiente descartável)

create extension if not exists pgcrypto;

create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Funções utilitárias
-- ---------------------------------------------------------------------------

create or replace function app.definir_atualizado_em() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function app.uf_valida(p_uf text) returns boolean
language sql
immutable
as $$
  select p_uf = any (array[
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
    'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ]);
$$;

-- ---------------------------------------------------------------------------
-- Organização e membros
-- ---------------------------------------------------------------------------

create table app.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  created_at timestamptz not null default now()
);

create table app.members (
  user_id uuid not null references auth.users (id),
  organization_id uuid not null references app.organizations (id),
  role text not null check (role in ('administrador', 'vendedor')),
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------

create table app.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  name text not null check (length(btrim(name)) between 2 and 120),
  phone text check (phone ~ '^[0-9]{10,11}$'),
  cpf_cnpj text check (cpf_cnpj ~ '^[0-9]{11}$' or cpf_cnpj ~ '^[0-9]{14}$'),
  city text not null check (length(btrim(city)) between 2 and 80),
  state char(2) not null check (app.uf_valida(state)),
  address text check (length(address) <= 200),
  notes text check (length(notes) <= 500),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- O catálogo encontra o cliente pelo telefone; dois cadastros ativos com o
-- mesmo número seriam ambiguidade, não conveniência.
create unique index customers_telefone_unico
  on app.customers (organization_id, phone)
  where phone is not null and archived_at is null;

create index customers_por_cidade on app.customers (organization_id, state, city);

create trigger customers_atualizado_em
  before update on app.customers
  for each row execute function app.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- Produtos e estoque
-- ---------------------------------------------------------------------------

create table app.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  name text not null check (length(btrim(name)) between 2 and 120),
  description text check (length(description) <= 500),
  unit text not null default 'un' check (length(btrim(unit)) between 1 and 10),
  price_cents integer not null check (price_cents >= 0),
  -- Campos fiscais mínimos, guardados desde a Fase 1 para a Fase 3 não
  -- exigir recadastro (RFC-005, risco 1).
  ncm text check (ncm ~ '^[0-9]{8}$'),
  origin smallint check (origin between 0 and 8),
  -- Invariante: estoque nunca fica negativo. O banco garante, não a tela.
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  min_stock integer check (min_stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_por_nome on app.products (organization_id, name);

create trigger products_atualizado_em
  before update on app.products
  for each row execute function app.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- Vendas
-- ---------------------------------------------------------------------------

create table app.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  customer_id uuid references app.customers (id),
  -- Retrato do cliente no momento da venda: o histórico não muda quando o
  -- cadastro muda.
  customer_name text not null check (length(btrim(customer_name)) between 2 and 120),
  customer_phone text check (customer_phone ~ '^[0-9]{10,11}$'),
  city text not null check (length(btrim(city)) between 2 and 80),
  state char(2) not null check (app.uf_valida(state)),
  origin text not null check (origin in ('catalogo', 'manual')),
  status text not null default 'aguardando_confirmacao'
    check (status in ('aguardando_confirmacao', 'confirmada', 'entregue', 'cancelada')),
  payment_terms text check (payment_terms in ('a_vista', 'a_prazo')),
  due_date date,
  total_cents integer not null default 0 check (total_cents >= 0),
  note text check (length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  delivered_at timestamptz,
  canceled_at timestamptz
);

create index sales_por_status on app.sales (organization_id, status, created_at desc);
create index sales_por_cidade on app.sales (organization_id, state, city);

create trigger sales_atualizado_em
  before update on app.sales
  for each row execute function app.definir_atualizado_em();

-- Invariante: a máquina de estados da venda vive no banco. Uma sessão que
-- tente atalhar a transição é recusada aqui, não só na aplicação.
create or replace function app.guarda_transicao_venda() returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    if old.status in ('entregue', 'cancelada')
      and (new.note is distinct from old.note
        or new.total_cents is distinct from old.total_cents
        or new.customer_id is distinct from old.customer_id) then
      raise exception 'Venda encerrada não pode ser alterada.';
    end if;
    if old.status <> 'aguardando_confirmacao'
      and new.total_cents is distinct from old.total_cents then
      raise exception 'O total não muda depois da confirmação.';
    end if;
    return new;
  end if;

  if not (
    (old.status = 'aguardando_confirmacao' and new.status in ('confirmada', 'cancelada'))
    or (old.status = 'confirmada' and new.status in ('entregue', 'cancelada'))
  ) then
    raise exception 'Transição de venda inválida: % para %.', old.status, new.status;
  end if;

  if new.status = 'confirmada' then
    if new.payment_terms is null then
      raise exception 'A confirmação exige a condição de pagamento.';
    end if;
    if new.payment_terms = 'a_prazo' and new.due_date is null then
      raise exception 'Venda a prazo exige data de vencimento.';
    end if;
    new.confirmed_at := now();
  elsif new.status = 'entregue' then
    new.delivered_at := now();
  elsif new.status = 'cancelada' then
    new.canceled_at := now();
  end if;

  return new;
end;
$$;

create trigger sales_guarda_transicao
  before update on app.sales
  for each row execute function app.guarda_transicao_venda();

-- ---------------------------------------------------------------------------
-- Itens da venda
-- ---------------------------------------------------------------------------

create table app.sale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  sale_id uuid not null references app.sales (id),
  product_id uuid not null references app.products (id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  subtotal_cents integer not null,
  created_at timestamptz not null default now(),
  -- Invariante: o subtotal é aritmética, não opinião.
  constraint sale_items_subtotal_coerente check (subtotal_cents = quantity * unit_price_cents)
);

create index sale_items_por_venda on app.sale_items (sale_id);

-- Invariante: item só entra enquanto a venda aguarda confirmação, e sempre na
-- mesma Organização da venda.
create or replace function app.guarda_item_de_venda() returns trigger
language plpgsql
as $$
declare
  v_venda app.sales%rowtype;
begin
  select * into v_venda from app.sales where id = new.sale_id;
  if not found then
    raise exception 'Venda inexistente para o item.';
  end if;
  if v_venda.organization_id <> new.organization_id then
    raise exception 'Item e venda pertencem a Organizações diferentes.';
  end if;
  if v_venda.status <> 'aguardando_confirmacao' then
    raise exception 'Itens não mudam depois da confirmação da venda.';
  end if;
  return new;
end;
$$;

create trigger sale_items_guarda
  before insert on app.sale_items
  for each row execute function app.guarda_item_de_venda();

-- ---------------------------------------------------------------------------
-- Movimentos de estoque
-- ---------------------------------------------------------------------------

create table app.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  product_id uuid not null references app.products (id),
  delta integer not null check (delta <> 0),
  kind text not null check (kind in ('entrada', 'saida', 'ajuste')),
  reason text check (length(reason) <= 200),
  sale_id uuid references app.sales (id),
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint stock_movements_sinal_coerente check (
    (kind = 'entrada' and delta > 0)
    or (kind = 'saida' and delta < 0)
    or kind = 'ajuste'
  )
);

create index stock_movements_por_produto on app.stock_movements (product_id, created_at desc);

-- O saldo do produto é consequência dos movimentos. A restrição
-- stock_quantity >= 0 transforma saída sem saldo em erro do banco.
create or replace function app.aplicar_movimento_de_estoque() returns trigger
language plpgsql
as $$
declare
  v_linhas integer;
begin
  update app.products
  set stock_quantity = stock_quantity + new.delta
  where id = new.product_id
    and organization_id = new.organization_id;

  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'Produto inexistente ou de outra Organização.';
  end if;
  return new;
end;
$$;

create trigger stock_movements_aplicar
  after insert on app.stock_movements
  for each row execute function app.aplicar_movimento_de_estoque();

-- Invariante: o histórico de estoque é imutável.
create or replace function app.recusar_alteracao() returns trigger
language plpgsql
as $$
begin
  raise exception 'Este registro é imutável.';
end;
$$;

create trigger stock_movements_imutaveis
  before update or delete on app.stock_movements
  for each row execute function app.recusar_alteracao();

-- ---------------------------------------------------------------------------
-- Contas a receber
-- ---------------------------------------------------------------------------

create table app.receivables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  sale_id uuid references app.sales (id),
  customer_id uuid references app.customers (id),
  description text not null check (length(btrim(description)) between 2 and 200),
  amount_cents integer not null check (amount_cents > 0),
  received_cents integer not null default 0 check (received_cents >= 0),
  due_date date,
  status text not null default 'aberto'
    check (status in ('aberto', 'parcial', 'recebido', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Invariante: a situação é consequência dos valores, nunca contradição.
  constraint receivables_situacao_coerente check (
    (status = 'aberto' and received_cents = 0)
    or (status = 'parcial' and received_cents > 0 and received_cents < amount_cents)
    or (status = 'recebido' and received_cents = amount_cents)
    or (status = 'cancelado' and received_cents = 0)
  )
);

create index receivables_por_status on app.receivables (organization_id, status, due_date);

create trigger receivables_atualizado_em
  before update on app.receivables
  for each row execute function app.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- Despesas (contas a pagar da viagem)
-- ---------------------------------------------------------------------------

create table app.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  category text not null
    check (category in ('hospedagem', 'alimentacao', 'combustivel', 'outros')),
  description text check (length(description) <= 200),
  amount_cents integer not null check (amount_cents > 0),
  expense_date date not null default current_date,
  city text check (length(btrim(city)) between 2 and 80),
  state char(2) check (state is null or app.uf_valida(state)),
  status text not null default 'pago' check (status in ('a_pagar', 'pago')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_por_data on app.expenses (organization_id, expense_date desc);

create trigger expenses_atualizado_em
  before update on app.expenses
  for each row execute function app.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------

create table app.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  actor uuid,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_por_data on app.audit_logs (organization_id, created_at desc);

create trigger audit_logs_imutaveis
  before update or delete on app.audit_logs
  for each row execute function app.recusar_alteracao();
