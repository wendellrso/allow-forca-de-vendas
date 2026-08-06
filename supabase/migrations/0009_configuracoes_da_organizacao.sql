-- 0009 — Configurações da Organização: o WhatsApp da vendedora sai do
-- ambiente e passa a ser dado do banco, editável pela tela de Configurações.
-- Membros podem atualizar apenas nome e whatsapp da própria Organização
-- (grant por coluna); a variável de ambiente vira reserva de emergência.
-- Reversão: drop da policy, revoke do update e drop da coluna.

alter table app.organizations
  add column whatsapp text
    check (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$');

grant update (name, whatsapp) on app.organizations to authenticated;

create policy organizations_update on app.organizations
  for update to authenticated
  using (app.eh_membro(id))
  with check (app.eh_membro(id));
