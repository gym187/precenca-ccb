#!/bin/bash
set -e

# ══════════════════════════════════════════════════════════════════════════════
#   CCB — Deploy de Produção (Proxmox + Cloudflare Tunnel)
#   Uso: ./deploy.prod.sh [--skip-tunnel]
# ══════════════════════════════════════════════════════════════════════════════

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()    { echo -e "${GREEN}[✔]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
fail()   { echo -e "${RED}[✘]${NC} $1"; exit 1; }
info()   { echo -e "${CYAN}[→]${NC} $1"; }
header() { echo -e "\n${CYAN}── $1 ${NC}$(printf '─%.0s' $(seq 1 $((50 - ${#1}))))"; }

SKIP_TUNNEL=false
[[ "$1" == "--skip-tunnel" ]] && SKIP_TUNNEL=true

echo ""
echo "══════════════════════════════════════════════════════"
echo "   CCB — Deploy de Produção"
echo "══════════════════════════════════════════════════════"

# ── 1. Verificar dependências ─────────────────────────────────────────────────
header "Verificando dependências"

command -v docker >/dev/null 2>&1 || fail "Docker não encontrado. Instale com: curl -fsSL https://get.docker.com | sh"
docker compose version >/dev/null 2>&1 || fail "Docker Compose não encontrado."
log "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1) pronto"

# ── 2. Verificar .env.prod ────────────────────────────────────────────────────
header "Verificando variáveis de ambiente"

if [ ! -f .env.prod ]; then
  warn ".env.prod não encontrado. Criando a partir do exemplo..."
  cp .env.prod.example .env.prod
  echo ""
  echo "  Edite o arquivo .env.prod com os valores reais antes de continuar:"
  echo ""
  echo "    nano .env.prod"
  echo ""
  read -p "  Pressione ENTER após editar o .env.prod para continuar..." _
fi

# Validar variáveis obrigatórias
for VAR in MYSQL_ROOT_PASSWORD MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD JWT_SECRET; do
  val=$(grep "^${VAR}=" .env.prod | cut -d= -f2- | tr -d '"')
  if [ -z "$val" ] || echo "$val" | grep -q "troque_por"; then
    fail "Variável ${VAR} não configurada em .env.prod"
  fi
done
log "Variáveis de ambiente OK"

# ── 3. Build e subir containers ───────────────────────────────────────────────
header "Subindo containers de produção"

docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d \
  || fail "Erro ao subir os containers."

log "Containers iniciados"

# ── 4. Aguardar backend ficar saudável ────────────────────────────────────────
header "Aguardando serviços"

echo -n "  Aguardando backend"
TRIES=0
until docker inspect ccb_app --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; do
  TRIES=$((TRIES + 1))
  [ $TRIES -ge 40 ] && fail "Backend não ficou saudável. Veja: docker logs ccb_app"
  echo -n "."
  sleep 3
done
echo ""
log "Backend saudável"

# Verificar endpoint
sleep 2
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  log "API respondendo via nginx (HTTP 200)"
else
  warn "API retornou HTTP $HTTP (pode precisar de mais tempo para inicializar)"
fi

# ── 5. Configurar Cloudflare Tunnel ──────────────────────────────────────────
if [ "$SKIP_TUNNEL" = false ]; then
  header "Cloudflare Tunnel"

  if command -v cloudflared >/dev/null 2>&1; then
    log "cloudflared já instalado: $(cloudflared --version 2>&1 | head -1)"
  else
    info "Instalando cloudflared..."
    curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
      -o /tmp/cloudflared.deb
    dpkg -i /tmp/cloudflared.deb
    rm /tmp/cloudflared.deb
    log "cloudflared instalado"
  fi

  if systemctl is-active --quiet cloudflared 2>/dev/null; then
    info "Serviço cloudflared já está ativo"
    systemctl restart cloudflared
    log "Serviço cloudflared reiniciado"
  elif [ -f ~/.cloudflared/config.yml ]; then
    info "Instalando cloudflared como serviço..."
    cloudflared service install
    systemctl enable cloudflared
    systemctl start cloudflared
    log "Serviço cloudflared iniciado"
  else
    echo ""
    warn "~/.cloudflared/config.yml não encontrado. Configure o túnel manualmente:"
    echo ""
    echo "  1. Autenticar:     cloudflared tunnel login"
    echo "  2. Criar túnel:    cloudflared tunnel create ccb-presenca"
    echo "  3. Copiar config:  cp .cloudflared/config.example.yml ~/.cloudflared/config.yml"
    echo "     Edite o config.yml com o UUID e domínio corretos"
    echo "  4. Criar DNS:      cloudflared tunnel route dns ccb-presenca presenca.seudominio.com.br"
    echo "  5. Instalar:       sudo cloudflared service install && sudo systemctl start cloudflared"
    echo ""
  fi
fi

# ── 6. Resumo ─────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
echo -e "   ${GREEN}Deploy concluído!${NC}"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  Acesso local:    http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost')"
echo ""
echo "  Credenciais padrão:"
echo "    E-mail:  admin@ccb.com"
echo "    Senha:   Admin@123"
echo ""
echo "  Comandos úteis:"
echo "    Logs:          docker compose -f docker-compose.prod.yml logs -f"
echo "    Parar:         docker compose -f docker-compose.prod.yml down"
echo "    Tunnel status: sudo systemctl status cloudflared"
echo "    Tunnel logs:   sudo journalctl -u cloudflared -f"
echo "    Backup DB:     docker exec ccb_db mysqldump -u\$MYSQL_USER -p\$MYSQL_PASSWORD \$MYSQL_DATABASE > backup_\$(date +%Y%m%d).sql"
echo ""
