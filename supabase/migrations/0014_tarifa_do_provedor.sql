-- 0014 — A tarifa do provedor vira despesa: a DRE mostra a margem real.
--
-- Quando o cliente paga R$ 5,00, o Asaas retém a tarifa e credita menos que
-- isso. A venda continua valendo R$ 5,00 — foi o que o cliente pagou — mas o
-- custo da cobrança existe e precisa aparecer. Sem ele, a DRE mostra receita
-- cheia e margem inflada; numa venda pequena a tarifa chega a pesar dezenas
-- de por cento.
--
-- A despesa nasce do próprio webhook, a partir do valor líquido informado
-- pelo provedor, e fica amarrada à conta a receber que a originou — assim a
-- reentrega do evento não duplica lançamento.
--
-- Reversão: drop da função, do índice e da coluna receivable_id.

alter table app.expenses
  add column receivable_id uuid references app.receivables (id);

-- Uma tarifa por cobrança. Nulos não conflitam entre si, então as despesas
-- lançadas à mão seguem livres.
create unique index expenses_tarifa_unica_por_conta on app.expenses (receivable_id);

create function app.registrar_tarifa_de_cobranca(
  p_conta uuid,
  p_tarifa_centavos integer
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conta app.receivables%rowtype;
  v_categoria uuid;
  v_numero integer;
begin
  -- Provedor sem tarifa (ou valor líquido ausente) não gera despesa.
  if p_tarifa_centavos is null or p_tarifa_centavos <= 0 then
    return;
  end if;

  select * into v_conta from app.receivables where id = p_conta;
  if not found then
    raise exception 'Conta a receber não encontrada.';
  end if;

  select s.sale_number into v_numero from app.sales s where s.id = v_conta.sale_id;

  -- A categoria nasce junto da primeira tarifa e é reaproveitada depois.
  select id into v_categoria
  from app.expense_categories
  where organization_id = v_conta.organization_id
    and lower(btrim(name)) = 'tarifas de cobrança'
    and archived_at is null;

  if v_categoria is null then
    insert into app.expense_categories (organization_id, name)
    values (v_conta.organization_id, 'Tarifas de cobrança')
    returning id into v_categoria;
  end if;

  insert into app.expenses
    (organization_id, category_id, description, amount_cents, expense_date,
     status, receivable_id)
  values (
    v_conta.organization_id,
    v_categoria,
    case
      when v_numero is null then 'Tarifa da cobrança'
      else 'Tarifa da cobrança — Venda #' || v_numero
    end,
    p_tarifa_centavos,
    (now() at time zone 'America/Maceio')::date,
    'pago',
    p_conta
  )
  on conflict (receivable_id) do nothing;
end;
$$;

revoke execute on function app.registrar_tarifa_de_cobranca(uuid, integer) from public;
grant execute on function app.registrar_tarifa_de_cobranca(uuid, integer) to service_role;
