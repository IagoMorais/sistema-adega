-- Índices para melhorar performance
-- Execute com: psql $DATABASE_URL -f scripts/add-indexes.sql
-- ou: npm run db:push (que vai aplicar as mudanças do schema)

-- Índices para Stock Movements (consultas frequentes por produto e data)
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON stock_movements(user_id);

-- Índices para Sales (consultas por vendedor e data)
CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(payment_method);

-- Índices para Sale Items (JOIN com produtos e vendas)
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- Índices para Products (busca por baixo estoque e nome)
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(quantity) WHERE quantity <= min_stock_level;
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- Índices para Users (busca por username e role)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Índices para Audit Logs (consultas por usuário e data)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Índice composto para consultas complexas
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_seller_date ON sales(seller_id, created_at DESC);

-- View para produtos com baixo estoque (otimizada)
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  p.*,
  (p.quantity::float / NULLIF(p.min_stock_level, 0)) as stock_ratio
FROM products p
WHERE p.quantity <= p.min_stock_level
ORDER BY p.quantity ASC, stock_ratio ASC;

-- View para estatísticas de vendas por vendedor
CREATE OR REPLACE VIEW seller_stats AS
SELECT 
  u.id,
  u.username,
  u.role,
  COUNT(s.id) as total_sales,
  COALESCE(SUM(s.total_amount), 0) as total_revenue,
  COALESCE(AVG(s.total_amount), 0) as avg_sale_value,
  DATE(MAX(s.created_at)) as last_sale_date
FROM users u
LEFT JOIN sales s ON u.id = s.seller_id
WHERE u.role IN ('admin', 'seller')
GROUP BY u.id, u.username, u.role;

-- Comentários para documentação
COMMENT ON TABLE audit_logs IS 'Tabela de auditoria para rastreamento de todas as ações do sistema';
COMMENT ON COLUMN audit_logs.action IS 'Ação realizada: CREATE, UPDATE, DELETE';
COMMENT ON COLUMN audit_logs.resource IS 'Recurso afetado: product, sale, user';
COMMENT ON COLUMN audit_logs.old_values IS 'Valores antes da modificação (JSON)';
COMMENT ON COLUMN audit_logs.new_values IS 'Valores após a modificação (JSON)';

COMMENT ON VIEW low_stock_products IS 'View otimizada para produtos com estoque abaixo do mínimo';
COMMENT ON VIEW seller_stats IS 'Estatísticas de vendas por vendedor';
