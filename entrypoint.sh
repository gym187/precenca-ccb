#!/bin/sh
set -e

echo "=================================================="
echo "   CCB - Sistema de Presença Infantil"
echo "=================================================="

echo "[1/3] Sincronizando schema com o banco de dados..."
npx prisma db push --accept-data-loss

echo "[2/3] Executando seed inicial..."
node prisma/seed.js

echo "[3/3] Iniciando servidor..."
exec node src/index.js
