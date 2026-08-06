-- 0006 — Imagem do produto para o catálogo.
-- Reversão: alter table app.products drop column image_url; e remoção do
-- balde `produtos` no Storage.

alter table app.products
  add column image_url text check (image_url is null or image_url ~ '^https://');

-- Balde público de imagens de produto. A escrita acontece somente pelo
-- servidor do aplicativo (service_role); a leitura é pública, porque o
-- catálogo é público. O schema storage só existe no Supabase; em banco local
-- a criação é ignorada.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('produtos', 'produtos', true)
    on conflict (id) do nothing;
  end if;
end $$;
