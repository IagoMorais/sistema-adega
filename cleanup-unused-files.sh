#!/bin/bash

# 🗑️ Script de Limpeza de Arquivos Não Utilizados
# Data: 26/11/2025
# Autor: Sistema de Refatoração

set -e

echo "================================================"
echo "🗑️  LIMPEZA DE ARQUIVOS NÃO UTILIZADOS"
echo "================================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
REMOVED=0
FAILED=0

# Função para remover arquivo com segurança
remove_file() {
    local file="$1"
    local reason="$2"
    
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Removendo:${NC} $file"
        echo "  Motivo: $reason"
        rm "$file" && REMOVED=$((REMOVED + 1)) || FAILED=$((FAILED + 1))
        echo ""
    else
        echo -e "${RED}Arquivo não encontrado:${NC} $file"
        echo ""
    fi
}

echo "📦 Iniciando limpeza..."
echo ""

# ===================================
# COMPONENTES REACT NÃO UTILIZADOS
# ===================================
echo "🔴 Removendo componentes React não utilizados..."
echo ""

remove_file "client/src/components/shortcuts-help.tsx" "Funcionalidade não implementada"
remove_file "client/src/components/theme-toggle.tsx" "ThemeProvider já gerencia o tema"
remove_file "client/src/components/transaction-dialog.tsx" "Funcionalidade não implementada"
remove_file "client/src/components/admin-product-grid.tsx" "Substituído por ProductManagement"
remove_file "client/src/components/ItemGrid.tsx" "Sistema não usa grid de itens"
remove_file "client/src/components/ProductCard.tsx" "Sistema usa tabelas, não cards"
remove_file "client/src/components/ResponsiveTable.tsx" "Sistema usa componentes UI do shadcn"

# ===================================
# TESTES ANTIGOS
# ===================================
echo "🔴 Removendo testes antigos (substituídos)..."
echo ""

remove_file "server/tests/routes.behavior.test.ts" "Substituído por testes de integração"
remove_file "server/tests/admin-products-crud.test.ts" "Substituído por products.test.ts"
remove_file "server/tests/admin-flows.test.ts" "Substituído por testes de integração"

# ===================================
# DOCUMENTAÇÃO REDUNDANTE
# ===================================
echo "🟡 Removendo documentação redundante..."
echo ""

remove_file "ANALISE_SISTEMA.md" "Substituído por RESUMO_REFATORACAO.md"
remove_file "PLANO_IMPLEMENTACAO.md" "Substituído por FASE*_COMPLETA.md"
remove_file "QUICK_START.md" "Redundante, substituído por INSTALL.md"
remove_file "client/src/melhorarvisual.md" "Notas temporárias de CSS"

# ===================================
# ARQUIVOS TEMPORÁRIOS E LOGS
# ===================================
echo "🟡 Removendo arquivos temporários e logs..."
echo ""

remove_file "build_error.log" "Log de erro antigo"
remove_file "server.log" "Log do servidor"
remove_file "API" "Arquivo temporário sem extensão"
remove_file "client/test.html" "Arquivo de teste"
remove_file "index.js" "Projeto usa TypeScript"
remove_file "generated-icon" "Arquivo temporário"
remove_file "generated-icon.png" "Ícone temporário não utilizado"

# ===================================
# SCRIPTS REDUNDANTES
# ===================================
echo "🟡 Removendo scripts redundantes..."
echo ""

remove_file "verify-system.ts" "Redundante, substituído por npm run db:check"
remove_file "verify-system.sh" "Redundante, substituído por npm run verify"

# ===================================
# RESUMO
# ===================================
echo "================================================"
echo "📊 RESUMO DA LIMPEZA"
echo "================================================"
echo ""
echo -e "${GREEN}✅ Arquivos removidos com sucesso: $REMOVED${NC}"

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Falhas ao remover: $FAILED${NC}"
fi

echo ""
echo "================================================"

if [ $REMOVED -gt 0 ]; then
    echo -e "${GREEN}✨ Limpeza concluída!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Verificar integridade: npm run check"
    echo "2. Executar testes: npm test"
    echo "3. Atualizar .gitignore se necessário"
else
    echo -e "${YELLOW}⚠️  Nenhum arquivo foi removido${NC}"
fi

echo ""
echo "================================================"

exit 0
