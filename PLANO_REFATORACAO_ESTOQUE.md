# 📋 Plano de Refatoração - Sistema de Gestão de Estoque Local

**Data:** 26/11/2025  
**Arquiteto:** Análise Técnica Sênior  
**Versão:** 1.0

---

## 🎯 Sumário Executivo

Este documento apresenta o plano de análise e refatoração do sistema atual para garantir que está otimizado como **Sistema de Gestão de Estoque e Vendas Local**.

### Status Atual
✅ **O sistema JÁ está configurado para PostgreSQL Local**  
✅ **O schema JÁ está focado em Estoque (sem tabelas de restaurante)**  
✅ **Roles Admin/Seller JÁ estão implementados**  

### Objetivo
Documentar o estado atual, validar a arquitetura e propor melhorias para garantir Clean Code, segurança e escalabilidade.

---

## 1️⃣ Análise do Schema (AS-IS)

### 📊 Tabelas Existentes

#### ✅ **Tabelas Necessárias (Mantidas)**

```typescript
// 1. users - Autenticação e controle de acesso
users: {
  id: serial,
  username: text (unique),
  password: text (hashed),
  role: 'admin' | 'seller',
  createdAt: timestamp
}

// 2. session - Persistência de sessões Express
session: {
  sid: varchar (primary key),
  sess: json,
  expire: timestamp
}

// 3. products - Catálogo de produtos
products: {
  id: serial,
  name: text,
  brand: text,
  price: decimal(10,2),
  quantity: integer,
  minStockLevel: integer,
  imageUrl: text,
  discount: decimal(5,2),
  updatedAt: timestamp
}

// 4. stockMovements - Histórico de movimentações
stockMovements: {
  id: serial,
  productId: integer (FK),
  type: 'in' | 'out' | 'adjustment',
  quantity: integer,
  reason: text,
  userId: integer (FK),
  createdAt: timestamp
}

// 5. sales - Registro de vendas
sales: {
  id: serial,
  totalAmount: decimal(10,2),
  paymentMethod: text,
  sellerId: integer (FK),
  createdAt: timestamp
}

// 6. saleItems - Itens vendidos
saleItems: {
  id: serial,
  saleId: integer (FK),
  productId: integer (FK),
  quantity: integer,
  priceAtTime: decimal(10,2)
}
```

#### ❌ **Tabelas NÃO Encontradas (Confirmar Remoção)**
- ❌ `tables` (mesas de restaurante)
- ❌ `orders` (comandas)
- ❌ `orderItems` (itens de comanda)
- ❌ `kitchenQueue` (fila de cozinha)
- ❌ `categories` (categorias de menu)

**CONCLUSÃO:** O schema atual JÁ está limpo e focado em estoque. ✅

---

## 2️⃣ Configuração de Ambiente Local (TO-BE)

### 📦 Análise do `package.json`

#### Stack Atual
```json
{
  "runtime": "Node.js (ESM)",
  "framework": "Express 4.21",
  "database": {
    "orm": "Drizzle ORM 0.39",
    "driver": "pg 8.11.0 (PostgreSQL nativo)",
    "migration": "drizzle-kit 0.28"
  },
  "frontend": {
    "bundler": "Vite 6.2",
    "framework": "React 18.3",
    "routing": "react-router-dom 7.3",
    "query": "@tanstack/react-query 5.60",
    "ui": "Shadcn UI + Radix UI"
  },
  "validation": "Zod 3.23",
  "auth": "Passport + express-session"
}
```

#### ✅ Drivers Corretos
```json
"dependencies": {
  "pg": "^8.11.0",              // ✅ Driver nativo PostgreSQL
  "connect-pg-simple": "^10.0.0" // ✅ Session store para PG
}
```

**OBSERVAÇÃO:** Não há dependência de `@neondatabase/serverless`, o que confirma que o sistema já está configurado para PostgreSQL local. ✅

---

### 🔧 Configuração do Drizzle (`drizzle.config.ts`)

#### Configuração Atual
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
});
```

**STATUS:** ✅ Configurado corretamente para PostgreSQL local.

---

### 🌍 Variáveis de Ambiente (`.env`)

#### Configuração Atual
```env
# Conexão PostgreSQL Local
DATABASE_URL=postgresql://postgres:postgres@localhost:5442/controlhepdv

# Credenciais do Banco
POSTGRES_DB=controlhepdv
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Autenticação
SESSION_SECRET=supersecretkey

# Servidor
PORT=5002
```

#### ⚠️ Melhorias de Segurança Recomendadas

```env
# 1. Session Secret mais forte (produção)
SESSION_SECRET=GERAR_USANDO_openssl_rand_-base64_32

# 2. Senha de banco mais forte (produção)
POSTGRES_PASSWORD=SenhaForte123!@#

# 3. Configurações adicionais recomendadas
NODE_ENV=development
ALLOW_INSECURE_COOKIES=true  # Apenas em dev local
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100

# 4. Backup automático
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Diário às 2h
BACKUP_RETENTION_DAYS=30
```

---

### 🐳 Docker vs Instalação Local

O sistema suporta ambas as opções. Recomendação:

#### **Opção 1: Docker (Recomendado para Desenvolvimento)**
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: controlhepdv
    ports:
      - "5442:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

**Comandos:**
```bash
# Iniciar banco
docker-compose up -d

# Verificar status
docker-compose ps

# Logs
docker-compose logs -f postgres

# Backup manual
docker exec -t postgres pg_dump -U postgres controlhepdv > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker exec -i postgres psql -U postgres controlhepdv < backups/backup_20251126.sql

# Parar banco
docker-compose down
```

#### **Opção 2: PostgreSQL Local (Nativo)**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Configurar usuário e banco
sudo -u postgres psql
CREATE DATABASE controlhepdv;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE controlhepdv TO postgres;
\q

# Ajustar porta para 5442 (se necessário)
sudo vim /etc/postgresql/*/main/postgresql.conf
# port = 5442
sudo systemctl restart postgresql

# Backup manual
pg_dump -U postgres -h localhost -p 5442 controlhepdv > backup.sql

# Restore
psql -U postgres -h localhost -p 5442 controlhepdv < backup.sql
```

---

## 3️⃣ Implementação de Segurança

### 🔐 Análise do Sistema de Autenticação (`server/auth.ts`)

#### ✅ Implementação Atual

```typescript
// Roles definidos
export const userRoles = ["admin", "seller"] as const;

// Middleware de proteção
app.use([
  "/api/products/*/delete",
  "/api/products/create",
  "/api/admin/*"
], (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Apenas administradores" });
  }
  next();
});
```

### 📋 Matriz de Permissões (Access Control Matrix)

| **Recurso**                  | **Admin** | **Seller** | **Endpoint**                    |
|-----------------------------|-----------|------------|---------------------------------|
| **Produtos**                |           |            |                                 |
| Visualizar lista            | ✅         | ✅          | GET /api/products               |
| Visualizar detalhes         | ✅         | ✅          | GET /api/products/:id           |
| Criar produto               | ✅         | ❌          | POST /api/products/create       |
| Editar produto              | ✅         | ❌          | PUT /api/products/:id           |
| Excluir produto             | ✅         | ❌          | DELETE /api/products/:id/delete |
| **Estoque**                 |           |            |                                 |
| Visualizar movimentações    | ✅         | ✅          | GET /api/stock-movements        |
| Registrar entrada           | ✅         | ❌          | POST /api/stock-movements/in    |
| Registrar saída (venda)     | ✅         | ✅          | POST /api/sales                 |
| Ajuste manual               | ✅         | ❌          | POST /api/stock-movements/adj   |
| **Vendas**                  |           |            |                                 |
| Visualizar próprias vendas  | ✅         | ✅          | GET /api/sales/my               |
| Visualizar todas vendas     | ✅         | ❌          | GET /api/sales                  |
| Cancelar venda              | ✅         | ❌          | DELETE /api/sales/:id           |
| **Usuários**                |           |            |                                 |
| Listar usuários             | ✅         | ❌          | GET /api/admin/users            |
| Criar usuário               | ✅         | ❌          | POST /api/admin/users           |
| Editar usuário              | ✅         | ❌          | PUT /api/admin/users/:id        |
| Excluir usuário             | ✅         | ❌          | DELETE /api/admin/users/:id     |
| **Relatórios**              |           |            |                                 |
| Dashboard geral             | ✅         | ❌          | GET /api/admin/dashboard        |
| Relatório de vendas         | ✅         | ❌          | GET /api/admin/reports/sales    |
| Relatório de estoque        | ✅         | ❌          | GET /api/admin/reports/stock    |
| Baixa estoque (alerta)      | ✅         | ✅          | GET /api/products/low-stock     |

### 🛡️ Melhorias de Segurança Recomendadas

#### 1. **Middleware de Role-Based Access Control (RBAC)**

```typescript
// server/middleware/rbac.ts (CRIAR NOVO ARQUIVO)
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/schema';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      error: 'Autenticação necessária' 
    });
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Acesso negado. Roles permitidos: ${allowedRoles.join(', ')}` 
      });
    }
    
    next();
  };
}

// Uso nos endpoints
app.post('/api/products/create', 
  requireAuth, 
  requireRole('admin'), 
  createProductHandler
);

app.post('/api/sales', 
  requireAuth, 
  requireRole('admin', 'seller'), 
  createSaleHandler
);
```

#### 2. **Audit Log (Logs de Auditoria)**

```typescript
// Adicionar ao shared/schema.ts
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // 'CREATE', 'UPDATE', 'DELETE'
  resource: text("resource").notNull(), // 'product', 'sale', 'user'
  resourceId: integer("resource_id"),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Middleware para registrar ações
export async function auditLog(
  userId: number,
  action: string,
  resource: string,
  resourceId: number,
  oldValues: any,
  newValues: any,
  req: Request
) {
  await db.insert(auditLogs).values({
    userId,
    action,
    resource,
    resourceId,
    oldValues,
    newValues,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}
```

#### 3. **Validação Adicional com Zod**

```typescript
// shared/validation.ts (CRIAR NOVO ARQUIVO)
import { z } from 'zod';

// Validação de estoque negativo
export const stockAdjustmentSchema = z.object({
  productId: z.number().int().positive(),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().int().positive(),
  reason: z.string().min(5, 'Motivo deve ter pelo menos 5 caracteres'),
}).refine(
  (data) => {
    // Validação customizada: saídas devem ter motivo detalhado
    if (data.type === 'out' && data.reason.length < 10) {
      return false;
    }
    return true;
  },
  {
    message: 'Saídas de estoque requerem motivo detalhado (mín. 10 caracteres)',
    path: ['reason']
  }
);

// Validação de preço
export const priceValidation = z.number()
  .min(0.01, 'Preço deve ser maior que zero')
  .max(999999.99, 'Preço máximo excedido')
  .multipleOf(0.01, 'Preço deve ter no máximo 2 casas decimais');
```

---

## 4️⃣ Plano de Implementação Técnico

### 🎯 Roadmap de Refatoração (5 Etapas)

---

### **ETAPA 1: Validação e Otimização do Schema** ✅

**Objetivo:** Garantir que o schema está otimizado e sem resquícios de sistema anterior.

#### Tarefas:
- [ ] Adicionar tabela `audit_logs` para rastreabilidade
- [ ] Adicionar campo `isActive` na tabela `users`
- [ ] Adicionar campo `category` na tabela `products` (opcional)
- [ ] Criar índices para performance
- [ ] Executar migrations

#### Índices Recomendados:
```sql
-- Performance para queries frequentes
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);
CREATE INDEX idx_sales_seller ON sales(seller_id);
CREATE INDEX idx_sales_created ON sales(created_at DESC);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_products_low_stock ON products(quantity) WHERE quantity <= min_stock_level;
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

#### Script de Migration:
```typescript
// migrations/001_add_audit_and_indexes.ts
import { sql } from 'drizzle-orm';
import { db } from '../server/db';

export async function up() {
  // Criar tabela audit_logs
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id INTEGER,
      old_values JSONB,
      new_values JSONB,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  
  // Criar índices
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_id)`);
  // ... outros índices
}

export async function down() {
  await db.execute(sql`DROP TABLE IF EXISTS audit_logs CASCADE`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_stock_movements_product`);
  // ... outros índices
}
```

**Comando:**
```bash
npm run db:push  # Aplicar mudanças no banco
```

**Estimativa:** 2 horas  
**Criticidade:** Média

---

### **ETAPA 2: Implementação de RBAC e Segurança** 🔐

**Objetivo:** Criar sistema robusto de controle de acesso baseado em roles.

#### Tarefas:
- [ ] Criar `server/middleware/rbac.ts`
- [ ] Criar `server/middleware/rate-limit.ts`
- [ ] Criar `server/middleware/audit-log.ts`
- [ ] Atualizar `server/routes.ts` com novos middlewares
- [ ] Criar testes de permissões em `server/tests/rbac.test.ts`

#### Exemplo de Implementação:

```typescript
// server/middleware/rbac.ts
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/schema';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      error: 'Autenticação necessária' 
    });
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Acesso negado. Roles permitidos: ${allowedRoles.join(', ')}` 
      });
    }
    
    next();
  };
}
```

```typescript
// server/routes.ts (REFATORAR)
import { requireAuth, requireRole } from './middleware/rbac';
import { adminRateLimit, sellerRateLimit } from './middleware/rate-limit';

// Produtos - Admin apenas
app.post('/api/products/create', 
  requireAuth, 
  requireRole('admin'), 
  adminRateLimit,
  async (req, res) => {
    // ... lógica de criação
  }
);

// Vendas - Admin e Seller
app.post('/api/sales', 
  requireAuth, 
  requireRole('admin', 'seller'),
  sellerRateLimit,
  async (req, res) => {
    // ... lógica de venda
  }
);
```

**Estimativa:** 4 horas  
**Criticidade:** Alta

---

### **ETAPA 3: Otimização de Queries e Performance** ⚡

**Objetivo:** Garantir que o sistema seja rápido e escalável.

#### Tarefas:
- [ ] Implementar paginação em todas as listagens
- [ ] Otimizar queries com JOINs usando Drizzle
- [ ] Adicionar cache de consultas frequentes (opcional: Redis)
- [ ] Criar views para relatórios complexos

#### Exemplo de Query Otimizada:

```typescript
// server/storage.ts (MELHORAR)
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';

// Query otimizada com JOIN
export async function getSalesWithDetails(
  startDate: Date,
  endDate: Date,
  limit: number = 50,
  offset: number = 0
) {
  return db
    .select({
      sale: sales,
      seller: {
        id: users.id,
        username: users.username,
      },
      items: sql<number>`COUNT(${saleItems.id})`,
      totalItems: sql<number>`SUM(${saleItems.quantity})`,
    })
    .from(sales)
    .leftJoin(users, eq(sales.sellerId, users.id))
    .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
    .where(
      and(
        gte(sales.createdAt, startDate),
        lte(sales.createdAt, endDate)
      )
    )
    .groupBy(sales.id, users.id, users.username)
    .orderBy(desc(sales.createdAt))
    .limit(limit)
    .offset(offset);
}

// Produtos com baixo estoque (otimizado com índice)
export async function getLowStockProducts() {
  return db
    .select()
    .from(products)
    .where(sql`${products.quantity} <= ${products.minStockLevel}`)
    .orderBy(products.quantity);
}
```

#### Paginação no Frontend:

```typescript
// client/src/hooks/use-sales.tsx
import { useQuery } from '@tanstack/react-query';

export function useSales(page: number = 1, pageSize: number = 20) {
  return useQuery({
    queryKey: ['sales', page, pageSize],
    queryFn: async () => {
      const res = await fetch(
        `/api/sales?page=${page}&limit=${pageSize}`
      );
      return res.json();
    },
    keepPreviousData: true,
    staleTime: 60000, // Cache de 1 minuto
  });
}
```

**Estimativa:** 6 horas  
**Criticidade:** Média

---

### **ETAPA 4: Testes e Qualidade de Código** 🧪

**Objetivo:** Garantir cobertura de testes e code quality.

#### Tarefas:
- [ ] Configurar ESLint + Prettier
- [ ] Criar testes unitários para validações Zod
- [ ] Criar testes de integração para endpoints críticos
- [ ] Criar testes E2E para fluxos principais
- [ ] Configurar CI/CD básico (GitHub Actions)

#### Estrutura de Testes:

```
server/tests/
├── unit/
│   ├── validation.test.ts       # Testes de schemas Zod
│   ├── utils.test.ts             # Testes de funções utilitárias
│   └── rbac.test.ts              # Testes de permissões
├── integration/
│   ├── products.test.ts          # CRUD de produtos
│   ├── sales.test.ts             # Fluxo de vendas
│   └── stock-movements.test.ts   # Movimentações
└── e2e/
    ├── admin-flow.test.ts        # Fluxo completo admin
    └── seller-flow.test.ts       # Fluxo completo vendedor
```

#### Exemplo de Teste:

```typescript
// server/tests/integration/sales.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('Sales API', () => {
  let adminToken: string;
  let sellerToken: string;
  let productId: number;

  beforeAll(async () => {
    // Setup: criar produto e autenticar usuários
    adminToken = await getAuthToken('admin', 'admin123');
    sellerToken = await getAuthToken('seller1', 'seller123');
    
    const productRes = await request(app)
      .post('/api/products/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Produto Teste',
        brand: 'Marca Teste',
        price: 10.00,
        quantity: 100,
        minStockLevel: 10
      });
    
    productId = productRes.body.id;
  });

  it('should allow seller to create sale', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        paymentMethod: 'cash',
        items: [
          { productId, quantity: 2 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.totalAmount).toBe('20.00');
  });

  it('should update product quantity after sale', async () => {
    const productRes = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(productRes.body.quantity).toBe(98); // 100 - 2
  });

  it('should NOT allow seller to delete sale', async () => {
    const res = await request(app)
      .delete('/api/sales/1')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(403);
  });
});
```

**Comandos:**
```bash
npm test                    # Todos os testes
npm test -- sales.test.ts   # Teste específico
npm test -- --coverage      # Com cobertura
npm run test:watch          # Modo watch
```

**Estimativa:** 8 horas  
**Criticidade:** Alta

---

### **ETAPA 5: Documentação e Deploy** 📚

**Objetivo:** Documentar sistema e preparar para produção.

#### Tarefas:
- [ ] Gerar documentação Swagger/OpenAPI automática
- [ ] Criar manual do usuário (Admin e Seller)
- [ ] Documentar processo de backup e restore
- [ ] Criar script de deploy
- [ ] Configurar variáveis de ambiente para produção

#### Swagger/OpenAPI:

```typescript
// server/routes.ts (ADICIONAR COMENTÁRIOS JSDoc)
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Lista todos os produtos
 *     tags: [Produtos]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Lista de produtos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *       401:
 *         description: Não autenticado
 */
app.get('/api/products', requireAuth, async (req, res) => {
  // ... lógica
});
```

#### Script de Deploy:

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Iniciando deploy..."

# 1. Backup do banco antes do deploy
echo "📦 Criando backup..."
npm run backup

# 2. Pull das últimas mudanças
echo "📥 Atualizando código..."
git pull origin main

# 3. Instalar dependências
echo "📦 Instalando dependências..."
npm ci --production

# 4. Build do projeto
echo "🔨 Compilando aplicação..."
npm run build

# 5. Executar migrations
echo "🗄️  Executando migrations..."
npm run db:push

# 6. Restart do serviço
echo "🔄 Reiniciando serviço..."
pm2 restart sistemavenda

echo "✅ Deploy concluído com sucesso!"
```

#### Backup Automatizado:

```bash
#!/bin/bash
# scripts/auto-backup.sh

BACKUP_DIR="/var/backups/sistemavenda"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Fazer backup
pg_dump -U postgres -h localhost -p 5442 controlhepdv | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

echo "✅ Backup criado: backup_$DATE.sql.gz"

# Remover backups antigos
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "🧹 Backups antigos removidos (retenção: $RETENTION_DAYS dias)"
```

**Configurar Cron Job:**
```bash
# Editar crontab
crontab -e

# Adicionar linha para backup diário às 2h
0 2 * * * /path/to/scripts/auto-backup.sh >> /var/log/sistemavenda-backup.log 2>&1
```

**Estimativa:** 6 horas  
**Criticidade:** Média

---

## 5️⃣ Resumo e Checklist Final

### ✅ Validações Concluídas

| Item | Status | Observação |
|------|--------|------------|
| Schema focado em Estoque | ✅ | Sem tabelas de restaurante |
| PostgreSQL Local | ✅ | Driver `pg` configurado |
| Roles Admin/Seller | ✅ | Implementado no schema e auth |
| Validação com Zod | ✅ | Schemas de validação criados |
| TypeScript estrito | ✅ | Tipagem completa |
| Express + Drizzle | ✅ | Stack moderna e robusta |
| Frontend React + Vite | ✅ | Performance otimizada |

---

### 📋 Checklist de Implementação

#### **Curto Prazo (1-2 semanas)**
- [ ] **ETAPA 1:** Adicionar tabela audit_logs e índices
- [ ] **ETAPA 2:** Implementar RBAC com middlewares
- [ ] Atualizar documentação de endpoints
- [ ] Criar testes básicos de permissões

#### **Médio Prazo (3-4 semanas)**
- [ ] **ETAPA 3:** Otimizar queries e adicionar paginação
- [ ] **ETAPA 4:** Cobertura de testes (mínimo 70%)
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Melhorar tratamento de erros

#### **Longo Prazo (1-2 meses)**
- [ ] **ETAPA 5:** Documentação completa (Swagger + Manuais)
- [ ] Sistema de backup automatizado
- [ ] Monitoramento e logs centralizados
- [ ] Preparação para produção

---

### 🎯 Próximos Passos Imediatos

1. **Validar o ambiente atual:**
   ```bash
   npm run verify    # Verificar sistema
   npm run db:check  # Verificar banco
   npm test          # Rodar testes existentes
   ```

2. **Revisar código existente:**
   - Ler `server/routes.ts` para entender endpoints
   - Analisar `server/storage.ts` para ver queries
   - Verificar `client/src/pages/` para UI existente

3. **Priorizar melhorias:**
   - Começar pela ETAPA 1 (Schema + Índices)
   - Implementar RBAC (ETAPA 2) - **Alta Prioridade**
   - Adicionar testes (ETAPA 4) - **Crítico**

---

### 📊 Estimativa de Tempo Total

| Etapa | Horas | Prioridade |
|-------|-------|------------|
| Etapa 1: Schema | 2h | Média |
| Etapa 2: RBAC | 4h | Alta |
| Etapa 3: Performance | 6h | Média |
| Etapa 4: Testes | 8h | Alta |
| Etapa 5: Docs | 6h | Média |
| **TOTAL** | **26h** | - |

**Estimativa:** 3-4 semanas (considerando 8h/dia útil)

---

### 🔗 Recursos Adicionais

#### Documentação Oficial
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Zod Validation](https://zod.dev/)
- [Passport.js](http://www.passportjs.org/docs/)
- [React Query](https://tanstack.com/query/latest)
- [Shadcn UI](https://ui.shadcn.com/)

#### Boas Práticas
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [REST API Design](https://restfulapi.net/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

## 📝 Conclusão

### Situação Atual
O sistema **já está bem estruturado** como Sistema de Gestão de Estoque Local:
- ✅ PostgreSQL Local configurado corretamente
- ✅ Schema focado em produtos, estoque e vendas
- ✅ Roles de Admin e Seller implementados
- ✅ Stack moderna (Node.js, Express, React, Drizzle, Zod)

### Melhorias Recomendadas
As 5 etapas propostas visam **otimização e hardening**:
1. **Auditoria:** Rastreamento de todas as ações
2. **Segurança:** RBAC granular e rate limiting
3. **Performance:** Queries otimizadas e cache
4. **Qualidade:** Testes automatizados
5. **Documentação:** Swagger e manuais

### Decisão Técnica
**NÃO é necessária uma refatoração completa**, mas sim:
- Melhorias incrementais de segurança
- Otimizações de performance
- Adição de testes
- Documentação técnica

O sistema atual tem uma base sólida e pode evoluir gradualmente seguindo as etapas propostas.

---

**Documento criado por:** Arquiteto de Software Sênior  
**Data:** 26/11/2025  
**Versão:** 1.0  
**Status:** Pronto para Implementação ✅
