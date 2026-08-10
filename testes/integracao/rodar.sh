#!/usr/bin/env bash
# Teste de integração: cria um banco descartável, aplica TODAS as migrations
# do zero e roda os fluxos ponta a ponta sob RLS. Exige um PostgreSQL
# acessível com superusuário (variáveis PGHOST/PGUSER/PGPASSWORD padrão do
# psql). Local: sudo -u postgres bash testes/integracao/rodar.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

BANCO="${BANCO_DE_TESTE:-allow_teste_integracao}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

dropdb --if-exists "$BANCO"
createdb "$BANCO"

echo "— preparando o banco de teste ($BANCO)"
"${PSQL[@]}" -d "$BANCO" -f testes/integracao/preparar.sql

echo "— aplicando as migrations do zero"
for migracao in supabase/migrations/*.sql; do
  echo "  · $(basename "$migracao")"
  "${PSQL[@]}" -d "$BANCO" -f "$migracao"
done

echo "— semeando identidades de teste"
"${PSQL[@]}" -d "$BANCO" -f testes/integracao/semear.sql

echo "— fluxos ponta a ponta sob RLS"
"${PSQL[@]}" -d "$BANCO" -f testes/integracao/fumaca.sql

dropdb "$BANCO"
echo "INTEGRACAO-OK"
