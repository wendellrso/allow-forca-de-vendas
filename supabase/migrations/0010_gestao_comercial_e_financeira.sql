-- 0010 — Gestão comercial e financeira.
-- Número legível da venda, custo congelado no item (CPV histórico), parcelas
-- no contas a receber, histórico imutável de recebimentos com estorno,
-- formas de pagamento parametrizadas por tipo e emissão de boleto SIMULADA —
-- uma porta clara para um provedor real assumir depois, sem banco hardcoded.
-- Reversão: drop das tabelas/colunas novas e recriação das funções na
-- assinatura da 0008.

-- ---------------------------------------------------------------------------
-- 1. Número da venda, sequencial por Organização
-- ---------------------------------------------------------------------------

alter table app.organizations
  add column next_sale_number integer not null default 1,
  add column document text
    check (document is null or document ~ '^[0-9]{11}$' or document ~ '^[0-9]{14}$');

alter table app.sales add column sale_number integer;

with numeradas as (
  select id, row_number() over (partition by organization_id order by created_at, id) as n
  from app.sales
)
update app.sales s
set sale_number = numeradas.n
from numeradas
where s.id = numeradas.id;

update app.organizations o
set next_sale_number =
  coalesce((select max(sale_number) from app.sales where organization_id = o.id), 0) + 1;

alter table app.sales alter column sale_number set not null;
create unique index sales_numero_unico on app.sales (organization_id, sale_number);

-- O número nasce no banco: trava a linha da Organização, então duas vendas
-- simultâneas nunca disputam o mesmo número.
create function app.numerar_venda() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sale_number is not null then
    return new;
  end if;
  update app.organizations
  set next_sale_number = next_sale_number + 1
  where id = new.organization_id
  returning next_sale_number - 1 into new.sale_number;
  if new.sale_number is null then
    raise exception 'Organização inexistente para numerar a venda.';
  end if;
  return new;
end;
$$;

create trigger sales_numerar
  before insert on app.sales
  for each row execute function app.numerar_venda();

-- O gatilho roda sob o papel de quem insere a venda; membros precisam poder
-- avançar o contador da própria Organização (a policy de update já limita
-- ao eh_membro).
grant update (next_sale_number) on app.organizations to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Custo congelado no item da venda (a DRE não pode mentir)
-- ---------------------------------------------------------------------------

alter table app.sale_items
  add column unit_cost_cents integer
    check (unit_cost_cents is null or unit_cost_cents >= 0);

-- Retrato inicial: itens antigos recebem o custo atual do produto. É uma
-- aproximação declarada — o custo por produto só passou a existir na 0008 e
-- não há histórico anterior para consultar.
update app.sale_items si
set unit_cost_cents = p.cost_cents
from app.products p
where p.id = si.product_id and si.unit_cost_cents is null;

-- Daqui em diante o custo congela na criação do item, seja qual for o
-- caminho de entrada (venda manual ou catálogo).
create or replace function app.guarda_item_de_venda() returns trigger
language plpgsql
set search_path = ''
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
  if new.unit_cost_cents is null then
    select cost_cents into new.unit_cost_cents
    from app.products
    where id = new.product_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Parcelas no contas a receber
-- ---------------------------------------------------------------------------

alter table app.receivables
  add column installment_number integer not null default 1 check (installment_number >= 1),
  add column installment_count integer not null default 1 check (installment_count >= 1),
  add constraint receivables_parcela_coerente
    check (installment_number <= installment_count);

-- ---------------------------------------------------------------------------
-- 4. Histórico de recebimentos (imutável) e estorno
-- ---------------------------------------------------------------------------

create table app.receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  receivable_id uuid not null references app.receivables (id),
  -- Negativo registra estorno; o saldo da conta é sempre consequência.
  amount_cents integer not null check (amount_cents <> 0),
  note text check (length(note) <= 200),
  created_by uuid,
  created_at timestamptz not null default now()
);

create index receipts_por_conta on app.receipts (receivable_id, created_at desc);
create index receipts_por_data on app.receipts (organization_id, created_at desc);

create trigger receipts_imutaveis
  before update or delete on app.receipts
  for each row execute function app.recusar_alteracao();

grant select, insert on app.receipts to authenticated;
grant all on app.receipts to service_role;

alter table app.receipts enable row level security;
alter table app.receipts force row level security;

create policy receipts_select on app.receipts
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy receipts_insert on app.receipts
  for insert to authenticated
  with check (app.eh_membro(organization_id));

-- ---------------------------------------------------------------------------
-- 5. Formas de pagamento parametrizadas
-- ---------------------------------------------------------------------------

alter table app.payment_methods
  add column kind text not null default 'outro'
    check (kind in ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'boleto', 'outro')),
  add column allows_installments boolean not null default false,
  add column max_installments integer not null default 1
    check (max_installments between 1 and 24),
  add column first_due_days integer not null default 30
    check (first_due_days between 0 and 90),
  add column installment_interval_days integer not null default 30
    check (installment_interval_days between 7 and 60);

update app.payment_methods
set kind = case
  when lower(name) like '%pix%' then 'pix'
  when lower(name) like '%dinheiro%' then 'dinheiro'
  when lower(name) like '%d_bito%' then 'cartao_debito'
  when lower(name) like '%cr_dito%' then 'cartao_credito'
  when lower(name) like '%boleto%' then 'boleto'
  else 'outro'
end;

update app.payment_methods
set allows_installments = true, max_installments = 12
where kind in ('boleto', 'cartao_credito');

-- ---------------------------------------------------------------------------
-- 6. Emissão de boleto: hoje simulação, amanhã um provedor real
-- ---------------------------------------------------------------------------

create table app.boleto_emissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  receivable_id uuid not null unique references app.receivables (id),
  -- 'simulado' é o estado honesto de hoje. Um provedor real percorrerá
  -- solicitado -> emitido (ou erro), preenchendo provider e provider_ref.
  status text not null default 'simulado'
    check (status in ('simulado', 'solicitado', 'emitido', 'erro', 'cancelado')),
  provider text,
  provider_ref text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index boleto_emissions_por_org on app.boleto_emissions (organization_id, created_at desc);

create trigger boleto_emissions_atualizado_em
  before update on app.boleto_emissions
  for each row execute function app.definir_atualizado_em();

grant select, insert, update on app.boleto_emissions to authenticated;
grant all on app.boleto_emissions to service_role;

alter table app.boleto_emissions enable row level security;
alter table app.boleto_emissions force row level security;

create policy boleto_emissions_select on app.boleto_emissions
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy boleto_emissions_insert on app.boleto_emissions
  for insert to authenticated
  with check (app.eh_membro(organization_id));

create policy boleto_emissions_update on app.boleto_emissions
  for update to authenticated
  using (app.eh_membro(organization_id))
  with check (app.eh_membro(organization_id));

-- ---------------------------------------------------------------------------
-- 7. Despesa com vencimento (a face "conta a pagar" da despesa)
-- ---------------------------------------------------------------------------

alter table app.expenses add column due_date date;

-- ---------------------------------------------------------------------------
-- 8. Confirmação de venda com parcelas
-- ---------------------------------------------------------------------------

drop function app.confirmar_venda(uuid, text, date, uuid);
drop function app.criar_venda_manual(uuid, uuid, jsonb, text, date, text, uuid);

create function app.confirmar_venda(
  p_venda uuid,
  p_condicao text,
  p_vencimento date default null,
  p_forma uuid default null,
  p_parcelas integer default 1,
  p_intervalo_dias integer default 30
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
       'Venda à vista — ' || v_venda.customer_name, v_venda.total_cents, v_venda.total_cents, 'recebido')
    returning id into v_conta_id;

    insert into app.receipts (organization_id, receivable_id, amount_cents, note, created_by)
    values (v_venda.organization_id, v_conta_id, v_venda.total_cents,
            'Recebido na venda à vista', auth.uid());
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

      -- Boleto: registra a solicitação SIMULADA. Nenhum banco é acionado;
      -- um provedor real assumirá estas linhas no futuro.
      if v_forma.kind = 'boleto' then
        insert into app.boleto_emissions (organization_id, receivable_id, status, payload)
        values (
          v_venda.organization_id, v_conta_id, 'simulado',
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
                       'parcelas', p_parcelas)
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
  p_intervalo_dias integer default 30
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_venda_id uuid;
begin
  v_venda_id := app.criar_venda(p_organization, p_customer, 'manual', p_items, p_note);
  perform app.confirmar_venda(v_venda_id, p_condicao, p_vencimento, p_forma, p_parcelas, p_intervalo_dias);
  return v_venda_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Recebimento com histórico e estorno
-- ---------------------------------------------------------------------------

create or replace function app.registrar_recebimento(p_conta uuid, p_valor_centavos integer) returns void
language plpgsql
security invoker
set search_path = ''
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

  insert into app.receipts (organization_id, receivable_id, amount_cents, created_by)
  values (v_conta.organization_id, p_conta, p_valor_centavos, auth.uid());

  perform app.registrar_auditoria(
    v_conta.organization_id, 'recebimento.registrado', 'conta_a_receber', p_conta,
    jsonb_build_object('valor_centavos', p_valor_centavos)
  );
end;
$$;

-- Estorno integral: devolve a conta ao estado aberto e registra o movimento
-- negativo no histórico. Parcial não existe — estornar é desfazer.
create function app.estornar_recebimento(p_conta uuid, p_motivo text default null) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conta app.receivables%rowtype;
begin
  select * into v_conta from app.receivables where id = p_conta for update;
  if not found then
    raise exception 'Conta a receber não encontrada.';
  end if;
  if v_conta.received_cents = 0 then
    raise exception 'Esta conta não tem recebimento para estornar.';
  end if;
  if v_conta.status = 'cancelado' then
    raise exception 'Conta cancelada não pode ser estornada.';
  end if;

  insert into app.receipts (organization_id, receivable_id, amount_cents, note, created_by)
  values (v_conta.organization_id, p_conta, -v_conta.received_cents,
          nullif(btrim(coalesce(p_motivo, '')), ''), auth.uid());

  update app.receivables
  set received_cents = 0, status = 'aberto'
  where id = p_conta;

  perform app.registrar_auditoria(
    v_conta.organization_id, 'recebimento.estornado', 'conta_a_receber', p_conta,
    jsonb_build_object('valor_centavos', v_conta.received_cents,
                       'motivo', coalesce(p_motivo, ''))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Concessões
-- ---------------------------------------------------------------------------

revoke execute on function app.confirmar_venda(uuid, text, date, uuid, integer, integer) from public;
revoke execute on function app.criar_venda_manual(uuid, uuid, jsonb, text, date, text, uuid, integer, integer) from public;
revoke execute on function app.estornar_recebimento(uuid, text) from public;
revoke execute on function app.numerar_venda() from public;

grant execute on function app.confirmar_venda(uuid, text, date, uuid, integer, integer) to authenticated;
grant execute on function app.criar_venda_manual(uuid, uuid, jsonb, text, date, text, uuid, integer, integer) to authenticated;
grant execute on function app.estornar_recebimento(uuid, text) to authenticated;
