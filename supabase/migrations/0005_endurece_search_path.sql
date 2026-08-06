-- 0005 — Endurecimento apontado pelo linter do Supabase: search_path fixado
-- em todas as funções. As funções já qualificam cada referência com o schema;
-- isto elimina a última dependência da resolução de nomes da sessão.
-- Reversão: alter function ... reset search_path; para cada assinatura.

alter function app.definir_atualizado_em() set search_path = '';
alter function app.uf_valida(text) set search_path = '';
alter function app.guarda_transicao_venda() set search_path = '';
alter function app.guarda_item_de_venda() set search_path = '';
alter function app.aplicar_movimento_de_estoque() set search_path = '';
alter function app.recusar_alteracao() set search_path = '';
alter function app.registrar_auditoria(uuid, text, text, uuid, jsonb) set search_path = '';
alter function app.eh_membro(uuid) set search_path = '';
alter function app.confirmar_venda(uuid, text, date) set search_path = '';
alter function app.entregar_venda(uuid) set search_path = '';
alter function app.cancelar_venda(uuid, text) set search_path = '';
alter function app.registrar_recebimento(uuid, integer) set search_path = '';
alter function app.criar_venda(uuid, uuid, text, jsonb, text) set search_path = '';
alter function app.criar_venda_manual(uuid, uuid, jsonb, text, date, text) set search_path = '';
alter function app.criar_pedido_catalogo(uuid, text, text, text, text, jsonb, text) set search_path = '';
