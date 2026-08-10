-- Semente do teste de integração: duas identidades e duas Organizações,
-- para os fluxos e para a prova de isolamento entre Organizações.

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

-- A Organização Allow vem da migration 0004; a segunda existe só para o
-- teste de isolamento.
insert into app.organizations (name) values ('Outra Empresa');

insert into app.members (user_id, organization_id, role)
select '11111111-1111-1111-1111-111111111111', id, 'vendedor'
from app.organizations where name = 'Allow';

insert into app.members (user_id, organization_id, role)
select '22222222-2222-2222-2222-222222222222', id, 'vendedor'
from app.organizations where name = 'Outra Empresa';

-- A segunda Organização também ganha formas (a 0008 semeou apenas as
-- existentes na época), um cliente e um produto para a prova de isolamento.
insert into app.payment_methods (organization_id, name, kind)
select id, 'Dinheiro', 'dinheiro' from app.organizations where name = 'Outra Empresa';

insert into app.customers (organization_id, name, city, state)
select id, 'Cliente Da Outra', 'Recife', 'PE' from app.organizations where name = 'Outra Empresa';

insert into app.products (organization_id, name, price_cents, stock_quantity)
select id, 'Produto Da Outra', 1000, 10 from app.organizations where name = 'Outra Empresa';
