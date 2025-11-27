-- Schema inicial para o sistema de comandas.
-- Execute este arquivo em um banco PostgreSQL vazio antes de rodar a aplicação.

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'waiter' CHECK (role IN ('admin', 'waiter', 'cashier', 'kitchen', 'bar')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  min_stock_level INTEGER NOT NULL,
  imageUrl TEXT,
  discount NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  station TEXT NOT NULL DEFAULT 'kitchen' CHECK (station IN ('kitchen', 'bar'))
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  table_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
  total_amount NUMERIC(10, 2),
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit', 'debit', 'pix')),
  waiter_id INTEGER REFERENCES users(id),
  cashier_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_at_time NUMERIC(10, 2) NOT NULL,
  station TEXT NOT NULL CHECK (station IN ('kitchen', 'bar')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_items_station_status_idx
  ON order_items (station, status);

CREATE INDEX IF NOT EXISTS orders_status_idx
  ON orders (status);

-- TODO(perf): Avaliar se índices em order_items(order_id), products(name) e orders(created_at) melhoram relatórios.

COMMIT;

-- Usuários padrão opcionais (descomente se quiser carregar diretamente via SQL)
-- INSERT INTO users (username, password, role) VALUES
--   ('admin', '<hash-bcrypt>', 'admin'),
--   ('waiter', '<hash-bcrypt>', 'waiter'),
--   ('cashier', '<hash-bcrypt>', 'cashier'),
--   ('kitchen', '<hash-bcrypt>', 'kitchen'),
--   ('bar', '<hash-bcrypt>', 'bar');
