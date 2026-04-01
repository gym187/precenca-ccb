#!/bin/bash
set -e

# ══════════════════════════════════════════════════════════
#   CCB - Deploy Script
#   Sistema de Controle de Presença
# ══════════════════════════════════════════════════════════

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✘]${NC} $1"; exit 1; }

echo ""
echo "══════════════════════════════════════════════════"
echo "   CCB - Deploy do Sistema de Presença"
echo "══════════════════════════════════════════════════"
echo ""

# ── 1. Verificar Docker ─────────────────────────────────
command -v docker >/dev/null 2>&1 || fail "Docker não encontrado. Instale: https://docs.docker.com/engine/install/"
command -v docker compose >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || fail "Docker Compose não encontrado."

# Detectar comando compose
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

log "Docker encontrado: $(docker --version | head -1)"

# ── 2. Verificar JWT_SECRET ─────────────────────────────
if [ -z "$JWT_SECRET" ]; then
  if [ -f .env ] && grep -q "JWT_SECRET" .env 2>/dev/null; then
    export $(grep "JWT_SECRET" .env | xargs)
    warn "JWT_SECRET carregado do .env"
  else
    # Gerar uma chave aleatória na primeira execução
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    echo "JWT_SECRET=$JWT_SECRET" > .env
    warn "JWT_SECRET gerado automaticamente e salvo em .env"
  fi
fi
export JWT_SECRET

log "JWT_SECRET configurado"

# ── 3. Build das imagens ────────────────────────────────
echo ""
echo "── Construindo imagens Docker ──────────────────"
$COMPOSE build --no-cache || fail "Erro no build das imagens."
log "Imagens construídas com sucesso"

# ── 4. Subir containers ────────────────────────────────
echo ""
echo "── Iniciando containers ────────────────────────"
$COMPOSE up -d || fail "Erro ao iniciar containers."

# ── 5. Aguardar banco de dados ─────────────────────────
echo ""
echo -n "Aguardando banco de dados ficar saudável..."
TRIES=0
MAX_TRIES=30
until docker inspect ccb_db --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; do
  TRIES=$((TRIES + 1))
  if [ $TRIES -ge $MAX_TRIES ]; then
    echo ""
    fail "Banco de dados não ficou saudável após ${MAX_TRIES}s"
  fi
  echo -n "."
  sleep 1
done
echo ""
log "Banco de dados pronto"

# ── 6. Aplicar schema ──────────────────────────────────
echo ""
echo "── Aplicando schema do banco ───────────────────"
docker exec ccb_app npx prisma db push --accept-data-loss || fail "Erro ao aplicar schema."
log "Schema aplicado"

# ── 7. Verificar se tudo está rodando ──────────────────
echo ""
echo "── Verificando serviços ────────────────────────"

check_container() {
  local name=$1
  if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    log "$name rodando"
  else
    fail "$name não está rodando. Verifique: docker logs $name"
  fi
}

check_container "ccb_db"
check_container "ccb_app"
check_container "ccb_frontend"

# ── 8. Testar endpoints ────────────────────────────────
sleep 2
if command -v curl >/dev/null 2>&1; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    log "Frontend respondendo (HTTP 200)"
  else
    warn "Frontend retornou HTTP $HTTP_CODE (pode estar iniciando)"
  fi

  API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
  if [ "$API_CODE" = "200" ]; then
    log "API respondendo (HTTP 200)"
  else
    warn "API retornou HTTP $API_CODE (pode estar iniciando)"
  fi
fi

# ── Resumo ──────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo -e "   ${GREEN}Deploy concluído com sucesso!${NC}"
echo "══════════════════════════════════════════════════"
echo ""
echo "   Frontend:  http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):8080"
echo "   API:       http://localhost:3000"
echo ""
echo "   Login padrão:"
echo "   E-mail:    admin@ccb.com"
echo "   Senha:     Admin@123"
echo ""
echo "   Comandos úteis:"
echo "   - Ver logs:      $COMPOSE logs -f"
echo "   - Parar tudo:    $COMPOSE down"
echo "   - Reiniciar:     $COMPOSE restart"
echo "   - Backup DB:     docker exec ccb_db mysqldump -uccb_user -pccb_pass ccb > backup.sql"
echo ""
