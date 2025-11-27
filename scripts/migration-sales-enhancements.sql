-- Migration: Add sale status, cancellation fields, and payment history table
-- Date: 2025-11-26
-- Description: Adds functionality for payment method changes and sale cancellations

-- Add new columns to sales table
ALTER TABLE sales 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Add check constraint for status
ALTER TABLE sales 
  DROP CONSTRAINT IF EXISTS sales_status_check;

ALTER TABLE sales
  ADD CONSTRAINT sales_status_check 
  CHECK (status IN ('active', 'cancelled'));

-- Create sales_payment_history table
CREATE TABLE IF NOT EXISTS sales_payment_history (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  old_payment_method TEXT NOT NULL,
  new_payment_method TEXT NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_cancelled_by ON sales(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_sales_payment_history_sale_id ON sales_payment_history(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_history_changed_by ON sales_payment_history(changed_by);

-- Update existing sales to have 'active' status (already set by default, but ensuring consistency)
UPDATE sales SET status = 'active' WHERE status IS NULL OR status = '';

COMMENT ON TABLE sales_payment_history IS 'Histórico de alterações de forma de pagamento das vendas';
COMMENT ON COLUMN sales.status IS 'Status da venda: active ou cancelled';
COMMENT ON COLUMN sales.cancelled_by IS 'ID do usuário que cancelou a venda';
COMMENT ON COLUMN sales.cancelled_at IS 'Data e hora do cancelamento';
COMMENT ON COLUMN sales.cancel_reason IS 'Motivo do cancelamento da venda';
