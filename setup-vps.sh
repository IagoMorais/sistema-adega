#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

# Verificar root
if [ "$EUID" -ne 0 ]; then 
    print_error "Por favor, execute como root"
    exit 1
fi

print_info "Iniciando configuração do VPS..."

# 1. Atualizar sistema e instalar ferramentas base
print_info "Atualizando pacotes e instalando ferramentas base..."
apt update && apt upgrade -y
apt install -y curl wget git nano unzip htop
print_success "Sistema atualizado e ferramentas instaladas"

# 2. Configurar Swap (2GB)
print_info "Verificando Swap..."
if [ $(free | awk '/^Swap:/ {exit !$2}') ]; then
    print_info "Swap já existe. Pulando criação."
else
    print_info "Criando arquivo de Swap de 2GB..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    
    # Ajustar swappiness
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' | tee -a /etc/sysctl.conf
    print_success "Swap de 2GB criado e configurado"
fi

# 3. Configurar Firewall (UFW)
print_info "Configurando Firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5002/tcp
ufw --force enable
print_success "Firewall configurado"

# 4. Instalar Docker (se necessário)
if ! command -v docker &> /dev/null; then
    print_info "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    print_success "Docker instalado"
else
    print_success "Docker já está instalado"
fi

# 5. Instalar Docker Compose (se necessário)
if ! command -v docker-compose &> /dev/null; then
    print_info "Instalando Docker Compose..."
    apt install -y docker-compose-plugin
    print_success "Docker Compose instalado"
fi

print_success "Configuração do VPS concluída!"
print_info "Agora você pode executar ./docker-manager.sh install"
