# Funcionalidades de Gerenciamento de Vendas

## 📋 Resumo das Implementações

Este documento descreve as novas funcionalidades implementadas no sistema de vendas da Adega.

## ✅ Funcionalidades Implementadas

### 1. **Alteração de Forma de Pagamento**

#### Quem Pode Usar
- ✅ Vendedores (sellers) - apenas suas próprias vendas
- ✅ Administradores (admins) - todas as vendas

#### Como Funciona
- Após finalizar uma venda, é possível alterar a forma de pagamento (cash/card/pix)
- Apenas vendas **ATIVAS** podem ter o pagamento alterado
- Todas as alterações são registradas no histórico
- O histórico mantém: forma antiga, forma nova, quem alterou e quando

#### Onde Está
- **Vendedor**: Na tela de vendas, coluna lateral "Vendas Recentes" → Botão "Alterar Pagamento"
- **Admin**: Dashboard → Aba "Vendas" → Clicar na venda

#### Endpoint
```
PATCH /api/sales/:id/payment-method
Body: { "paymentMethod": "cash" | "card" | "pix" }
```

---

### 2. **Cancelamento de Vendas**

#### Quem Pode Usar
- ❌ Vendedores - **NÃO** podem cancelar vendas
- ✅ Administradores - **EXCLUSIVO** para admins

#### Como Funciona
- Admin pode cancelar qualquer venda ativa
- **Obrigatório** informar motivo do cancelamento (mínimo 5 caracteres)
- Produtos retornam automaticamente ao estoque
- Movimentação de estoque é registrada com motivo "Cancelamento da venda #X"
- Venda fica marcada como CANCELADA e não pode mais ser alterada
- Sistema registra: quem cancelou, quando e o motivo

#### Onde Está
- **Admin**: Dashboard → Aba "Vendas" → Botão vermelho com ícone X ao lado de vendas ativas

#### Endpoint
```
POST /api/sales/:id/cancel
Body: { "reason": "Motivo do cancelamento..." }
```

---

### 3. **Admin como Vendedor**

#### Como Funciona
- Admin tem acesso completo à tela de vendas (mesma interface do vendedor)
- Botão "Realizar Venda" no topo do dashboard
- Admin pode fazer vendas normalmente
- Vendas ficam registradas com o ID do admin como vendedor

#### Onde Está
- **Admin**: Dashboard → Botão "Realizar Venda" no cabeçalho
- Redireciona para `/seller` (mesma tela dos vendedores)

---

## 🗄️ Mudanças no Banco de Dados

### Tabela `sales` - Novas Colunas
```sql
status TEXT DEFAULT 'active'           -- 'active' ou 'cancelled'
cancelled_by INTEGER                   -- ID do admin que cancelou
cancelled_at TIMESTAMP                 -- Data/hora do cancelamento
cancel_reason TEXT                     -- Motivo do cancelamento
```

### Nova Tabela `sales_payment_history`
```sql
id SERIAL PRIMARY KEY
sale_id INTEGER                        -- Referência à venda
old_payment_method TEXT                -- Forma antiga
new_payment_method TEXT                -- Forma nova
changed_by INTEGER                     -- Quem alterou
changed_at TIMESTAMP                   -- Quando alterou
```

### Migração SQL
O arquivo `scripts/migration-sales-enhancements.sql` contém todas as alterações necessárias.

---

## 🔒 Segurança e Validações

### Permissões Implementadas
- ✅ Vendedores só veem/alteram suas próprias vendas
- ✅ Admin vê e gerencia todas as vendas
- ✅ Apenas admin pode cancelar vendas
- ✅ Sistema valida status da venda antes de qualquer operação

### Validações
- ✅ Não é possível alterar pagamento de venda cancelada
- ✅ Não é possível cancelar venda já cancelada
- ✅ Motivo de cancelamento obrigatório (mín. 5 caracteres)
- ✅ Produtos retornam ao estoque corretamente
- ✅ Estoque não fica negativo em cancelamentos

### Auditoria
- ✅ Todas alterações de pagamento são auditadas
- ✅ Todos cancelamentos são auditados
- ✅ Histórico de alterações de pagamento mantido permanentemente
- ✅ Movimentações de estoque registradas

---

## 🎨 Interface do Usuário

### Tela do Vendedor (`/seller`)
- Layout em 3 colunas (em telas grandes):
  1. **Produtos** - Catálogo de produtos
  2. **Carrinho** - Itens selecionados
  3. **Vendas Recentes** - Últimas 10 vendas com botão de editar pagamento

### Dashboard Admin (`/dashboard`)
- Duas abas principais:
  1. **Produtos** - Gerenciamento de produtos (já existia)
  2. **Vendas** - Nova aba com:
     - Listagem de todas as vendas
     - Filtro visual por status (badge)
     - Botão de cancelamento (apenas vendas ativas)
     - Informações: ID, data, vendedor, total, pagamento, status

### Dialogs/Modais
- **Alteração de Pagamento**: Mostra forma atual e permite selecionar nova
- **Cancelamento**: Exige motivo e mostra aviso sobre devolução ao estoque

---

## 📊 Estatísticas

### Impacto nas Estatísticas
- Vendas canceladas **NÃO** entram nas estatísticas de receita
- Query de stats foi atualizada para filtrar apenas vendas ativas
- Vendas canceladas ainda aparecem na listagem (com badge "Cancelada")

---

## 🧪 Como Testar

### Teste 1: Alteração de Pagamento (Vendedor)
1. Login como vendedor
2. Realizar uma venda
3. Na coluna "Vendas Recentes", clicar em "Alterar Pagamento"
4. Selecionar nova forma de pagamento
5. Confirmar
6. ✅ Verificar que pagamento foi alterado

### Teste 2: Alteração de Pagamento (Admin)
1. Login como admin
2. Ir para Dashboard → Aba "Vendas"
3. Localizar uma venda ativa
4. Tentar alterar pagamento
5. ✅ Deve funcionar para qualquer venda

### Teste 3: Cancelamento (Admin)
1. Login como admin
2. Dashboard → Aba "Vendas"
3. Clicar no botão X vermelho em uma venda ativa
4. Inserir motivo do cancelamento
5. Confirmar
6. ✅ Verificar que:
   - Venda aparece como "Cancelada"
   - Produtos voltaram ao estoque
   - Botão de cancelar desapareceu

### Teste 4: Permissões
1. Login como vendedor
2. Tentar acessar venda de outro vendedor
3. ✅ Deve retornar erro 403 (Acesso Negado)

### Teste 5: Validações
1. Tentar alterar pagamento de venda cancelada
2. ✅ Deve retornar erro
3. Tentar cancelar venda já cancelada
4. ✅ Deve retornar erro
5. Tentar cancelar sem motivo
6. ✅ Botão deve ficar desabilitado

---

## 📝 Endpoints Criados/Modificados

### Novos Endpoints
```
GET    /api/sales/:id                    - Buscar venda específica
PATCH  /api/sales/:id/payment-method     - Alterar forma de pagamento
POST   /api/sales/:id/cancel             - Cancelar venda (admin)
```

### Endpoints Modificados
```
GET    /api/sales                        - Agora filtra por vendedor (se seller)
```

---

## 🚀 Próximos Passos Sugeridos

1. **Relatórios**
   - Adicionar relatório de vendas canceladas
   - Gráfico de formas de pagamento ao longo do tempo

2. **Histórico Detalhado**
   - Tela para visualizar histórico completo de alterações de uma venda
   - Incluir itens da venda no histórico

3. **Notificações**
   - Notificar vendedor quando admin alterar/cancelar sua venda

4. **Exportação**
   - Exportar relatório de vendas em CSV/PDF
   - Incluir vendas canceladas em relatórios

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verificar logs de auditoria em `/api/admin/audit-logs`
2. Conferir histórico de alterações na tabela `sales_payment_history`
3. Validar movimentações de estoque na tabela `stock_movements`

---

**Implementado em**: 26/11/2025
**Versão**: 2.0.0
**Status**: ✅ Completo e Testado
