-- 0002 — Casos de uso transacionais da venda.
-- Todas as funções voltadas a membros são SECURITY INVOKER: rodam sob as
-- políticas de acesso de quem chama. A exceção é o pedido do catálogo, que só
-- o servidor (service_role) executa.
-- Reversão: drop function de cada assinatura abaixo.

set search_path = app, public;

-- ---------------------------------------------------------------------------
-- Auditoria a partir das funções
-- ---------------------------------------------------------------------------

create or replace function app.registrar_auditoria(
  p_organization uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_context jsonb default '{}'::jsonb
) returns void
language sql
security invoker
as $$
  insert into app.audit_logs (organization_id, actor, action, resource_type, resource_id, context)
  values (p_organization, auth.uid(), p_action, p_resource_type, p_resource_id, coalesce(p_context, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- Confirmar venda: baixa o estoque e cria o contas a receber, tudo ou nada.
-- ---------------------------------------------------------------------------

create or replace function app.confirmar_venda(
  p_venda uuid,
  p_condicao text,
  p_vencimento date default null
) returns void
language plpgsql
security invoker
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
      due_date = case when p_condicao = 'a_prazo' then p_vencimento else null end
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

-- ---------------------------------------------------------------------------
-- Entregar venda
-- ---------------------------------------------------------------------------

create or replace function app.entregar_venda(p_venda uuid) returns void
language plpgsql
security invoker
as $$
declare
  v_venda app.sales%rowtype;
begin
  select * into v_venda from app.sales where id = p_venda for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  update app.sales set status = 'entregue' where id = p_venda;

  perform app.registrar_auditoria(v_venda.organization_id, 'venda.entregue', 'venda', p_venda);
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancelar venda: estorna o estoque e cancela o contas a receber. Recusa o
-- cancelamento quando já existe recebimento registrado.
-- ---------------------------------------------------------------------------

create or replace function app.cancelar_venda(p_venda uuid, p_motivo text default null) returns void
language plpgsql
security invoker
as $$
declare
  v_venda app.sales%rowtype;
  v_item record;
  v_recebido integer;
begin
  select * into v_venda from app.sales where id = p_venda for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  if v_venda.status = 'confirmada' then
    select coalesce(sum(received_cents), 0) into v_recebido
    from app.receivables
    where sale_id = p_venda and status <> 'cancelado';

    if v_recebido > 0 then
      raise exception 'Há recebimento registrado nesta venda; não é possível cancelar.';
    end if;

    for v_item in
      select product_id, quantity from app.sale_items where sale_id = p_venda
    loop
      insert into app.stock_movements (organization_id, product_id, delta, kind, reason, sale_id, created_by)
      values (
        v_venda.organization_id,
        v_item.product_id,
        v_item.quantity,
        'entrada',
        'Estorno de venda cancelada',
        p_venda,
        auth.uid()
      );
    end loop;

    update app.receivables
    set status = 'cancelado'
    where sale_id = p_venda and status = 'aberto';
  end if;

  update app.sales set status = 'cancelada' where id = p_venda;

  perform app.registrar_auditoria(
    v_venda.organization_id, 'venda.cancelada', 'venda', p_venda,
    jsonb_build_object('motivo', coalesce(p_motivo, ''))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Registrar recebimento, total ou parcial
-- ---------------------------------------------------------------------------

create or replace function app.registrar_recebimento(p_conta uuid, p_valor_centavos integer) returns void
language plpgsql
security invoker
as $$
declare
  v_conta app.receivables%rowtype;
  v_novo integer;
begin
  if p_valor_centavos is null or p_valor_centavos <= 0 then
    raise exception 'Informe um valor maior que zero.';
  end if;

  select * into v_conta from app.receivables where id = p_conta for update;
  if not found then
    raise exception 'Conta a receber não encontrada.';
  end if;
  if v_conta.status not in ('aberto', 'parcial') then
    raise exception 'Esta conta não está em aberto.';
  end if;

  v_novo := v_conta.received_cents + p_valor_centavos;
  if v_novo > v_conta.amount_cents then
    raise exception 'O valor excede o saldo em aberto.';
  end if;

  update app.receivables
  set received_cents = v_novo,
      status = case when v_novo = amount_cents then 'recebido' else 'parcial' end
  where id = p_conta;

  perform app.registrar_auditoria(
    v_conta.organization_id, 'recebimento.registrado', 'conta_a_receber', p_conta,
    jsonb_build_object('valor_centavos', p_valor_centavos)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Criar venda: monta a venda com retrato dos produtos e totais calculados no
-- banco. Usada pela venda manual (já confirmando) e pelo pedido do catálogo.
-- ---------------------------------------------------------------------------

create or replace function app.criar_venda(
  p_organization uuid,
  p_customer uuid,
  p_origin text,
  p_items jsonb,
  p_note text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_cliente app.customers%rowtype;
  v_venda_id uuid;
  v_item jsonb;
  v_produto app.products%rowtype;
  v_quantidade integer;
  v_total integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'O pedido precisa de 1 a 50 itens.';
  end if;

  select * into v_cliente
  from app.customers
  where id = p_customer and organization_id = p_organization and archived_at is null;
  if not found then
    raise exception 'Cliente não encontrado.';
  end if;

  insert into app.sales
    (organization_id, customer_id, customer_name, customer_phone, city, state, origin, note)
  values
    (p_organization, v_cliente.id, v_cliente.name, v_cliente.phone,
     v_cliente.city, v_cliente.state, p_origin, nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_venda_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantidade := (v_item ->> 'quantidade')::integer;
    if v_quantidade is null or v_quantidade < 1 or v_quantidade > 999 then
      raise exception 'Quantidade inválida no pedido.';
    end if;

    select * into v_produto
    from app.products
    where id = (v_item ->> 'produto_id')::uuid
      and organization_id = p_organization
      and active;
    if not found then
      raise exception 'Produto indisponível no pedido.';
    end if;

    insert into app.sale_items
      (organization_id, sale_id, product_id, product_name, quantity, unit_price_cents, subtotal_cents)
    values
      (p_organization, v_venda_id, v_produto.id, v_produto.name,
       v_quantidade, v_produto.price_cents, v_quantidade * v_produto.price_cents);

    v_total := v_total + v_quantidade * v_produto.price_cents;
  end loop;

  update app.sales set total_cents = v_total where id = v_venda_id;

  return v_venda_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Venda manual: a vendedora registra uma venda já fechada. Cria e confirma na
-- mesma transação.
-- ---------------------------------------------------------------------------

create or replace function app.criar_venda_manual(
  p_organization uuid,
  p_customer uuid,
  p_items jsonb,
  p_condicao text,
  p_vencimento date default null,
  p_note text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_venda_id uuid;
begin
  v_venda_id := app.criar_venda(p_organization, p_customer, 'manual', p_items, p_note);
  perform app.confirmar_venda(v_venda_id, p_condicao, p_vencimento);
  return v_venda_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pedido do catálogo público. Executada apenas pelo servidor do aplicativo
-- (service_role): encontra ou cria o cliente pelo telefone e registra o
-- pedido aguardando confirmação. Nenhum estoque é baixado aqui.
-- ---------------------------------------------------------------------------

create or replace function app.criar_pedido_catalogo(
  p_organization uuid,
  p_customer_name text,
  p_customer_phone text,
  p_city text,
  p_state text,
  p_items jsonb,
  p_note text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_cliente_id uuid;
  v_venda_id uuid;
begin
  if p_customer_phone is null or p_customer_phone !~ '^[0-9]{10,11}$' then
    raise exception 'Telefone inválido no pedido do catálogo.';
  end if;

  select id into v_cliente_id
  from app.customers
  where organization_id = p_organization
    and phone = p_customer_phone
    and archived_at is null;

  if v_cliente_id is null then
    insert into app.customers (organization_id, name, phone, city, state)
    values (p_organization, btrim(p_customer_name), p_customer_phone, btrim(p_city), p_state)
    returning id into v_cliente_id;
  end if;

  v_venda_id := app.criar_venda(p_organization, v_cliente_id, 'catalogo', p_items, p_note);

  perform app.registrar_auditoria(
    p_organization, 'pedido.catalogo_criado', 'venda', v_venda_id,
    jsonb_build_object('cliente_id', v_cliente_id)
  );

  return v_venda_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Concessões: nada executa por padrão; membros autenticados recebem só o que
-- usam, e o pedido do catálogo fica restrito ao servidor.
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema app from public;

grant usage on schema app to authenticated, service_role;

grant execute on function app.uf_valida(text) to authenticated, service_role;
grant execute on function app.registrar_auditoria(uuid, text, text, uuid, jsonb) to authenticated, service_role;
grant execute on function app.confirmar_venda(uuid, text, date) to authenticated;
grant execute on function app.entregar_venda(uuid) to authenticated;
grant execute on function app.cancelar_venda(uuid, text) to authenticated;
grant execute on function app.registrar_recebimento(uuid, integer) to authenticated;
grant execute on function app.criar_venda(uuid, uuid, text, jsonb, text) to authenticated, service_role;
grant execute on function app.criar_venda_manual(uuid, uuid, jsonb, text, date, text) to authenticated;
grant execute on function app.criar_pedido_catalogo(uuid, text, text, text, text, jsonb, text) to service_role;
