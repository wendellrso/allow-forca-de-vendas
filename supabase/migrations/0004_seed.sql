-- 0004 — Semente institucional: a Organização Allow.
-- O vínculo do primeiro membro depende de uma identidade criada no Supabase
-- Auth e é feito depois, conforme o README:
--   insert into app.members (user_id, organization_id, role)
--   values ('<uuid da identidade>', (select id from app.organizations limit 1), 'administrador');

insert into app.organizations (name)
select 'Allow'
where not exists (select 1 from app.organizations);
