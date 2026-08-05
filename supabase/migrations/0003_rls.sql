-- 0003 — Acesso: RLS habilitada e forçada em todas as tabelas, negando por
-- padrão. O privilégio de delete não existe para sessões de usuário: neste
-- produto, exclusão institucional é arquivamento.
-- Reversão: drop policy de cada política e revoke dos grants abaixo.

set search_path = app, public;

-- Privilégios de tabela: a RLS decide as linhas; o grant decide os verbos.
grant select on app.organizations to authenticated;
grant select on app.members to authenticated;
grant select, insert, update on app.customers to authenticated;
grant select, insert, update on app.products to authenticated;
grant select, insert on app.stock_movements to authenticated;
grant select, insert, update on app.sales to authenticated;
grant select, insert on app.sale_items to authenticated;
grant select, insert, update on app.receivables to authenticated;
grant select, insert, update, delete on app.expenses to authenticated;
grant select, insert on app.audit_logs to authenticated;

grant all on all tables in schema app to service_role;

-- Vínculo de membro, sem recursão: a política de members usa apenas
-- auth.uid(), e as demais tabelas perguntam por esta função.
create or replace function app.eh_membro(p_organization uuid) returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from app.members m
    where m.user_id = auth.uid()
      and m.organization_id = p_organization
  );
$$;

grant execute on function app.eh_membro(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
alter table app.organizations enable row level security;
alter table app.organizations force row level security;

create policy organizations_select on app.organizations
  for select to authenticated
  using (app.eh_membro(id));

-- ---------------------------------------------------------------------------
-- members
-- ---------------------------------------------------------------------------
alter table app.members enable row level security;
alter table app.members force row level security;

create policy members_select on app.members
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
alter table app.customers enable row level security;
alter table app.customers force row level security;

create policy customers_select on app.customers
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy customers_insert on app.customers
  for insert to authenticated
  with check (app.eh_membro(organization_id));

create policy customers_update on app.customers
  for update to authenticated
  using (app.eh_membro(organization_id))
  with check (app.eh_membro(organization_id));

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
alter table app.products enable row level security;
alter table app.products force row level security;

create policy products_select on app.products
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy products_insert on app.products
  for insert to authenticated
  with check (app.eh_membro(organization_id));

create policy products_update on app.products
  for update to authenticated
  using (app.eh_membro(organization_id))
  with check (app.eh_membro(organization_id));

-- ---------------------------------------------------------------------------
-- stock_movements — histórico imutável: sem update e sem delete
-- ---------------------------------------------------------------------------
alter table app.stock_movements enable row level security;
alter table app.stock_movements force row level security;

create policy stock_movements_select on app.stock_movements
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy stock_movements_insert on app.stock_movements
  for insert to authenticated
  with check (app.eh_membro(organization_id));

-- ---------------------------------------------------------------------------
-- sales
-- ---------------------------------------------------------------------------
alter table app.sales enable row level security;
alter table app.sales force row level security;

create policy sales_select on app.sales
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy sales_insert on app.sales
  for insert to authenticated
  with check (app.eh_membro(organization_id));

create policy sales_update on app.sales
  for update to authenticated
  using (app.eh_membro(organization_id))
  with check (app.eh_membro(organization_id));

-- ---------------------------------------------------------------------------
-- sale_items — retrato da venda: sem update e sem delete
-- ---------------------------------------------------------------------------
alter table app.sale_items enable row level security;
alter table app.sale_items force row level security;

create policy sale_items_select on app.sale_items
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy sale_items_insert on app.sale_items
  for insert to authenticated
  with check (app.eh_membro(organization_id));

-- ---------------------------------------------------------------------------
-- receivables
-- ---------------------------------------------------------------------------
alter table app.receivables enable row level security;
alter table app.receivables force row level security;

create policy receivables_select on app.receivables
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy receivables_insert on app.receivables
  for insert to authenticated
  with check (app.eh_membro(organization_id));

create policy receivables_update on app.receivables
  for update to authenticated
  using (app.eh_membro(organization_id))
  with check (app.eh_membro(organization_id));

-- ---------------------------------------------------------------------------
-- expenses — a única com delete: despesa digitada errada não é registro
-- institucional, e a auditoria guarda o rastro relevante nas demais tabelas
-- ---------------------------------------------------------------------------
alter table app.expenses enable row level security;
alter table app.expenses force row level security;

create policy expenses_select on app.expenses
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy expenses_insert on app.expenses
  for insert to authenticated
  with check (app.eh_membro(organization_id));

create policy expenses_update on app.expenses
  for update to authenticated
  using (app.eh_membro(organization_id))
  with check (app.eh_membro(organization_id));

create policy expenses_delete on app.expenses
  for delete to authenticated
  using (app.eh_membro(organization_id));

-- ---------------------------------------------------------------------------
-- audit_logs — cada um só escreve a própria autoria; ninguém edita ou apaga
-- ---------------------------------------------------------------------------
alter table app.audit_logs enable row level security;
alter table app.audit_logs force row level security;

create policy audit_logs_select on app.audit_logs
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy audit_logs_insert on app.audit_logs
  for insert to authenticated
  with check (app.eh_membro(organization_id) and actor = auth.uid());
