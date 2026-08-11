-- Fluxos ponta a ponta contra o PostgreSQL real, rodando como membro
-- autenticado (RLS valendo). Qualquer FALHA derruba o teste.

set role authenticated;
select set_config('app.test_uid', '11111111-1111-1111-1111-111111111111', false);

-- ---------------------------------------------------------------------------
-- Cadastros e venda à vista
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  v_cliente uuid;
  v_produto uuid;
  v_dinheiro uuid;
  v_venda uuid;
  v_conta uuid;
  v_numero integer;
  v_estoque integer;
begin
  select id into v_org from app.organizations where name = 'Allow';
  if v_org is null then raise exception 'FALHA: membro não enxerga a própria Organização'; end if;

  -- cliente novo → usável na venda
  insert into app.customers (organization_id, name, phone, city, state)
  values (v_org, 'Cliente De Teste', '82999990001', 'Maceió', 'AL')
  returning id into v_cliente;

  -- produto novo com custo → usável na venda
  insert into app.products (organization_id, name, price_cents, cost_cents, unit)
  values (v_org, 'Produto De Teste', 5000, 2000, 'un')
  returning id into v_produto;

  insert into app.stock_movements (organization_id, product_id, delta, kind, reason, created_by)
  values (v_org, v_produto, 20, 'entrada', 'carga do teste', auth.uid());

  select id into v_dinheiro from app.payment_methods
  where organization_id = v_org and kind = 'dinheiro';

  -- venda à vista: estoque baixa, conta nasce recebida, recibo automático
  v_venda := app.criar_venda_manual(
    v_org, v_cliente,
    jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 2)),
    'a_vista', null, null, v_dinheiro, 1, 30);

  select sale_number into v_numero from app.sales where id = v_venda;
  if v_numero is null or v_numero < 1 then raise exception 'FALHA: venda sem número'; end if;

  select stock_quantity into v_estoque from app.products where id = v_produto;
  if v_estoque <> 18 then raise exception 'FALHA: estoque não baixou (%)', v_estoque; end if;

  select id into v_conta from app.receivables where sale_id = v_venda;
  if (select status from app.receivables where id = v_conta) <> 'recebido' then
    raise exception 'FALHA: venda à vista deveria nascer recebida';
  end if;
  if (select count(*) from app.receipts where receivable_id = v_conta) <> 1 then
    raise exception 'FALHA: venda à vista sem recibo automático';
  end if;
  if (select unit_cost_cents from app.sale_items where sale_id = v_venda) <> 2000 then
    raise exception 'FALHA: custo não congelou no item';
  end if;
  if not exists (
    select 1 from app.audit_logs
    where resource_id = v_venda and action = 'venda.confirmada'
  ) then
    raise exception 'FALHA: confirmação sem auditoria';
  end if;

  raise notice 'ok: cadastros e venda à vista';
end $$;

-- ---------------------------------------------------------------------------
-- Venda parcelada no boleto (simulação) + recebimento + estorno
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  v_cliente uuid;
  v_produto uuid;
  v_boleto uuid;
  v_venda uuid;
  v_conta uuid;
  v_qtd integer;
  v_soma integer;
begin
  select id into v_org from app.organizations where name = 'Allow';
  select id into v_cliente from app.customers where organization_id = v_org and name = 'Cliente De Teste';
  select id into v_produto from app.products where organization_id = v_org and name = 'Produto De Teste';
  select id into v_boleto from app.payment_methods where organization_id = v_org and kind = 'boleto';

  v_venda := app.criar_venda_manual(
    v_org, v_cliente,
    jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 3)),
    'a_prazo', '2026-09-15', null, v_boleto, 3, 30);

  select count(*), sum(amount_cents) into v_qtd, v_soma
  from app.receivables where sale_id = v_venda;
  if v_qtd <> 3 then raise exception 'FALHA: esperava 3 parcelas, veio %', v_qtd; end if;
  if v_soma <> 15000 then raise exception 'FALHA: parcelas somam % e não o total', v_soma; end if;

  if (select due_date from app.receivables where sale_id = v_venda and installment_number = 3)
     <> date '2026-11-14' then
    raise exception 'FALHA: vencimento da 3ª parcela errado';
  end if;

  select count(*) into v_qtd
  from app.boleto_emissions b join app.receivables r on r.id = b.receivable_id
  where r.sale_id = v_venda and b.status = 'simulado' and b.provider is null;
  if v_qtd <> 3 then raise exception 'FALHA: esperava 3 boletos simulados sem provedor'; end if;

  -- recebimento parcial → total → estorno integral com trilha
  select id into v_conta from app.receivables where sale_id = v_venda and installment_number = 1;
  perform app.registrar_recebimento(v_conta, 1000);
  if (select status from app.receivables where id = v_conta) <> 'parcial' then
    raise exception 'FALHA: recebimento parcial não marcou parcial';
  end if;
  perform app.registrar_recebimento(v_conta, (select amount_cents - 1000 from app.receivables where id = v_conta));
  if (select status from app.receivables where id = v_conta) <> 'recebido' then
    raise exception 'FALHA: quitação não marcou recebido';
  end if;
  perform app.estornar_recebimento(v_conta, 'teste de integração');
  if (select status from app.receivables where id = v_conta) <> 'aberto'
     or (select received_cents from app.receivables where id = v_conta) <> 0 then
    raise exception 'FALHA: estorno não devolveu a conta ao aberto';
  end if;
  if (select coalesce(sum(amount_cents), -1) from app.receipts where receivable_id = v_conta) <> 0 then
    raise exception 'FALHA: trilha de recibos não fecha em zero após estorno';
  end if;

  -- com recebimento registrado em outra parcela, cancelar é recusado
  select id into v_conta from app.receivables where sale_id = v_venda and installment_number = 2;
  perform app.registrar_recebimento(v_conta, 500);
  begin
    perform app.cancelar_venda(v_venda, 'não pode');
    raise exception 'FALHA: cancelamento com recebimento deveria ser recusado';
  exception when others then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  raise notice 'ok: parcelas, boleto simulado, recebimento e estorno';
end $$;

-- ---------------------------------------------------------------------------
-- Regras de recusa e cancelamento com estorno de estoque
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  v_cliente uuid;
  v_produto uuid;
  v_boleto uuid;
  v_dinheiro uuid;
  v_venda uuid;
  v_estoque_antes integer;
begin
  select id into v_org from app.organizations where name = 'Allow';
  select id into v_cliente from app.customers where organization_id = v_org and name = 'Cliente De Teste';
  select id into v_produto from app.products where organization_id = v_org and name = 'Produto De Teste';
  select id into v_boleto from app.payment_methods where organization_id = v_org and kind = 'boleto';
  select id into v_dinheiro from app.payment_methods where organization_id = v_org and kind = 'dinheiro';

  -- boleto à vista recusado
  begin
    perform app.criar_venda_manual(
      v_org, v_cliente,
      jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 1)),
      'a_vista', null, null, v_boleto, 1, 30);
    raise exception 'FALHA: boleto à vista deveria ser recusado';
  exception when others then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- parcelas em forma que não permite recusadas
  begin
    perform app.criar_venda_manual(
      v_org, v_cliente,
      jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 1)),
      'a_prazo', '2026-09-15', null, v_dinheiro, 3, 30);
    raise exception 'FALHA: parcelas no dinheiro deveriam ser recusadas';
  exception when others then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- venda sem estoque recusada
  begin
    perform app.criar_venda_manual(
      v_org, v_cliente,
      jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 999)),
      'a_vista', null, null, v_dinheiro, 1, 30);
    raise exception 'FALHA: venda sem estoque deveria ser recusada';
  exception when others then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- cancelamento sem recebimento devolve o estoque
  select stock_quantity into v_estoque_antes from app.products where id = v_produto;
  v_venda := app.criar_venda_manual(
    v_org, v_cliente,
    jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 2)),
    'a_prazo', '2026-09-15', null, v_dinheiro, 1, 30);
  perform app.cancelar_venda(v_venda, 'teste');
  if (select stock_quantity from app.products where id = v_produto) <> v_estoque_antes then
    raise exception 'FALHA: cancelamento não estornou o estoque';
  end if;

  raise notice 'ok: recusas e cancelamento com estorno de estoque';
end $$;

-- ---------------------------------------------------------------------------
-- Cobrança Pix a prazo gera solicitação com o meio de pagamento correto
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  v_cliente uuid;
  v_produto uuid;
  v_pix uuid;
  v_venda uuid;
  v_billing text;
begin
  select id into v_org from app.organizations where name = 'Allow';
  select id into v_cliente from app.customers where organization_id = v_org and name = 'Cliente De Teste';
  select id into v_produto from app.products where organization_id = v_org and name = 'Produto De Teste';
  select id into v_pix from app.payment_methods where organization_id = v_org and kind = 'pix';

  v_venda := app.criar_venda_manual(
    v_org, v_cliente,
    jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 1)),
    'a_prazo', '2026-09-20', null, v_pix, 1, 30);

  select b.billing_type into v_billing
  from app.boleto_emissions b join app.receivables r on r.id = b.receivable_id
  where r.sale_id = v_venda;
  if v_billing is distinct from 'PIX' then
    raise exception 'FALHA: cobrança Pix deveria nascer com billing_type PIX (veio %)', v_billing;
  end if;

  -- à vista sem cobrar: o dinheiro já entrou, nada é cobrado do cliente
  v_venda := app.criar_venda_manual(
    v_org, v_cliente,
    jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 1)),
    'a_vista', null, null, v_pix, 1, 30, false);
  if exists (
    select 1 from app.boleto_emissions b
    join app.receivables r on r.id = b.receivable_id
    where r.sale_id = v_venda
  ) then
    raise exception 'FALHA: à vista sem cobrar não deveria gerar cobrança no provedor';
  end if;
  if not exists (
    select 1 from app.receivables where sale_id = v_venda and status = 'recebido'
  ) then
    raise exception 'FALHA: à vista sem cobrar deveria nascer quitada';
  end if;

  raise notice 'ok: cobrança Pix a prazo e à vista sem cobrar';
end $$;

-- ---------------------------------------------------------------------------
-- Venda à vista cobrada pelo provedor: conta em aberto, cobrança Pix, sem
-- recibo inventado. O dinheiro só entra quando o cliente paga.
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  v_cliente uuid;
  v_produto uuid;
  v_pix uuid;
  v_dinheiro uuid;
  v_venda uuid;
  v_conta app.receivables%rowtype;
  v_billing text;
  v_hoje date := (now() at time zone 'America/Maceio')::date;
begin
  select id into v_org from app.organizations where name = 'Allow';
  select id into v_cliente from app.customers where organization_id = v_org and name = 'Cliente De Teste';
  select id into v_produto from app.products where organization_id = v_org and name = 'Produto De Teste';
  select id into v_pix from app.payment_methods where organization_id = v_org and kind = 'pix';
  select id into v_dinheiro from app.payment_methods where organization_id = v_org and kind = 'dinheiro';

  v_venda := app.criar_venda_manual(
    v_org, v_cliente,
    jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 1)),
    'a_vista', null, null, v_pix, 1, 30, true);

  select * into v_conta from app.receivables where sale_id = v_venda;
  if v_conta.status <> 'aberto' or v_conta.received_cents <> 0 then
    raise exception 'FALHA: à vista cobrada deveria nascer em aberto e zerada (veio % / %)',
      v_conta.status, v_conta.received_cents;
  end if;
  if v_conta.due_date is distinct from v_hoje then
    raise exception 'FALHA: à vista cobrada deveria vencer hoje (veio %)', v_conta.due_date;
  end if;
  if exists (select 1 from app.receipts where receivable_id = v_conta.id) then
    raise exception 'FALHA: à vista cobrada não pode inventar recibo';
  end if;

  select billing_type into v_billing from app.boleto_emissions where receivable_id = v_conta.id;
  if v_billing is distinct from 'PIX' then
    raise exception 'FALHA: à vista cobrada no Pix deveria gerar cobrança PIX (veio %)', v_billing;
  end if;

  -- a baixa vem do pagamento, não da confirmação
  perform app.registrar_recebimento(v_conta.id, v_conta.amount_cents);
  select * into v_conta from app.receivables where id = v_conta.id;
  if v_conta.status <> 'recebido' then
    raise exception 'FALHA: pagamento da cobrança à vista não quitou a conta';
  end if;

  -- forma que não cobra pelo provedor recusa a cobrança
  begin
    perform app.criar_venda_manual(
      v_org, v_cliente,
      jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 1)),
      'a_vista', null, null, v_dinheiro, 1, 30, true);
    raise exception 'FALHA: dinheiro não deveria aceitar cobrança pelo provedor';
  exception when others then
    if position('não gera cobrança' in sqlerrm) = 0 then
      raise;
    end if;
  end;

  raise notice 'ok: venda à vista cobrada pelo provedor';
end $$;

-- ---------------------------------------------------------------------------
-- Despesa com categoria dinâmica e vencimento
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  v_categoria uuid;
begin
  select id into v_org from app.organizations where name = 'Allow';

  insert into app.expense_categories (organization_id, name)
  values (v_org, 'Pedágio Teste')
  returning id into v_categoria;

  insert into app.expenses
    (organization_id, category_id, description, amount_cents, expense_date, due_date, status)
  values
    (v_org, v_categoria, 'despesa do teste', 8550, '2026-08-10', '2026-08-20', 'a_pagar');

  if (select count(*) from app.expenses where category_id = v_categoria) <> 1 then
    raise exception 'FALHA: despesa não gravou';
  end if;

  raise notice 'ok: despesa com categoria e vencimento';
end $$;

-- ---------------------------------------------------------------------------
-- Isolamento entre Organizações
-- ---------------------------------------------------------------------------
do $$
begin
  if (select count(*) from app.customers where name = 'Cliente Da Outra') <> 0 then
    raise exception 'FALHA: membro enxerga cliente de outra Organização';
  end if;
  if (select count(*) from app.products where name = 'Produto Da Outra') <> 0 then
    raise exception 'FALHA: membro enxerga produto de outra Organização';
  end if;
  if (select count(*) from app.organizations where name = 'Outra Empresa') <> 0 then
    raise exception 'FALHA: membro enxerga outra Organização';
  end if;
  raise notice 'ok: isolamento do membro 1';
end $$;

select set_config('app.test_uid', '22222222-2222-2222-2222-222222222222', false);

do $$
begin
  if (select count(*) from app.customers where name = 'Cliente De Teste') <> 0 then
    raise exception 'FALHA: membro 2 enxerga dados da Allow';
  end if;
  if (select count(*) from app.customers where name = 'Cliente Da Outra') <> 1 then
    raise exception 'FALHA: membro 2 não enxerga o próprio cliente';
  end if;
  raise notice 'ok: isolamento do membro 2';
end $$;

-- ---------------------------------------------------------------------------
-- Catálogo público: função restrita ao service_role
-- ---------------------------------------------------------------------------
do $$
begin
  -- membro autenticado NÃO pode executar a função do catálogo
  begin
    perform app.criar_pedido_catalogo(
      '00000000-0000-0000-0000-000000000000', 'X', '82999990002', 'Maceió', 'AL', '[]'::jsonb);
    raise exception 'FALHA: authenticated não deveria executar o pedido do catálogo';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FALHA%' then raise; end if;
  end;
  raise notice 'ok: catálogo negado ao authenticated';
end $$;

reset role;
set role service_role;

do $$
declare
  v_org uuid;
  v_produto uuid;
  v_venda uuid;
begin
  select id into v_org from app.organizations where name = 'Allow';
  select id into v_produto from app.products where organization_id = v_org and name = 'Produto De Teste';

  v_venda := app.criar_pedido_catalogo(
    v_org, 'Cliente Do Catálogo', '82999990003', 'Arapiraca', 'AL',
    jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 1)));

  if (select status from app.sales where id = v_venda) <> 'aguardando_confirmacao' then
    raise exception 'FALHA: pedido do catálogo deveria aguardar confirmação';
  end if;
  if not exists (
    select 1 from app.customers where organization_id = v_org and phone = '82999990003'
  ) then
    raise exception 'FALHA: catálogo não criou o cliente pelo telefone';
  end if;

  raise notice 'ok: pedido do catálogo pelo service_role';
end $$;

reset role;

select 'INTEGRACAO-OK' as resultado;
