-- Prepara um banco recém-criado para receber as migrations como se fosse o
-- Supabase: schema auth mínimo, auth.uid() controlável por configuração e os
-- papéis authenticated / service_role.
-- O uid de teste é definido por: select set_config('app.test_uid', '<uuid>', false);

create schema auth;

create table auth.users (
  id uuid primary key
);

create function auth.uid() returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.test_uid', true), '')::uuid
$$;

-- Papéis são do cluster: podem já existir quando o teste roda de novo.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

-- No Supabase real estas concessões já existem.
grant usage on schema auth to authenticated, service_role;
grant execute on function auth.uid() to authenticated, service_role;
