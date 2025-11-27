#!/bin/bash
# Script de Deploy Rápido para VPS Ubuntu 20.04
# Sistema de Vendas - Adega Palácio
# Domínio: conecata-palacio.vps-kinghost.net

set -e  # Parar em caso de erro

echo "🚀 INICIANDO DEPLOY NA VPS..."
echo "================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para print colorido
print_step() {
    echo -e "${GREEN}[PASSO $1]${NC} $2"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================
# PARTE 1: ATUALIZAR SISTEMA
# ============================================
print_step "1" "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# ============================================
# PARTE 2: INSTALAR DOCKER
# ============================================
print_step "2" "Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "Docker instalado com sucesso!"
else
    echo "Docker já está instalado"
fi

# ============================================
# PARTE 3: INSTALAR DOCKER COMPOSE
# ============================================
print_step "3" "Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose instalado com sucesso!"
else
    echo "Docker Compose já está instalado"
fi

# ============================================
# PARTE 4: INSTALAR GIT
# ============================================
print_step "4" "Instalando Git..."
sudo apt install git -y

# ============================================
# PARTE 5: INSTALAR NGINX
# ============================================
print_step "5" "Instalando Nginx..."
sudo apt install nginx -y

# ============================================
# PARTE 6: INSTALAR CERTBOT
# ============================================
print_step "6" "Instalando Certbot..."
sudo apt install certbot python3-certbot-nginx -y

# ============================================
# PARTE 7: CONFIGURAR FIREWALL
# ============================================
print_step "7" "Configurando Firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable

# ============================================
# PARTE 8: CRIAR SWAP
# ============================================
print_step "8" "Configurando SWAP (2GB)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    sudo sysctl vm.swappiness=10
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    echo "SWAP configurado com sucesso!"
else
    echo "SWAP já existe"
fi

# ============================================
# PARTE 9: OBTER CERTIFICADO SSL
# ============================================
print_step "9" "Configurando SSL..."
print_warning "ATENÇÃO: Você precisa informar seu e-mail para o certificado SSL"
echo -n "Digite seu e-mail: "
read EMAIL

sudo systemctl stop nginx

sudo certbot certonly --standalone \
    -d conecata-palacio.vps-kinghost.net \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive

# ============================================
# PARTE 10: CONFIGURAR NGINX
# ============================================
print_step "10" "Configurando Nginx..."

sudo tee /etc/nginx/sites-available/sistema-vendas > /dev/null <<'EOF'
server {
    listen 80;
    server_name conecata-palacio.vps-kinghost.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name conecata-palacio.vps-kinghost.net;

    ssl_certificate /etc/letsencrypt/live/conecata-palacio.vps-kinghost.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/conecata-palacio.vps-kinghost.net/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;

    proxy_connect_timeout 600;
    proxy_send_timeout 600;
    proxy_read_timeout 600;
    send_timeout 600;

    location / {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    access_log /var/log/nginx/sistema-vendas-access.log;
    error_log /var/log/nginx/sistema-vendas-error.log;
}
EOF

sudo ln -sf /etc/nginx/sites-available/sistema-vendas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx

# ============================================
# PARTE 11: CONFIGURAR RENOVAÇÃO SSL
# ============================================
print_step "11" "Configurando renovação automática de SSL..."
(sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | sudo crontab -

# ============================================
# PARTE 12: CRIAR SCRIPT DE MONITORAMENTO
# ============================================
print_step "12" "Criando script de monitoramento..."

tee ~/monitor.sh > /dev/null <<'EOF'
#!/bin/bash
LOG_FILE="/var/log/sistema-vendas-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

if curl -s http://localhost:5002/api/health | grep -q "ok"; then
    echo "[$DATE] ✓ Aplicação OK" >> $LOG_FILE
else
    echo "[$DATE] ✗ APLICAÇÃO FORA DO AR!" >> $LOG_FILE
    cd ~/sistema-vendas && docker-compose restart app
fi

MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
echo "[$DATE] Memória: ${MEM_USAGE}%" >> $LOG_FILE

DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
echo "[$DATE] Disco: ${DISK_USAGE}%" >> $LOG_FILE

if [ $DISK_USAGE -gt 85 ]; then
    echo "[$DATE] ⚠️  ALERTA: Disco quase cheio!" >> $LOG_FILE
fi
EOF

chmod +x ~/monitor.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/monitor.sh") | crontab -

# ============================================
# INFORMAÇÕES FINAIS
# ============================================
echo ""
echo "================================"
print_step "✅" "INSTALAÇÃO BÁSICA CONCLUÍDA!"
echo "================================"
echo ""
print_warning "PRÓXIMOS PASSOS MANUAIS:"
echo ""
echo "1. Enviar arquivos do projeto para ~/sistema-vendas"
echo "   Opções:"
echo "   a) Via SCP do seu computador:"
echo "      scp -r /caminho/do/projeto usuario@conecata-palacio.vps-kinghost.net:~/sistema-vendas"
echo ""
echo "   b) Via Git:"
echo "      cd ~ && git clone <sua-url-do-repo> sistema-vendas"
echo ""
echo "2. Criar arquivo .env no diretório ~/sistema-vendas"
echo "   cd ~/sistema-vendas"
echo "   nano .env"
echo ""
echo "   Conteúdo do .env:"
echo "   DATABASE_URL=postgresql://postgres:SuaSenhaForte123!@db:5432/controlhepdv"
echo "   POSTGRES_DB=controlhepdv"
echo "   POSTGRES_USER=postgres"
echo "   POSTGRES_PASSWORD=SuaSenhaForte123!"
echo "   POSTGRES_PORT=5442"
echo "   NODE_ENV=production"
echo "   PORT=5002"
echo "   SESSION_SECRET=sua-chave-secreta-muito-longa-e-aleatoria"
echo "   ALLOW_INSECURE_COOKIES=false"
echo ""
echo "3. Criar diretórios e dar permissões:"
echo "   cd ~/sistema-vendas"
echo "   mkdir -p uploads backups"
echo "   chmod 777 uploads"
echo "   chmod +x *.sh 2>/dev/null || true"
echo ""
echo "4. Iniciar a aplicação:"
echo "   cd ~/sistema-vendas"
echo "   docker-compose build"
echo "   docker-compose up -d"
echo ""
echo "5. Verificar logs:"
echo "   docker-compose logs -f"
echo ""
echo "6. Acessar o sistema:"
echo "   https://conecata-palacio.vps-kinghost.net"
echo ""
echo "================================"
print_step "📊" "COMANDOS ÚTEIS:"
echo "================================"
echo "Ver status: docker-compose ps"
echo "Ver logs: docker-compose logs -f"
echo "Reiniciar: docker-compose restart"
echo "Parar: docker-compose down"
echo "Backup DB: docker-compose exec db pg_dump -U postgres controlhepdv > backup.sql"
echo ""
print_warning "IMPORTANTE: Altere as senhas no arquivo .env!"
echo ""
