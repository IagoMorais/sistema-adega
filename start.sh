#!/usr/bin/env bash
# start.sh - Script unificado para Sistema de Gestão ControlhePDV
# Versão: 2.0.0
# Última atualização: 31/10/2025

set -euo pipefail

# === CONFIGURAÇÕES GLOBAIS ===
SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_ROOT"

VERSION="2.0.0"
NODE_MIN_VERSION="18"
POSTGRES_MIN_VERSION="16"

# Variáveis de ambiente
export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-3001}"
export DEV_USE_POLLING="${DEV_USE_POLLING:-1}"
export DEV_POLLING_INTERVAL="${DEV_POLLING_INTERVAL:-150}"

# === CORES PARA OUTPUT ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# === FUNÇÕES DE LOGGING ===
log() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"
}

success() {
  echo -e "${GREEN}✅ $*${NC}"
}

warning() {
  echo -e "${YELLOW}⚠️  $*${NC}"
}

error() {
  echo -e "${RED}❌ $*${NC}" >&2
}

info() {
  echo -e "${CYAN}ℹ️  $*${NC}"
}

# === FUNÇÕES DE VERIFICAÇÃO ===
check_command() {
  if command -v "$1" >/dev/null 2>&1; then
    success "$1 está instalado"
    return 0
  else
    error "$1 não está instalado"
    return 1
  fi
}

check_node_version() {
  local version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  if [[ "$version" -ge "$NODE_MIN_VERSION" ]]; then
    success "Node.js v$(node --version | cut -d'v' -f2) (requerido: v$NODE_MIN_VERSION+)"
    return 0
  else
    error "Node.js v$version (requerido: v$NODE_MIN_VERSION+)"
    return 1
  fi
}

check_env_file() {
  if [[ -f .env ]]; then
    success "Arquivo .env encontrado"
    return 0
  else
    warning "Arquivo .env não encontrado"
    if [[ -f .env.example ]]; then
      log "Criando .env a partir de .env.example..."
      cp .env.example .env
      success "Arquivo .env criado"
      warning "⚠️  IMPORTANTE: Configure o arquivo .env antes de continuar!"
      info "Execute: nano .env"
      return 1
    else
      error ".env.example não encontrado"
      return 1
    fi
  fi
}

# === FUNÇÕES DOCKER ===
detect_docker() {
  if command -v docker >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1; then
      DOCKER_COMPOSE_CMD="docker compose"
      success "Docker Compose (v2) detectado"
      return 0
    elif command -v docker-compose >/dev/null 2>&1; then
      DOCKER_COMPOSE_CMD="docker-compose"
      success "Docker Compose (v1) detectado"
      return 0
    fi
  fi
  
  warning "Docker Compose não encontrado"
  return 1
}

start_postgres_docker() {
  log "Iniciando PostgreSQL com Docker..."
  
  if ! detect_docker; then
    error "Docker não está disponível"
    info "Instale Docker ou configure PostgreSQL local"
    return 1
  fi
  
  # Verificar se já está rodando
  if docker ps | grep -q "postgres\|db"; then
    success "PostgreSQL já está rodando"
    return 0
  fi
  
  # Iniciar container
  $DOCKER_COMPOSE_CMD up -d db
  
  # Aguardar estar pronto
  log "Aguardando PostgreSQL iniciar..."
  for i in {1..30}; do
    if docker ps -q -f name=db | xargs -I {} docker exec {} pg_isready >/dev/null 2>&1; then
      success "PostgreSQL pronto"
      return 0
    fi
    sleep 1
  done
  
  error "PostgreSQL não iniciou corretamente"
  return 1
}

# === FUNÇÕES DE DEPENDÊNCIAS ===
install_deps() {
  if [[ -d node_modules ]]; then
    log "Dependências já instaladas"
    return 0
  fi
  
  log "Instalando dependências..."
  npm install
  success "Dependências instaladas"
}

# === FUNÇÕES DE BANCO DE DADOS ===
init_database() {
  log "Verificando banco de dados..."
  
  # Verificar se pode conectar
  if npm run db:check >/dev/null 2>&1; then
    success "Banco de dados OK"
    return 0
  fi
  
  log "Inicializando schema do banco..."
  npm run db:push
  success "Schema criado"
  
  return 0
}

# === FUNÇÕES DE BACKUP ===
perform_backup() {
  source .env 2>/dev/null || true
  
  if [[ -z "${DATABASE_URL:-}" ]]; then
    warning "DATABASE_URL não configurado, pulando backup"
    return 1
  fi
  
  if ! command -v pg_dump >/dev/null 2>&1; then
    warning "pg_dump não encontrado, pulando backup"
    return 1
  fi
  
  mkdir -p backups
  local timestamp=$(date '+%Y%m%d_%H%M%S')
  local backup_file="backups/backup_${timestamp}.sql"
  
  log "Criando backup..."
  if pg_dump "${DATABASE_URL}" > "${backup_file}"; then
    success "Backup criado: ${backup_file}"
    
    # Manter apenas últimos 10 backups
    ls -t backups/backup_*.sql 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    
    return 0
  else
    error "Falha ao criar backup"
    rm -f "${backup_file}"
    return 1
  fi
}

# === COMANDOS PRINCIPAIS ===

cmd_dev() {
  log "🚀 Iniciando em modo DESENVOLVIMENTO"
  echo ""
  
  # Verificações
  check_command node || exit 1
  check_node_version || exit 1
  check_env_file || exit 1
  
  # Dependências
  install_deps || exit 1
  
  # Docker (opcional)
  if [[ "${1:-}" != "--no-docker" ]]; then
    start_postgres_docker || warning "Usando PostgreSQL local"
    sleep 2
  fi
  
  # Inicializar banco
  init_database || exit 1
  
  # Iniciar servidor
  success "Sistema pronto!"
  info "URL: http://localhost:$PORT"
  info "API Docs: http://localhost:$PORT/api-docs"
  info "Pressione Ctrl+C para encerrar (backup automático)"
  echo ""
  
  # Trap para backup ao sair
  trap 'echo ""; perform_backup; exit 0' INT TERM
  
  npm run dev
}

cmd_prod() {
  log "🚀 Iniciando em modo PRODUÇÃO"
  echo ""
  
  export NODE_ENV=production
  
  # Verificações
  check_command node || exit 1
  check_node_version || exit 1
  check_env_file || exit 1
  
  # Verificar variáveis obrigatórias
  source .env
  if [[ -z "${DATABASE_URL:-}" ]]; then
    error "DATABASE_URL não configurado"
    exit 1
  fi
  if [[ "${SESSION_SECRET:-}" == "troque-este-valor-para-algo-bem-seguro" ]]; then
    error "SESSION_SECRET não foi alterado!"
    exit 1
  fi
  
  # Dependências
  install_deps || exit 1
  
  # Build
  log "Fazendo build..."
  npm run build || exit 1
  success "Build concluído"
  
  # Inicializar banco
  init_database || exit 1
  
  # Iniciar
  success "Sistema pronto!"
  info "URL: http://localhost:$PORT"
  echo ""
  
  npm start
}

cmd_test() {
  log "🧪 Executando TESTES"
  echo ""
  
  check_command node || exit 1
  install_deps || exit 1
  
  # Testes unitários
  log "Testes unitários..."
  npm test || warning "Alguns testes falharam"
  
  # Testes de integração (endpoints)
  if [[ "${1:-}" == "--integration" ]]; then
    log "Testes de integração..."
    
    # Iniciar servidor em background
    npm run dev > /tmp/test-server.log 2>&1 &
    local server_pid=$!
    
    sleep 5
    
    # Testar endpoints
    log "Testando endpoints..."
    
    test_endpoint() {
      local url=$1
      local expected=$2
      local desc=$3
      
      local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
      if [[ "$status" == "$expected" ]]; then
        success "$desc: $status"
      else
        error "$desc: $status (esperado: $expected)"
      fi
    }
    
    test_endpoint "http://localhost:$PORT/" "200" "GET /"
    test_endpoint "http://localhost:$PORT/api/health" "200" "GET /api/health"
    test_endpoint "http://localhost:$PORT/api-docs" "301" "GET /api-docs"
    
    # Matar servidor
    kill $server_pid 2>/dev/null || true
  fi
  
  success "Testes concluídos"
}

cmd_verify() {
  log "🔍 VERIFICANDO SISTEMA COMPLETO"
  echo ""
  
  local errors=0
  
  # Node.js
  echo "=== Node.js ==="
  check_command node || ((errors++))
  check_command npm || ((errors++))
  check_node_version || ((errors++))
  echo ""
  
  # Docker
  echo "=== Docker ==="
  if check_command docker; then
    if docker ps >/dev/null 2>&1; then
      success "Docker está rodando"
    else
      warning "Docker instalado mas não está rodando"
    fi
    detect_docker || true
  else
    warning "Docker não instalado (opcional)"
  fi
  echo ""
  
  # Git
  echo "=== Git ==="
  check_command git || warning "Git não instalado (recomendado)"
  echo ""
  
  # Arquivos
  echo "=== Arquivos ==="
  [[ -f package.json ]] && success "package.json" || { error "package.json não encontrado"; ((errors++)); }
  [[ -f docker-compose.yml ]] && success "docker-compose.yml" || warning "docker-compose.yml não encontrado"
  [[ -f .env ]] && success ".env" || warning ".env não encontrado"
  [[ -f .env.example ]] && success ".env.example" || warning ".env.example não encontrado"
  echo ""
  
  # Dependências
  echo "=== Dependências ==="
  if [[ -d node_modules ]]; then
    success "node_modules instalado"
  else
    warning "node_modules não encontrado"
    info "Execute: ./start.sh install"
  fi
  echo ""
  
  # Banco de dados
  echo "=== Banco de Dados ==="
  if check_env_file; then
    source .env 2>/dev/null || true
    if [[ -n "${DATABASE_URL:-}" ]]; then
      success "DATABASE_URL configurado"
      
      if command -v psql >/dev/null 2>&1; then
        if psql "${DATABASE_URL}" -c "SELECT 1;" >/dev/null 2>&1; then
          success "Conexão com PostgreSQL OK"
        else
          error "Falha ao conectar ao PostgreSQL"
          ((errors++))
        fi
      else
        warning "psql não instalado, pulando teste de conexão"
      fi
    else
      error "DATABASE_URL não configurado"
      ((errors++))
    fi
  fi
  echo ""
  
  # Resumo
  echo "=== RESUMO ==="
  if [[ $errors -eq 0 ]]; then
    success "Sistema verificado com sucesso! ✨"
    info "Execute: ./start.sh dev"
  else
    error "$errors erro(s) encontrado(s)"
    info "Corrija os erros acima antes de continuar"
    return 1
  fi
}

cmd_backup() {
  log "💾 CRIANDO BACKUP MANUAL"
  echo ""
  
  perform_backup
}

cmd_clean() {
  log "🧹 LIMPANDO ARQUIVOS TEMPORÁRIOS"
  echo ""
  
  read -p "Isso vai remover node_modules e arquivos de build. Continuar? (s/N) " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[SsYy]$ ]]; then
    [[ -d node_modules ]] && rm -rf node_modules && success "node_modules removido"
    [[ -d dist ]] && rm -rf dist && success "dist removido"
    [[ -d client/dist ]] && rm -rf client/dist && success "client/dist removido"
    [[ -f server.log ]] && rm -f server.log && success "server.log removido"
    
    success "Limpeza concluída"
    info "Execute: ./start.sh install"
  else
    info "Operação cancelada"
  fi
}

cmd_logs() {
  log "📋 MOSTRANDO LOGS"
  echo ""
  
  if [[ -f server.log ]]; then
    tail -f server.log
  else
    warning "server.log não encontrado"
    info "Execute o servidor primeiro: ./start.sh dev"
  fi
}

cmd_install() {
  log "📦 INSTALAÇÃO INICIAL"
  echo ""
  
  # Verificações
  check_command node || exit 1
  check_node_version || exit 1
  check_command npm || exit 1
  
  # Criar .env
  if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
      cp .env.example .env
      success ".env criado"
      
      # Gerar SESSION_SECRET aleatório
      if command -v openssl >/dev/null 2>&1; then
        local secret=$(openssl rand -base64 32)
        if [[ "$OSTYPE" == "darwin"* ]]; then
          sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$secret/" .env
        else
          sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$secret/" .env
        fi
        success "SESSION_SECRET gerado automaticamente"
      fi
    else
      error ".env.example não encontrado"
      exit 1
    fi
  else
    success ".env já existe"
  fi
  
  # Instalar dependências
  install_deps || exit 1
  
  success "Instalação concluída!"
  info "Próximo passo: ./start.sh verify"
}

cmd_help() {
  cat << 'EOF'
╔════════════════════════════════════════════════════════════╗
║     Sistema de Gestão ControlhePDV - Script Unificado     ║
╚════════════════════════════════════════════════════════════╝

USAGE:
  ./start.sh [COMANDO] [OPÇÕES]

COMANDOS:
  dev, development    Inicia em modo desenvolvimento (padrão)
  prod, production    Inicia em modo produção
  test                Executa testes
  verify, check       Verifica todo o sistema
  backup              Cria backup manual do banco
  clean               Limpa arquivos temporários
  logs                Mostra logs do servidor
  install             Instalação inicial do projeto
  help                Mostra esta ajuda
  version             Mostra versão do script

OPÇÕES:
  --no-docker         Não usar Docker (usar PostgreSQL local)
  --integration       Executar testes de integração (com test)

EXEMPLOS:
  ./start.sh                    # Inicia em modo desenvolvimento
  ./start.sh dev                # Mesmo que acima
  ./start.sh prod               # Inicia em produção
  ./start.sh test               # Executa testes unitários
  ./start.sh test --integration # Testes unitários + integração
  ./start.sh verify             # Verifica sistema completo
  ./start.sh backup             # Backup manual
  ./start.sh clean              # Limpa temporários
  ./start.sh dev --no-docker    # Usa PostgreSQL local

PRIMEIRO USO:
  1. ./start.sh install         # Configuração inicial
  2. ./start.sh verify          # Verificar sistema
  3. nano .env                  # Configurar variáveis
  4. ./start.sh dev             # Iniciar desenvolvimento

MAIS INFORMAÇÕES:
  README.md                     Documentação completa
  INSTALL.md                    Guia de instalação
  TROUBLESHOOTING.md            Solução de problemas
  ANALISE_SISTEMA.md            Análise técnica
  PLANO_IMPLEMENTACAO.md        Plano de implementação

CREDENCIAIS PADRÃO:
  Usuário: admin
  Senha: admin123
  ⚠️  Altere a senha após o primeiro login!

SUPORTE:
  GitHub: github.com/seu-projeto/issues
EOF
}

cmd_version() {
  echo "Sistema de Gestão ControlhePDV - start.sh"
  echo "Versão: $VERSION"
  echo "Node.js: $(node --version 2>/dev/null || echo 'não instalado')"
  echo "npm: $(npm --version 2>/dev/null || echo 'não instalado')"
  
  if command -v docker >/dev/null 2>&1; then
    echo "Docker: $(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',' || echo 'não instalado')"
  fi
}

# === MAIN ===
main() {
  case "${1:-dev}" in
    dev|development)     cmd_dev "${@:2}" ;;
    prod|production)     cmd_prod "${@:2}" ;;
    test)                cmd_test "${@:2}" ;;
    verify|check)        cmd_verify "${@:2}" ;;
    backup)              cmd_backup "${@:2}" ;;
    clean)               cmd_clean "${@:2}" ;;
    logs)                cmd_logs "${@:2}" ;;
    install)             cmd_install "${@:2}" ;;
    help|--help|-h)      cmd_help ;;
    version|--version)   cmd_version ;;
    *)                   error "Comando desconhecido: $1" && cmd_help && exit 1 ;;
  esac
}

main "$@"
