-- 0007 — Categorias de despesa deixam de ser lista fixa: cada Organização
-- cria as suas. As quatro originais viram sementes.
-- Reversão: recriar a coluna category com o check original a partir dos
-- nomes, e remover expense_categories.

create table app.expense_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations (id),
  name text not null check (length(btrim(name)) between 2 and 40),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- Duas categorias ativas com o mesmo nome seriam ambiguidade.
create unique index expense_categories_nome_unico
  on app.expense_categories (organization_id, lower(btrim(name)))
  where archived_at is null;

insert into app.expense_categories (organization_id, name)
select o.id, semente.nome
from app.organizations o
cross join (
  values ('Hospedagem'), ('Alimentação'), ('Combustível'), ('Outros')
) as semente (nome);

alter table app.expenses
  add column category_id uuid references app.expense_categories (id);

update app.expenses despesa
set category_id = categoria.id
from app.expense_categories categoria
where categoria.organization_id = despesa.organization_id
  and lower(categoria.name) = case despesa.category
    when 'hospedagem' then 'hospedagem'
    when 'alimentacao' then 'alimentação'
    when 'combustivel' then 'combustível'
    else 'outros'
  end;

alter table app.expenses alter column category_id set not null;
alter table app.expenses drop column category;

-- Invariante: a categoria pertence à mesma Organização da despesa.
create or replace function app.guarda_categoria_da_despesa() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_organizacao uuid;
begin
  select organization_id into v_organizacao
  from app.expense_categories
  where id = new.category_id;
  if v_organizacao is null or v_organizacao <> new.organization_id then
    raise exception 'Categoria de outra Organização.';
  end if;
  return new;
end;
$$;

create trigger expenses_guarda_categoria
  before insert or update of category_id on app.expenses
  for each row execute function app.guarda_categoria_da_despesa();

-- Acesso: mesmo padrão das demais tabelas; exclusão é arquivamento.
grant select, insert, update on app.expense_categories to authenticated;
grant all on app.expense_categories to service_role;

alter table app.expense_categories enable row level security;
alter table app.expense_categories force row level security;

create policy expense_categories_select on app.expense_categories
  for select to authenticated
  using (app.eh_membro(organization_id));

create policy expense_categories_insert on app.expense_categories
  for insert to authenticated
  with check (app.eh_membro(organization_id));

create policy expense_categories_update on app.expense_categories
  for update to authenticated
  using (app.eh_membro(organization_id))
  with check (app.eh_membro(organization_id));
