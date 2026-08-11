-- 0011 — Baixa automática pelo webhook do provedor de pagamento.
-- O webhook roda no servidor do aplicativo (service_role), sem sessão de
-- usuária: precisa poder registrar o recebimento quando o boleto é pago.
-- Reversão: revoke execute on function app.registrar_recebimento(uuid, integer) from service_role;

grant execute on function app.registrar_recebimento(uuid, integer) to service_role;
