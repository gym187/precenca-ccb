#!/bin/sh
set -e

echo "=================================================="
echo "   CCB - Sistema de Presença Infantil [PROD]"
echo "=================================================="

echo "[1/3] Aplicando migrations pendentes..."
npx prisma db push

echo "[2/3] Executando seed inicial (idempotente)..."
node prisma/seed.js

echo "[3/3] Iniciando servidor..."
exec node src/index.js
