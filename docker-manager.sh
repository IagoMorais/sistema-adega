#!/bin/bash

# Script de gerenciamento Docker para Sistema de Vendas
# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções auxiliares
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Verificar se Docker está instalado
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker não está instalado!"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose não está instalado!"
        exit 1
    fi
    
    print_success "Docker está instalado e funcionando"
}

# Criar diretórios necessários
create_directories() {
    print_info "Criando diretórios necessários..."
    mkdir -p uploads backups
    chmod 777 uploads backups
    print_success "Diretórios criados"
}

# Build das imagens
build() {
    print_info "Construindo imagens Docker..."
    docker-compose build --no-cache
    if [ $? -eq 0 ]; then
        print_success "Build concluído com sucesso"
    else
        print_error "Falha no build"
        exit 1
    fi
}

# Iniciar containers
start() {
    print_info "Iniciando containers..."
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        print_success "Containers iniciados"
        print_info "Aguardando inicialização completa..."
        sleep 10
        
        # Verificar health
        check_health
    else
        print_error "Falha ao iniciar containers"
        exit 1
    fi
}

# Parar containers
stop() {
    print_info "Parando containers..."
    docker-compose stop
    print_success "Containers parados"
}

# Parar e remover containers
down() {
    print_info "Parando e removendo containers..."
    docker-compose down
    print_success "Containers removidos"
}

# Restart completo
restart() {
    print_info "Reiniciando sistema..."
    stop
    start
}

# Ver logs
logs() {
    local service=${1:-app}
    print_info "Mostrando logs do serviço: $service"
    docker-compose logs -f "$service"
}

# Status dos containers
status() {
    print_info "Status dos containers:"
    docker-compose ps
}

# Health check
check_health() {
    print_info "Verificando saúde da aplicação..."
    
    # Aguardar um pouco para a aplicação iniciar
    sleep 5
    
    # Verificar se o container está rodando
    if ! docker-compose ps | grep -q "inventory-app-v2.*Up"; then
        print_error "Container da aplicação não está rodando"
        return 1
    fi
    
    # Verificar endpoint de health
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:5002/api/health > /dev/null 2>&1; then
            print_success "Aplicação está saudável!"
            print_success "Acesse: http://localhost:5002"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo ""
    print_error "Aplicação não respondeu ao health check"
    print_info "Verificando logs para diagnóstico..."
    docker-compose logs --tail=50 app
    return 1
}

# Backup do banco de dados
backup() {
    print_info "Criando backup do banco de dados..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="backups/backup_${timestamp}.sql"
    
    docker-compose exec -T db pg_dump -U postgres controlhepdv > "$backup_file"
    
    if [ $? -eq 0 ]; then
        print_success "Backup criado: $backup_file"
    else
        print_error "Falha ao criar backup"
        exit 1
    fi
}

# Restaurar banco de dados
restore() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_error "Especifique o arquivo de backup"
        echo "Uso: $0 restore <arquivo_backup>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Arquivo de backup não encontrado: $backup_file"
        exit 1
    fi
    
    print_warning "Isso irá sobrescrever o banco de dados atual!"
    read -p "Tem certeza? (s/N) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_info "Operação cancelada"
        exit 0
    fi
    
    print_info "Restaurando banco de dados..."
    docker-compose exec -T db psql -U postgres controlhepdv < "$backup_file"
    
    if [ $? -eq 0 ]; then
        print_success "Banco de dados restaurado"
    else
        print_error "Falha ao restaurar banco de dados"
        exit 1
    fi
}

# Limpar tudo (containers, volumes, imagens)
clean() {
    print_warning "Isso irá remover TODOS os containers, volumes e imagens!"
    read -p "Tem certeza? (s/N) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_info "Operação cancelada"
        exit 0
    fi
    
    print_info "Removendo containers..."
    docker-compose down -v
    
    print_info "Removendo imagens..."
    docker rmi $(docker images | grep 'inventory-app\|postgres' | awk '{print $3}') 2>/dev/null
    
    print_success "Limpeza concluída"
}

# Executar comando no container
exec_cmd() {
    local service=${1:-app}
    shift
    docker-compose exec "$service" "$@"
}

# Shell interativo no container
shell() {
    local service=${1:-app}
    print_info "Abrindo shell no container: $service"
    docker-compose exec "$service" /bin/sh
}

# Informações do sistema
info() {
    print_info "Informações do Sistema Docker"
    echo ""
    echo "=== Status dos Containers ==="
    docker-compose ps
    echo ""
    echo "=== Uso de Recursos ==="
    docker stats --no-stream inventory-app-v2 inventory-db 2>/dev/null
    echo ""
    echo "=== Volumes ==="
    docker volume ls | grep sistemavenda
    echo ""
    echo "=== Rede ==="
    docker network ls | grep sistemavenda
}

# Instalação completa do zero
install() {
    print_info "Iniciando instalação completa..."
    
    check_docker
    create_directories
    
    print_info "Parando containers existentes..."
    docker-compose down -v 2>/dev/null
    
    build
    start
    
    print_success "Instalação concluída!"
    print_info "Usuário padrão:"
    print_info "  Username: admin"
    print_info "  Password: admin123"
}

# Atualização (rebuild e restart)
update() {
    print_info "Atualizando sistema..."
    
    backup
    stop
    build
    start
    
    print_success "Sistema atualizado!"
}

# Menu de ajuda
show_help() {
    cat << EOF
${BLUE}Sistema de Vendas - Gerenciador Docker${NC}

${GREEN}Uso:${NC} $0 [comando] [opções]

${GREEN}Comandos Principais:${NC}
  install           Instalação completa do zero
  start             Inicia os containers
  stop              Para os containers
  restart           Reinicia os containers
  down              Para e remove os containers
  update            Atualiza o sistema (rebuild + restart)

${GREEN}Gerenciamento:${NC}
  build             Constrói as imagens Docker
  status            Mostra status dos containers
  health            Verifica saúde da aplicação
  logs [serviço]    Mostra logs (padrão: app)
  info              Mostra informações detalhadas

${GREEN}Banco de Dados:${NC}
  backup            Cria backup do banco de dados
  restore <arquivo> Restaura banco de dados do backup

${GREEN}Desenvolvimento:${NC}
  shell [serviço]   Abre shell no container (padrão: app)
  exec <serviço> <cmd>  Executa comando no container
  clean             Remove tudo (containers, volumes, imagens)

${GREEN}Exemplos:${NC}
  $0 install                    # Instalação completa
  $0 logs app                   # Ver logs da aplicação
  $0 backup                     # Criar backup
  $0 restore backups/backup.sql # Restaurar backup
  $0 shell db                   # Shell no container do banco

${GREEN}Acesso:${NC}
  Aplicação: http://localhost:5002
  Banco de dados: localhost:5442

EOF
}

# Main
main() {
    case "${1:-help}" in
        install)
            install
            ;;
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        down)
            down
            ;;
        build)
            build
            ;;
        logs)
            logs "${2:-app}"
            ;;
        status)
            status
            ;;
        health)
            check_health
            ;;
        backup)
            backup
            ;;
        restore)
            restore "$2"
            ;;
        clean)
            clean
            ;;
        exec)
            shift
            exec_cmd "$@"
            ;;
        shell)
            shell "${2:-app}"
            ;;
        info)
            info
            ;;
        update)
            update
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Comando desconhecido: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
