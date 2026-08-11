-- 0013 — Venda à vista pode gerar cobrança em vez de dar baixa sozinha.
--
-- Até aqui, toda venda à vista nascia com a conta quitada e um recibo, como se
-- o dinheiro já estivesse na mão. Isso é verdade no dinheiro e no cartão de
-- débito, mas é mentira no Pix e no cartão de crédito cobrados pelo provedor:
-- ali a venda é à vista e o dinheiro entra depois que o cliente paga. O novo
-- parâmetro p_cobrar separa as duas coisas — quem escolhe cobrar recebe conta
-- em aberto com vencimento hoje e uma solicitação de cobrança; a baixa vem do
-- pagamento (webhook) ou do registro manual.
--
-- Reversão: recriar confirmar_venda e criar_venda_manual nas assinaturas da
-- 0012 (sem p_cobrar).

drop function app.criar_venda_manual(uuid, uuid, jsonb, text, date, text, uuid, integer, integer);
drop function app.confirmar_venda(uuid, text, date, uuid, integer, integer);

create function app.confirmar_venda(
  p_venda uuid,
  p_condicao text,
  p_vencimento date default null,
  p_forma uuid default null,
  p_parcelas integer default 1,
  p_intervalo_dias integer default 30,
  p_cobrar boolean default false
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_venda app.sales%rowtype;
  v_forma app.payment_methods%rowtype;
  v_item record;
  v_saldo integer;
  v_conta_id uuid;
  v_valor_base integer;
  v_valor_parcela integer;
  v_parcela integer;
  v_billing text;
  v_cobrar boolean;
  v_hoje date;
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

  if p_parcelas is null or p_parcelas < 1 or p_parcelas > 24 then
    raise exception 'O número de parcelas precisa estar entre 1 e 24.';
  end if;
  if p_condicao = 'a_vista' and p_parcelas > 1 then
    raise exception 'Venda à vista não tem parcelas.';
  end if;
  if p_condicao = 'a_prazo' and p_vencimento is null then
    raise exception 'Venda a prazo exige data de vencimento.';
  end if;
  if p_intervalo_dias is null or p_intervalo_dias < 7 or p_intervalo_dias > 60 then
    raise exception 'O intervalo entre parcelas precisa estar entre 7 e 60 dias.';
  end if;

  if p_forma is not null then
    select * into v_forma from app.payment_methods where id = p_forma;
    if not found then
      raise exception 'Forma de pagamento não encontrada.';
    end if;
    if v_forma.kind = 'boleto' and p_condicao = 'a_vista' then
      raise exception 'Boleto sempre gera título com vencimento: use a condição a prazo.';
    end if;
    if p_parcelas > 1 and not v_forma.allows_installments then
      raise exception 'A forma % não permite parcelamento.', v_forma.name;
    end if;
    if p_parcelas > v_forma.max_installments then
      raise exception 'A forma % permite no máximo % parcelas.', v_forma.name, v_forma.max_installments;
    end if;
  elsif p_parcelas > 1 then
    raise exception 'Parcelamento exige uma forma de pagamento que o permita.';
  end if;

  -- Meio de pagamento da cobrança no provedor, quando a forma pede um.
  v_billing := case v_forma.kind
    when 'boleto' then 'BOLETO'
    when 'pix' then 'PIX'
    when 'cartao_credito' then 'CREDIT_CARD'
    else null
  end;

  -- Cobrar só faz sentido à vista: a prazo sempre gera conta em aberto.
  v_cobrar := coalesce(p_cobrar, false) and p_condicao = 'a_vista';
  if v_cobrar and v_billing is null then
    raise exception 'Esta forma de pagamento não gera cobrança: registre o recebimento à vista.';
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

  if p_condicao = 'a_vista' and not v_cobrar then
    insert into app.receivables
      (organization_id, sale_id, customer_id, description, amount_cents, received_cents, status)
    values
      (v_venda.organization_id, p_venda, v_venda.customer_id,
       'Venda à vista — ' || v_venda.customer_name, v_venda.total_cents, v_venda.total_cents, 'recebido')
    returning id into v_conta_id;

    insert into app.receipts (organization_id, receivable_id, amount_cents, note, created_by)
    values (v_venda.organization_id, v_conta_id, v_venda.total_cents,
            'Recebido na venda à vista', auth.uid());

  elsif v_cobrar then
    -- À vista cobrada pelo provedor: a conta nasce em aberto, vencendo hoje.
    -- O dinheiro só entra quando o cliente paga.
    v_hoje := (now() at time zone 'America/Maceio')::date;

    insert into app.receivables
      (organization_id, sale_id, customer_id, description, amount_cents, due_date,
       status, installment_number, installment_count)
    values
      (v_venda.organization_id, p_venda, v_venda.customer_id,
       'Venda à vista — ' || v_venda.customer_name, v_venda.total_cents, v_hoje,
       'aberto', 1, 1)
    returning id into v_conta_id;

    insert into app.boleto_emissions (organization_id, receivable_id, status, billing_type, payload)
    values (
      v_venda.organization_id, v_conta_id, 'simulado', v_billing,
      jsonb_build_object(
        'parcela', 1,
        'parcelas', 1,
        'valor_centavos', v_venda.total_cents,
        'vencimento', v_hoje,
        'pagador', v_venda.customer_name
      )
    );

  else
    -- Divisão em centavos sem perder um centavo: a primeira parcela carrega
    -- o resto da divisão inteira.
    v_valor_base := v_venda.total_cents / p_parcelas;
    for v_parcela in 1..p_parcelas loop
      v_valor_parcela := case
        when v_parcela = 1 then v_venda.total_cents - v_valor_base * (p_parcelas - 1)
        else v_valor_base
      end;

      insert into app.receivables
        (organization_id, sale_id, customer_id, description, amount_cents, due_date,
         status, installment_number, installment_count)
      values
        (v_venda.organization_id, p_venda, v_venda.customer_id,
         case
           when p_parcelas = 1 then 'Venda a prazo — ' || v_venda.customer_name
           else 'Parcela ' || v_parcela || '/' || p_parcelas || ' — ' || v_venda.customer_name
         end,
         v_valor_parcela,
         p_vencimento + ((v_parcela - 1) * p_intervalo_dias),
         'aberto', v_parcela, p_parcelas)
      returning id into v_conta_id;

      -- Cobrança via provedor (boleto, Pix ou cartão): registra a
      -- solicitação. O servidor do aplicativo tenta a emissão em seguida;
      -- sem provedor configurado, permanece como simulação.
      if v_billing is not null then
        insert into app.boleto_emissions (organization_id, receivable_id, status, billing_type, payload)
        values (
          v_venda.organization_id, v_conta_id, 'simulado', v_billing,
          jsonb_build_object(
            'parcela', v_parcela,
            'parcelas', p_parcelas,
            'valor_centavos', v_valor_parcela,
            'vencimento', p_vencimento + ((v_parcela - 1) * p_intervalo_dias),
            'pagador', v_venda.customer_name
          )
        );
      end if;
    end loop;
  end if;

  perform app.registrar_auditoria(
    v_venda.organization_id, 'venda.confirmada', 'venda', p_venda,
    jsonb_build_object('condicao', p_condicao, 'total_cents', v_venda.total_cents,
                       'parcelas', p_parcelas, 'cobranca', v_cobrar)
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
  p_forma uuid default null,
  p_parcelas integer default 1,
  p_intervalo_dias integer default 30,
  p_cobrar boolean default false
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_venda_id uuid;
begin
  v_venda_id := app.criar_venda(p_organization, p_customer, 'manual', p_items, p_note);
  perform app.confirmar_venda(
    v_venda_id, p_condicao, p_vencimento, p_forma, p_parcelas, p_intervalo_dias, p_cobrar
  );
  return v_venda_id;
end;
$$;

-- Recriar a função devolve o execute ao public: só o membro autenticado chama.
revoke execute on function
  app.confirmar_venda(uuid, text, date, uuid, integer, integer, boolean) from public;
revoke execute on function
  app.criar_venda_manual(uuid, uuid, jsonb, text, date, text, uuid, integer, integer, boolean)
  from public;

grant execute on function
  app.confirmar_venda(uuid, text, date, uuid, integer, integer, boolean) to authenticated;
grant execute on function
  app.criar_venda_manual(uuid, uuid, jsonb, text, date, text, uuid, integer, integer, boolean)
  to authenticated;
