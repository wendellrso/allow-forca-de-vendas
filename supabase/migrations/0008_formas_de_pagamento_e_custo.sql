-- 0008 — Formas de pagamento cadastráveis e enriquecimento do produto.
-- A condição (à vista/a prazo) continua regendo o contas a receber; a forma
-- (Pix, cartão, dinheiro…) é informação da venda, cadastrada pela própria
-- Organização como as categorias de despesa.
-- Reversão: drop das colunas novas, da tabela payment_methods e recriação
-- das funções na assinatura anterior.

create table app.payment_methods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  name text not null check (length(btrim(name)) between 2 and 40),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index payment_methods_nome_unico
  on app.payment_methods (organization_id, lower(btrim(name)))
  where archived_at is null;

insert into app.payment_methods (organization_id, name)
select o.id, semente.nome
from app.organizations o
cross join (
  values ('Dinheiro'), ('Pix'), ('Cartão de débito'), ('Cartão de crédito'), ('Boleto')
) as semente (nome);

alter table app.sales
  add column payment_method_id uuid references app.payment_methods (id);

create or replace function app.guarda_forma_de_pagamento() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_organizacao uuid;
begin
  if new.payment_method_id is null then
    return new;
  end if;
  select organization_id into v_organizacao
  from app.payment_methods
  where id = new.payment_method_id;
  if v_organizacao is null or v_organizacao <> new.organization_id then
    raise exception 'Forma de pagamento de outra Organização.';
  end if;
  return new;
end;
$$;

create trigger sales_guarda_forma
  before insert or update of payment_method_id on app.sales
  for each row execute function app.guarda_forma_de_pagamento();

-- Produto: custo para enxergar margem, e código de barras para o futuro.
alter table app.products
  add column cost_cents integer check (cost_cents is null or cost_cents >= 0),
  add column barcode text check (barcode is null or barcode ~ '^[0-9]{8,14}$');

-- Acesso da tabela nova: mesmo padrão das demais.
grant select, insert, update on app.payment_methods to authenticated;
grant all on app.payment_methods to service_role;

alter table app.payment_methods enable row level security;
alter table app.payment_methods force row level security;

create policy payment_methods_select on app.payment_methods
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy payment_methods_insert on app.payment_methods
  for insert to authenticated
  with check (app.eh_membro(organization_id));

create policy payment_methods_update on app.payment_methods
  for update to authenticated
  using (app.eh_membro(organization_id))
  with check (app.eh_membro(organization_id));

-- As funções de venda passam a receber a forma de pagamento.
drop function app.criar_venda_manual(uuid, uuid, jsonb, text, date, text);
drop function app.confirmar_venda(uuid, text, date);

create function app.confirmar_venda(
  p_venda uuid,
  p_condicao text,
  p_vencimento date default null,
  p_forma uuid default null
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_venda app.sales%rowtype;
  v_item record;
  v_saldo integer;
begin
  select * into v_venda from app.sales where id = p_venda for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;
  if v_venda.status <> 'aguardando_confirmacao' then
    raise exception 'Só uma venda aguardando confirmação pode ser confirmada.';
  end if;
  if p_condicao not in ('a_vista', 'a_prazo') then
    raise exception 'Condição de pagamento inválida.';
  end if;
  if not exists (select 1 from app.sale_items where sale_id = p_venda) then
    raise exception 'A venda não tem itens.';
  end if;

  for v_item in
    select product_id, product_name, quantity
    from app.sale_items
    where sale_id = p_venda
  loop
    select stock_quantity into v_saldo
    from app.products
    where id = v_item.product_id
    for update;

    if v_saldo is null or v_saldo < v_item.quantity then
      raise exception 'Estoque insuficiente de %.', v_item.product_name;
    end if;

    insert into app.stock_movements (organization_id, product_id, delta, kind, reason, sale_id, created_by)
    values (
      v_venda.organization_id,
      v_item.product_id,
      -v_item.quantity,
      'saida',
      'Venda confirmada',
      p_venda,
      auth.uid()
    );
  end loop;

  update app.sales
  set status = 'confirmada',
      payment_terms = p_condicao,
      due_date = case when p_condicao = 'a_prazo' then p_vencimento else null end,
      payment_method_id = coalesce(p_forma, payment_method_id)
  where id = p_venda;

  if p_condicao = 'a_vista' then
    insert into app.receivables
      (organization_id, sale_id, customer_id, description, amount_cents, received_cents, status)
    values
      (v_venda.organization_id, p_venda, v_venda.customer_id,
       'Venda à vista — ' || v_venda.customer_name, v_venda.total_cents, v_venda.total_cents, 'recebido');
  else
    insert into app.receivables
      (organization_id, sale_id, customer_id, description, amount_cents, due_date, status)
    values
      (v_venda.organization_id, p_venda, v_venda.customer_id,
       'Venda a prazo — ' || v_venda.customer_name, v_venda.total_cents, p_vencimento, 'aberto');
  end if;

  perform app.registrar_auditoria(
    v_venda.organization_id, 'venda.confirmada', 'venda', p_venda,
    jsonb_build_object('condicao', p_condicao, 'total_cents', v_venda.total_cents)
  );
end;
$$;

create function app.criar_venda_manual(
  p_organization uuid,
  p_customer uuid,
  p_items jsonb,
  p_condicao text,
  p_vencimento date default null,
  p_note text default null,
  p_forma uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_venda_id uuid;
begin
  v_venda_id := app.criar_venda(p_organization, p_customer, 'manual', p_items, p_note);
  perform app.confirmar_venda(v_venda_id, p_condicao, p_vencimento, p_forma);
  return v_venda_id;
end;
$$;

revoke execute on function app.confirmar_venda(uuid, text, date, uuid) from public;
revoke execute on function app.criar_venda_manual(uuid, uuid, jsonb, text, date, text, uuid) from public;
grant execute on function app.confirmar_venda(uuid, text, date, uuid) to authenticated;
grant execute on function app.criar_venda_manual(uuid, uuid, jsonb, text, date, text, uuid) to authenticated;
