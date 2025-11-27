-- Migration: Split Payment System
-- Cria tabela para armazenar múltiplas formas de pagamento por venda

-- Tabela de pagamentos divididos
CREATE TABLE IF NOT EXISTS sale_payments (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índice para consultas rápidas por venda
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);

-- Índice para análise de formas de pagamento
CREATE INDEX IF NOT EXISTS idx_sale_payments_method ON sale_payments(payment_method);

-- Comentários para documentação
COMMENT ON TABLE sale_payments IS 'Armazena múltiplas formas de pagamento para uma venda (split payment)';
COMMENT ON COLUMN sale_payments.sale_id IS 'Referência para a venda';
COMMENT ON COLUMN sale_payments.payment_method IS 'Método de pagamento: cash, card, pix';
COMMENT ON COLUMN sale_payments.amount IS 'Valor pago com este método';
