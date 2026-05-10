# Deploy — Proxmox + Cloudflare Tunnel

Deploy do CCB Presença em uma VM Proxmox com HTTPS automático via Cloudflare Tunnel, sem abrir portas no roteador.

---

## Pré-requisitos

- VM ou CT no Proxmox com Ubuntu 22.04 LTS (2GB RAM mínimo, 20GB disco)
- Domínio com DNS gerenciado pelo Cloudflare
- Acesso SSH ao servidor

---

## Parte 1 — Preparar a VM

```bash
ssh root@IP-DA-VM

apt update && apt upgrade -y
```

---

## Parte 2 — Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh

# Verificar
docker --version
docker compose version
```

---

## Parte 3 — Transferir o projeto

**Via Git (recomendado):**
```bash
apt install git -y
git clone <url-do-repo> /opt/ccb
cd /opt/ccb
```

**Via SCP da máquina local:**
```bash
scp -r /caminho/local/precenca-ccb root@IP-DA-VM:/opt/ccb
```

---

## Parte 4 — Configurar variáveis de ambiente

```bash
cd /opt/ccb
cp .env.prod.example .env.prod
nano .env.prod
```

Gere senhas e o JWT_SECRET:
```bash
openssl rand -base64 64
```

`.env.prod` preenchido:
```
MYSQL_ROOT_PASSWORD=SenhaRootForte123!
MYSQL_DATABASE=ccb
MYSQL_USER=ccb_user
MYSQL_PASSWORD=SenhaUserForte456!
JWT_SECRET=<valor gerado pelo openssl>
JWT_EXPIRES_IN=7d
```

---

## Parte 5 — Subir a aplicação

```bash
./deploy.prod.sh --skip-tunnel
```

Confirme que está tudo no ar:
```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost/api/health
# Esperado: {"status":"ok","timestamp":"..."}
```

---

## Parte 6 — Configurar o Cloudflare Tunnel

**6.1 Instalar o cloudflared:**
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
dpkg -i cloudflared.deb
```

**6.2 Autenticar** (gera um link — abra no browser e autorize):
```bash
cloudflared tunnel login
```

**6.3 Criar o tunnel:**
```bash
cloudflared tunnel create ccb-presenca
```

Anote o **UUID** exibido (ex: `a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

**6.4 Configurar:**
```bash
cp /opt/ccb/.cloudflared/config.example.yml ~/.cloudflared/config.yml
nano ~/.cloudflared/config.yml
```

Substitua o UUID e o domínio:
```yaml
tunnel: a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx
credentials-file: /root/.cloudflared/a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx.json

ingress:
  - hostname: presenca.seudominio.com.br
    service: http://localhost:80
  - service: http_status:404
```

**6.5 Criar o registro DNS:**
```bash
cloudflared tunnel route dns ccb-presenca presenca.seudominio.com.br
```

**6.6 Testar antes de instalar como serviço:**
```bash
cloudflared tunnel run ccb-presenca
```

Acesse `https://presenca.seudominio.com.br` no browser. Se funcionar, `Ctrl+C` e continue.

**6.7 Instalar como serviço (auto-start com o servidor):**
```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
systemctl status cloudflared
```

---

## Parte 7 — Verificar

```bash
# Containers
docker compose -f docker-compose.prod.yml ps

# API via domínio
curl https://presenca.seudominio.com.br/api/health

# Logs do tunnel
journalctl -u cloudflared -f

# Logs da aplicação
docker compose -f docker-compose.prod.yml logs -f
```

Acesse `https://presenca.seudominio.com.br` e faça login:

| Campo | Valor |
|---|---|
| E-mail | `admin@ccb.com` |
| Senha | `Admin@123` |

> Troque a senha do admin imediatamente após o primeiro acesso.

---

## Manutenção

**Atualizar após mudanças no código:**
```bash
cd /opt/ccb
git pull
./deploy.prod.sh --skip-tunnel
```

**Backup do banco:**
```bash
cd /opt/ccb
source .env.prod
docker exec ccb_db mysqldump -u$MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE > backup_$(date +%Y%m%d).sql
```

**Se o servidor reiniciar**, containers e tunnel sobem automaticamente — nenhuma ação necessária.

---

## Comandos úteis

| Comando | Descrição |
|---|---|
| `docker compose -f docker-compose.prod.yml logs -f` | Logs em tempo real |
| `docker compose -f docker-compose.prod.yml down` | Parar tudo |
| `docker compose -f docker-compose.prod.yml restart app` | Reiniciar só o backend |
| `sudo journalctl -u cloudflared -f` | Logs do tunnel |
| `sudo systemctl restart cloudflared` | Reiniciar tunnel após mudar config.yml |
| `cloudflared tunnel list` | Listar tunnels criados |

---

## Arquitetura

```
Internet
   │
   ▼
Cloudflare (HTTPS automático)
   │
   ▼
cloudflared (serviço no host Proxmox)
   │
   ▼ localhost:80
nginx (ccb_frontend)
   ├── /* → arquivos estáticos do React
   └── /api/* → proxy interno → ccb_app:3000 → ccb_db:3306
```

Apenas a porta 80 fica no host. DB e backend não são expostos externamente.
