import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import {
  insertProductSchema,
  insertUserSchema,
  createSaleSchema,
  createSaleSplitSchema,
  updatePaymentMethodSchema,
  cancelSaleSchema,
} from "@shared/schema";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { hashPassword } from "./utils";

// Novos middlewares de segurança
import { 
  requireAuth, 
  requireRole, 
  requireAdmin, 
  requireSeller,
  addUserContext,
  logAccess
} from "./middleware/rbac";
import { 
  smartRateLimit,
  authRateLimit,
  reportsRateLimit,
  criticalRateLimit
} from "./middleware/rate-limit";
import {
  auditMiddleware,
  auditAuth,
  auditView,
  createAuditLog,
  captureOldValues
} from "./middleware/audit-log";

// Middlewares antigos (manter para compatibilidade temporária)
const ensureAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Usuário não autenticado" });
};

const requireRoles = (roles: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Aplicar middlewares globais de segurança
  app.use(addUserContext); // Adicionar contexto do usuário
  app.use(smartRateLimit); // Rate limiting inteligente

  // Health check (público)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Login com rate limiting e auditoria
  app.post("/api/login", 
    authRateLimit,
    auditAuth('LOGIN'), 
    (req, res, next) => {
      // O middleware de auth será aplicado pelo setupAuth
      next();
    }
  );

  // Logout com autenticação e auditoria
  app.post("/api/logout",
    requireAuth,
    auditAuth('LOGOUT'),
    (req, res, next) => {
      next();
    }
  );

  // Global Auth Middleware for /api routes (except public ones)
  app.use("/api", (req, res, next) => {
    const publicPaths = ["/api/setup-admin", "/api/login", "/api/health"];
    const fullPath = `/api${req.path}`;
    if (publicPaths.includes(fullPath)) {
      return next();
    }
    requireAuth(req, res, next);
  });

  // ======================
  // ENDPOINTS DE USUÁRIOS
  // ======================

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: Lista todos os usuários (Admin apenas)
   *     tags: [Usuários]
   *     security:
   *       - sessionAuth: []
   */
  app.get("/api/users", 
    requireAdmin,
    auditView('users', true), // Dados sensíveis
    logAccess('users'),
    async (_req, res) => {
      const users = await storage.getUsers();
      const safeUsers = users.map(({ password: _password, ...rest }) => rest);
      res.json(safeUsers);
    }
  );

  /**
   * @swagger
   * /api/admin/users:
   *   post:
   *     summary: Cria novo usuário (Admin apenas)
   *     tags: [Usuários]
   */
  app.post("/api/admin/users", 
    requireAdmin,
    auditMiddleware('users', 'CREATE'),
    logAccess('users'),
    async (req, res) => {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: result.error.flatten(),
        });
      }

      const existingUser = await storage.getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }

      try {
        const hashedPassword = await hashPassword(result.data.password);
        
        // Criar usuário sem o campo confirmPassword
        const userData = {
          username: result.data.username,
          password: hashedPassword,
          role: result.data.role,
        };

        const newUser = await storage.createUser(userData as any);

        const { password, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ message: "Erro ao criar usuário" });
      }
    }
  );

  // ======================
  // ENDPOINTS DE PRODUTOS
  // ======================

  /**
   * @swagger
   * /api/products:
   *   get:
   *     summary: Lista todos os produtos
   *     tags: [Produtos]
   */
  app.get("/api/products", 
    requireSeller, // Admin ou Seller
    auditView('products'),
    async (req, res) => {
      const items = await storage.getProducts();
      res.json(items);
    }
  );

  app.get("/api/products/:id", 
    requireSeller,
    auditView('products'),
    async (req, res) => {
      const productId = Number(req.params.id);
      if (Number.isNaN(productId)) return res.status(400).json({ message: "ID inválido" });

      const item = await storage.getProduct(productId);
      if (!item) return res.status(404).json({ message: "Produto não encontrado" });

      res.json(item);
    }
  );

  /**
   * @swagger
   * /api/products:
   *   post:
   *     summary: Cria novo produto (Admin apenas)
   *     tags: [Produtos]
   */
  app.post("/api/products", 
    requireAdmin,
    auditMiddleware('products', 'CREATE'),
    logAccess('products'),
    async (req, res) => {
      const result = insertProductSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(result.error);
      }

      const product = await storage.createProduct({
        ...result.data,
        createdBy: req.user!.id,
      });
      res.status(201).json(product);
    }
  );

  app.patch("/api/products/:id", 
    requireAdmin,
    captureOldValues(async (req) => {
      const id = Number(req.params.id);
      return await storage.getProduct(id);
    }),
    auditMiddleware('products', 'UPDATE'),
    logAccess('products'),
    async (req, res) => {
      const id = Number(req.params.id);
      try {
        const updated = await storage.updateProduct(id, req.body);
        res.json(updated);
      } catch (error) {
        res.status(400).json({ message: error instanceof Error ? error.message : "Erro ao atualizar" });
      }
    }
  );

  app.delete("/api/products/:id", 
    requireAdmin,
    captureOldValues(async (req) => {
      const id = Number(req.params.id);
      return await storage.getProduct(id);
    }),
    auditMiddleware('products', 'DELETE'),
    logAccess('products'),
    async (req, res) => {
      await storage.deleteProduct(Number(req.params.id));
      res.sendStatus(204);
    }
  );

  // ======================
  // ENDPOINTS DE VENDAS
  // ======================

  /**
   * @swagger
   * /api/sales:
   *   post:
   *     summary: Registra nova venda (Admin e Seller)
   *     tags: [Vendas]
   */
  app.post("/api/sales", 
    requireSeller, // Admin ou Seller
    auditMiddleware('sales', 'CREATE'),
    logAccess('sales'),
    async (req, res) => {
      const result = createSaleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Dados de venda inválidos",
          errors: result.error.flatten()
        });
      }

      try {
        const sale = await storage.createSale({
          ...result.data,
          sellerId: req.user!.id,
        });
        res.status(201).json(sale);
      } catch (error) {
        res.status(400).json({ message: error instanceof Error ? error.message : "Erro ao realizar venda" });
      }
    }
  );

  /**
   * @swagger
   * /api/sales-split:
   *   post:
   *     summary: Registra nova venda com pagamento dividido (Admin e Seller)
   *     tags: [Vendas]
   */
  app.post("/api/sales-split",
    requireSeller, // Admin ou Seller
    auditMiddleware('sales', 'CREATE'),
    logAccess('sales'),
    async (req, res) => {
      const result = createSaleSplitSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Dados de venda inválidos",
          errors: result.error.flatten()
        });
      }

      try {
        // Calcular total dos itens
        const itemsTotal = await storage.calculateSaleTotal(result.data.items);
        
        // Calcular soma dos pagamentos
        const paymentsTotal = result.data.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );

        // Validar que os totais correspondem (com tolerância de 0.01 para arredondamento)
        if (Math.abs(itemsTotal - paymentsTotal) > 0.01) {
          return res.status(400).json({
            message: `Soma dos pagamentos (R$ ${paymentsTotal.toFixed(2)}) não corresponde ao total da venda (R$ ${itemsTotal.toFixed(2)})`,
          });
        }

        const sale = await storage.createSaleSplit({
          items: result.data.items,
          payments: result.data.payments,
          sellerId: req.user!.id,
        });

        res.status(201).json(sale);
      } catch (error) {
        res.status(400).json({
          message: error instanceof Error ? error.message : "Erro ao realizar venda"
        });
      }
    }
  );

  /**
   * @swagger
   * /api/sales:
   *   get:
   *     summary: Lista todas as vendas
   *     tags: [Vendas]
   */
  app.get("/api/sales", 
    requireSeller, // Admin ou Seller podem ver vendas
    auditView('sales', true), // Dados sensíveis
    logAccess('sales'),
    async (req, res) => {
      const sales = await (storage as any).getSalesManual();
      
      // Se for seller, filtrar apenas suas vendas
      if (req.user!.role === 'seller') {
        const filteredSales = sales.filter((sale: any) => sale.sellerId === req.user!.id);
        return res.json(filteredSales);
      }
      
      // Admin vê todas as vendas
      res.json(sales);
    }
  );

  /**
   * @swagger
   * /api/sales/:id:
   *   get:
   *     summary: Busca uma venda específica
   *     tags: [Vendas]
   */
  app.get("/api/sales/:id",
    requireSeller,
    auditView('sales', true),
    logAccess('sales'),
    async (req, res) => {
      const saleId = Number(req.params.id);
      if (Number.isNaN(saleId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const sale = await storage.getSale(saleId);
      if (!sale) {
        return res.status(404).json({ message: "Venda não encontrada" });
      }

      // Verificar permissão: seller só pode ver suas próprias vendas
      if (req.user!.role === 'seller' && sale.sellerId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      res.json(sale);
    }
  );

  /**
   * @swagger
   * /api/sales/:id/payment-method:
   *   patch:
   *     summary: Altera forma de pagamento de uma venda
   *     tags: [Vendas]
   */
  app.patch("/api/sales/:id/payment-method",
    requireSeller, // Admin ou Seller
    captureOldValues(async (req) => {
      const id = Number(req.params.id);
      return await storage.getSale(id);
    }),
    auditMiddleware('sales', 'UPDATE'),
    logAccess('sales'),
    async (req, res) => {
      const saleId = Number(req.params.id);
      if (Number.isNaN(saleId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const result = updatePaymentMethodSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: result.error.flatten(),
        });
      }

      try {
        // Verificar se a venda existe e se o usuário tem permissão
        const sale = await storage.getSale(saleId);
        if (!sale) {
          return res.status(404).json({ message: "Venda não encontrada" });
        }

        // Seller só pode alterar suas próprias vendas
        if (req.user!.role === 'seller' && sale.sellerId !== req.user!.id) {
          return res.status(403).json({ message: "Acesso negado" });
        }

        const updatedSale = await storage.updateSalePaymentMethod(
          saleId,
          result.data,
          req.user!.id
        );

        res.json(updatedSale);
      } catch (error) {
        res.status(400).json({
          message: error instanceof Error ? error.message : "Erro ao alterar forma de pagamento"
        });
      }
    }
  );

  /**
   * @swagger
   * /api/sales/:id/cancel:
   *   post:
   *     summary: Cancela uma venda (Admin apenas)
   *     tags: [Vendas]
   */
  app.post("/api/sales/:id/cancel",
    requireAdmin, // Apenas Admin
    captureOldValues(async (req) => {
      const id = Number(req.params.id);
      return await storage.getSale(id);
    }),
    auditMiddleware('sales', 'DELETE'), // Cancelamento é tratado como DELETE na auditoria
    logAccess('sales'),
    async (req, res) => {
      const saleId = Number(req.params.id);
      if (Number.isNaN(saleId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const result = cancelSaleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: result.error.flatten(),
        });
      }

      try {
        const cancelledSale = await storage.cancelSale(
          saleId,
          result.data,
          req.user!.id
        );

        res.json(cancelledSale);
      } catch (error) {
        res.status(400).json({
          message: error instanceof Error ? error.message : "Erro ao cancelar venda"
        });
      }
    }
  );

  // ======================
  // ENDPOINTS DE RELATÓRIOS
  // ======================

  /**
   * @swagger
   * /api/stats:
   *   get:
   *     summary: Estatísticas gerais (Admin apenas)
   *     tags: [Relatórios]
   */
  app.get("/api/stats", 
    requireAdmin,
    reportsRateLimit, // Rate limit específico para relatórios
    auditView('stats', true), // Dados sensíveis
    logAccess('stats'),
    async (_req, res) => {
      const stats = await storage.getSalesStats();
      res.json(stats);
    }
  );

  // Endpoint para logs de auditoria (Admin apenas)
  app.get("/api/admin/audit-logs",
    requireAdmin,
    reportsRateLimit,
    auditView('audit-logs', true),
    logAccess('audit-logs'),
    async (req, res) => {
      try {
        const { getAuditReport } = await import("./middleware/audit-log");
        const logs = await getAuditReport({
          limit: Number(req.query.limit) || 100,
          offset: Number(req.query.offset) || 0,
          userId: req.query.userId ? Number(req.query.userId) : undefined,
          resource: req.query.resource as string,
          action: req.query.action as string,
        });
        res.json(logs);
      } catch (error) {
        res.status(500).json({ message: "Erro ao buscar logs de auditoria" });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
