var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditLogs: () => auditLogs,
  cancelSaleSchema: () => cancelSaleSchema,
  createSaleSchema: () => createSaleSchema,
  insertProductSchema: () => insertProductSchema,
  insertUserInternalSchema: () => insertUserInternalSchema,
  insertUserSchema: () => insertUserSchema,
  movementTypes: () => movementTypes,
  paymentMethods: () => paymentMethods,
  products: () => products,
  saleItems: () => saleItems,
  saleStatus: () => saleStatus,
  sales: () => sales,
  salesPaymentHistory: () => salesPaymentHistory,
  session: () => session,
  stockMovements: () => stockMovements,
  updatePaymentMethodSchema: () => updatePaymentMethodSchema,
  userRoles: () => userRoles,
  users: () => users
});
import { pgTable, text, serial, integer, decimal, timestamp, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var toNumber, userRoles, movementTypes, paymentMethods, saleStatus, users, session, products, stockMovements, sales, saleItems, salesPaymentHistory, insertUserSchema, insertProductSchema, createSaleSchema, updatePaymentMethodSchema, cancelSaleSchema, auditLogs, insertUserInternalSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    toNumber = (value, ctx, options2) => {
      if (typeof value === "number") {
        if (!Number.isFinite(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${options2.field} inv\xE1lido`
          });
          return z.NEVER;
        }
        if (options2.min !== void 0 && value < options2.min) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${options2.field} deve ser maior ou igual a ${options2.min}`
          });
          return z.NEVER;
        }
        if (options2.integer && !Number.isInteger(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${options2.field} deve ser um n\xFAmero inteiro`
          });
          return z.NEVER;
        }
        return value;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
          if (options2.allowEmpty && options2.defaultValue !== void 0) {
            return options2.defaultValue;
          }
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${options2.field} \xE9 obrigat\xF3rio`
          });
          return z.NEVER;
        }
        const normalized = trimmed.replace(",", ".");
        const parsed = Number(normalized);
        if (!Number.isFinite(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${options2.field} inv\xE1lido`
          });
          return z.NEVER;
        }
        if (options2.min !== void 0 && parsed < options2.min) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${options2.field} deve ser maior ou igual a ${options2.min}`
          });
          return z.NEVER;
        }
        if (options2.integer && !Number.isInteger(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${options2.field} deve ser um n\xFAmero inteiro`
          });
          return z.NEVER;
        }
        return parsed;
      }
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${options2.field} inv\xE1lido`
      });
      return z.NEVER;
    };
    userRoles = ["admin", "seller"];
    movementTypes = ["in", "out", "adjustment"];
    paymentMethods = ["cash", "card", "pix"];
    saleStatus = ["active", "cancelled"];
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      username: text("username").notNull().unique(),
      password: text("password").notNull(),
      role: text("role", { enum: userRoles }).notNull().default("seller"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    session = pgTable("session", {
      sid: varchar("sid").primaryKey(),
      sess: json("sess").notNull(),
      expire: timestamp("expire", { precision: 6 }).notNull()
    });
    products = pgTable("products", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      brand: text("brand").notNull(),
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      quantity: integer("quantity").notNull().default(0),
      minStockLevel: integer("min_stock_level").notNull().default(5),
      imageUrl: text("imageurl"),
      discount: decimal("discount", { precision: 5, scale: 2 }).default("0").notNull(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    stockMovements = pgTable("stock_movements", {
      id: serial("id").primaryKey(),
      productId: integer("product_id").references(() => products.id),
      type: text("type", { enum: movementTypes }).notNull(),
      quantity: integer("quantity").notNull(),
      reason: text("reason"),
      userId: integer("user_id").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    sales = pgTable("sales", {
      id: serial("id").primaryKey(),
      totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
      paymentMethod: text("payment_method").notNull(),
      sellerId: integer("seller_id").references(() => users.id),
      status: text("status", { enum: saleStatus }).notNull().default("active"),
      cancelledBy: integer("cancelled_by").references(() => users.id),
      cancelledAt: timestamp("cancelled_at"),
      cancelReason: text("cancel_reason"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    saleItems = pgTable("sale_items", {
      id: serial("id").primaryKey(),
      saleId: integer("sale_id").references(() => sales.id),
      productId: integer("product_id").references(() => products.id),
      quantity: integer("quantity").notNull(),
      priceAtTime: decimal("price_at_time", { precision: 10, scale: 2 }).notNull()
    });
    salesPaymentHistory = pgTable("sales_payment_history", {
      id: serial("id").primaryKey(),
      saleId: integer("sale_id").references(() => sales.id).notNull(),
      oldPaymentMethod: text("old_payment_method").notNull(),
      newPaymentMethod: text("new_payment_method").notNull(),
      changedBy: integer("changed_by").references(() => users.id).notNull(),
      changedAt: timestamp("changed_at").defaultNow().notNull()
    });
    insertUserSchema = z.object({
      username: z.string().trim().min(3, "Username must be at least 3 characters"),
      password: z.string().min(6, "Password must be at least 6 characters"),
      confirmPassword: z.string(),
      role: z.enum(userRoles).default("seller")
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"]
    });
    insertProductSchema = createInsertSchema(products).omit({
      id: true,
      updatedAt: true
    }).extend({
      name: z.string().trim().min(1, "Nome \xE9 obrigat\xF3rio"),
      brand: z.string().trim().min(1, "Marca \xE9 obrigat\xF3ria"),
      price: z.union([z.string(), z.number()]).transform(
        (val, ctx) => toNumber(val, ctx, { field: "Pre\xE7o", min: 0 })
      ),
      quantity: z.union([z.string(), z.number()]).transform(
        (val, ctx) => toNumber(val, ctx, { field: "Quantidade", min: 0, integer: true })
      ),
      minStockLevel: z.union([z.string(), z.number()]).transform(
        (val, ctx) => toNumber(val, ctx, { field: "Estoque m\xEDnimo", min: 0, integer: true })
      ),
      discount: z.union([z.string(), z.number(), z.undefined()]).transform((val, ctx) => {
        if (val === void 0) {
          return 0;
        }
        return toNumber(val, ctx, {
          field: "Desconto",
          min: 0,
          allowEmpty: true,
          defaultValue: 0
        });
      }),
      imageUrl: z.string().trim().min(1, "URL da imagem inv\xE1lida").optional()
    });
    createSaleSchema = z.object({
      paymentMethod: z.string().min(1, "M\xE9todo de pagamento obrigat\xF3rio"),
      items: z.array(z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive()
      })).min(1, "A venda deve ter pelo menos um item")
    });
    updatePaymentMethodSchema = z.object({
      paymentMethod: z.enum(paymentMethods, {
        errorMap: () => ({ message: "Forma de pagamento inv\xE1lida" })
      })
    });
    cancelSaleSchema = z.object({
      reason: z.string().min(5, "Motivo deve ter pelo menos 5 caracteres")
    });
    auditLogs = pgTable("audit_logs", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id),
      action: text("action").notNull(),
      // 'CREATE', 'UPDATE', 'DELETE'
      resource: text("resource").notNull(),
      // 'product', 'sale', 'user'
      resourceId: integer("resource_id"),
      oldValues: json("old_values"),
      newValues: json("new_values"),
      ipAddress: text("ip_address"),
      userAgent: text("user_agent"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertUserInternalSchema = z.object({
      username: z.string().trim().min(3, "Username must be at least 3 characters"),
      password: z.string().min(6, "Password must be at least 6 characters"),
      role: z.enum(userRoles).default("seller")
    });
  }
});

// server/db.ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var Pool, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    ({ Pool } = pg);
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/middleware/audit-log.ts
var audit_log_exports = {};
__export(audit_log_exports, {
  auditAuth: () => auditAuth,
  auditMiddleware: () => auditMiddleware,
  auditView: () => auditView,
  captureOldValues: () => captureOldValues,
  cleanOldAuditLogs: () => cleanOldAuditLogs,
  createAuditLog: () => createAuditLog,
  getAuditReport: () => getAuditReport
});
import { lte } from "drizzle-orm";
async function createAuditLog(userId, data, req) {
  try {
    await db.insert(auditLogs).values({
      userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      oldValues: data.oldValues,
      newValues: data.newValues,
      ipAddress: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("user-agent") || "unknown"
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
function auditMiddleware(resource, action) {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id || null;
        const auditData = {
          action,
          resource,
          resourceId: extractResourceId(req, body),
          oldValues: req.body?.oldValues || null,
          newValues: extractNewValues(action, req, body),
          metadata: {
            endpoint: req.originalUrl,
            method: req.method,
            userRole: req.user?.role || "anonymous"
          }
        };
        setImmediate(() => {
          createAuditLog(userId, auditData, req);
        });
      }
      return originalJson.call(this, body);
    };
    next();
  };
}
function auditAuth(action) {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = action === "LOGIN" ? body?.id : req.user?.id;
        const username = action === "LOGIN" ? body?.username : req.user?.username;
        const auditData = {
          action,
          resource: "auth",
          metadata: {
            username,
            success: true,
            endpoint: req.originalUrl
          }
        };
        setImmediate(() => {
          createAuditLog(userId || null, auditData, req);
        });
      } else {
        if (action === "LOGIN") {
          const auditData = {
            action,
            resource: "auth",
            metadata: {
              username: req.body?.username || "unknown",
              success: false,
              endpoint: req.originalUrl,
              statusCode: res.statusCode
            }
          };
          setImmediate(() => {
            createAuditLog(null, auditData, req);
          });
        }
      }
      return originalJson.call(this, body);
    };
    next();
  };
}
function auditView(resource, sensitive = false) {
  return async (req, res, next) => {
    const shouldAudit = sensitive || !req.user || req.user.role === "seller";
    if (shouldAudit) {
      const originalJson = res.json;
      res.json = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const auditData = {
            action: "VIEW",
            resource,
            metadata: {
              endpoint: req.originalUrl,
              query: req.query,
              userRole: req.user?.role || "anonymous",
              recordCount: Array.isArray(body?.data) ? body.data.length : 1
            }
          };
          setImmediate(() => {
            createAuditLog(req.user?.id || null, auditData, req);
          });
        }
        return originalJson.call(this, body);
      };
    }
    next();
  };
}
function extractResourceId(req, body) {
  const paramId = req.params.id || req.params.productId || req.params.saleId || req.params.userId;
  if (paramId) {
    const id = parseInt(paramId);
    if (!isNaN(id)) return id;
  }
  if (body && typeof body === "object") {
    if (body.id) return body.id;
    if (body.data?.id) return body.data.id;
  }
  return void 0;
}
function extractNewValues(action, req, body) {
  switch (action) {
    case "CREATE":
      return req.body || body;
    case "UPDATE":
      return req.body;
    case "DELETE":
      return null;
    default:
      return null;
  }
}
function captureOldValues(getOldValuesFn) {
  return async (req, res, next) => {
    try {
      const oldValues = await getOldValuesFn(req);
      req.body.oldValues = oldValues;
    } catch (error) {
      console.error("Failed to capture old values for audit:", error);
    }
    next();
  };
}
async function getAuditReport(options2) {
  const {
    userId,
    resource,
    action,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = options2;
  try {
    let query = db.select().from(auditLogs);
    const conditions = [];
    if (userId) conditions.push(`user_id = ${userId}`);
    if (resource) conditions.push(`resource = '${resource}'`);
    if (action) conditions.push(`action = '${action}'`);
    if (startDate) conditions.push(`created_at >= '${startDate.toISOString()}'`);
    if (endDate) conditions.push(`created_at <= '${endDate.toISOString()}'`);
    const result = await query.orderBy(auditLogs.createdAt).limit(limit).offset(offset);
    return result;
  } catch (error) {
    console.error("Failed to generate audit report:", error);
    throw error;
  }
}
async function cleanOldAuditLogs(daysToKeep = 90) {
  try {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const result = await db.delete(auditLogs).where(lte(auditLogs.createdAt, cutoffDate));
    console.log(`Cleaned old audit logs older than ${daysToKeep} days`);
    return result;
  } catch (error) {
    console.error("Failed to clean old audit logs:", error);
    throw error;
  }
}
var init_audit_log = __esm({
  "server/middleware/audit-log.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DatabaseStorage: () => DatabaseStorage,
  storage: () => storage
});
import session2 from "express-session";
import connectPg from "connect-pg-simple";
import { eq as eq2, desc as desc2, sql as sql2 } from "drizzle-orm";
var PostgresSessionStore, DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_audit_log();
    PostgresSessionStore = connectPg(session2);
    DatabaseStorage = class {
      constructor() {
        this.sessionStore = new PostgresSessionStore({
          pool,
          createTableIfMissing: true
        });
      }
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq2(users.id, id));
        if (!user) throw new Error("User not found");
        return user;
      }
      async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq2(users.username, username));
        return user;
      }
      async createUser(user) {
        const [newUser] = await db.insert(users).values(user).returning();
        return newUser;
      }
      async getUsers() {
        return db.select().from(users).orderBy(users.username);
      }
      async getProducts() {
        return db.select().from(products).orderBy(products.name);
      }
      async getProduct(id) {
        const [product] = await db.select().from(products).where(eq2(products.id, id));
        return product;
      }
      async createProduct(product) {
        const productData = {
          ...product,
          price: product.price.toString(),
          discount: product.discount.toString()
        };
        const [newProduct] = await db.insert(products).values(productData).returning();
        if (newProduct.quantity > 0) {
          await db.insert(stockMovements).values({
            productId: newProduct.id,
            type: "in",
            quantity: newProduct.quantity,
            reason: "Initial Stock",
            userId: product.createdBy
          });
        }
        return newProduct;
      }
      async updateProduct(id, updates) {
        const [updatedProduct] = await db.update(products).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(products.id, id)).returning();
        if (!updatedProduct) throw new Error("Product not found");
        return updatedProduct;
      }
      async deleteProduct(id) {
        await db.delete(stockMovements).where(eq2(stockMovements.productId, id));
        await db.delete(saleItems).where(eq2(saleItems.productId, id));
        await db.delete(products).where(eq2(products.id, id));
      }
      async createSale(data) {
        return db.transaction(async (tx) => {
          let totalAmount = 0;
          const itemsToInsert = [];
          const movementsToInsert = [];
          for (const item of data.items) {
            const [product] = await tx.select().from(products).where(eq2(products.id, item.productId));
            if (!product) throw new Error(`Produto ${item.productId} n\xE3o encontrado`);
            if (product.quantity < item.quantity) {
              throw new Error(`Estoque insuficiente para ${product.name}. Dispon\xEDvel: ${product.quantity}`);
            }
            const price = Number(product.price);
            totalAmount += price * item.quantity;
            itemsToInsert.push({
              productId: item.productId,
              quantity: item.quantity,
              priceAtTime: price.toString()
            });
            movementsToInsert.push({
              productId: item.productId,
              type: "out",
              quantity: item.quantity,
              reason: "Sale",
              userId: data.sellerId
            });
            await tx.update(products).set({ quantity: product.quantity - item.quantity }).where(eq2(products.id, product.id));
          }
          const [sale] = await tx.insert(sales).values({
            totalAmount: totalAmount.toString(),
            paymentMethod: data.paymentMethod,
            sellerId: data.sellerId
          }).returning();
          const saleItemsData = itemsToInsert.map((item) => ({
            ...item,
            saleId: sale.id
          }));
          const createdItems = await tx.insert(saleItems).values(saleItemsData).returning();
          await tx.insert(stockMovements).values(movementsToInsert);
          return { ...sale, items: createdItems };
        });
      }
      async getSales() {
        return this.getSalesManual();
      }
      // Re-implementing getSales with manual joins for safety since I didn't add relations
      async getSalesManual() {
        const allSales = await db.select().from(sales).orderBy(desc2(sales.createdAt));
        const results = [];
        for (const sale of allSales) {
          const seller = sale.sellerId ? await this.getUser(sale.sellerId).catch(() => null) : null;
          const items = await db.select().from(saleItems).where(eq2(saleItems.saleId, sale.id));
          results.push({ ...sale, seller, items });
        }
        return results;
      }
      async getProductsPaginated(page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const productsData = await db.select().from(products).orderBy(products.name).limit(limit).offset(offset);
        const [totalResult] = await db.select({ count: sql2`cast(count(*) as integer)` }).from(products);
        const total = totalResult?.count || 0;
        return {
          data: productsData,
          total,
          page,
          pages: Math.ceil(total / limit)
        };
      }
      async getLowStockProducts() {
        return db.select().from(products).where(sql2`${products.quantity} <= ${products.minStockLevel}`).orderBy(products.quantity);
      }
      async getAuditLogs(filters) {
        return getAuditReport(filters);
      }
      async getSale(id) {
        const [sale] = await db.select().from(sales).where(eq2(sales.id, id));
        if (!sale) return void 0;
        const seller = sale.sellerId ? await this.getUser(sale.sellerId).catch(() => null) : null;
        const items = await db.select().from(saleItems).where(eq2(saleItems.saleId, sale.id));
        const paymentHistory = await db.select().from(salesPaymentHistory).where(eq2(salesPaymentHistory.saleId, sale.id)).orderBy(desc2(salesPaymentHistory.changedAt));
        return { ...sale, seller, items, paymentHistory };
      }
      async updateSalePaymentMethod(saleId, data, userId) {
        return db.transaction(async (tx) => {
          const [sale] = await tx.select().from(sales).where(eq2(sales.id, saleId));
          if (!sale) throw new Error("Venda n\xE3o encontrada");
          if (sale.status !== "active") {
            throw new Error("N\xE3o \xE9 poss\xEDvel alterar forma de pagamento de venda cancelada");
          }
          if (sale.paymentMethod === data.paymentMethod) {
            throw new Error("A forma de pagamento j\xE1 \xE9 esta");
          }
          await tx.insert(salesPaymentHistory).values({
            saleId: sale.id,
            oldPaymentMethod: sale.paymentMethod,
            newPaymentMethod: data.paymentMethod,
            changedBy: userId
          });
          const [updatedSale] = await tx.update(sales).set({ paymentMethod: data.paymentMethod }).where(eq2(sales.id, saleId)).returning();
          return updatedSale;
        });
      }
      async cancelSale(saleId, data, userId) {
        return db.transaction(async (tx) => {
          const [sale] = await tx.select().from(sales).where(eq2(sales.id, saleId));
          if (!sale) throw new Error("Venda n\xE3o encontrada");
          if (sale.status === "cancelled") {
            throw new Error("Esta venda j\xE1 est\xE1 cancelada");
          }
          const items = await tx.select().from(saleItems).where(eq2(saleItems.saleId, saleId));
          for (const item of items) {
            if (item.productId === null) continue;
            const [product] = await tx.select().from(products).where(eq2(products.id, item.productId));
            if (!product) continue;
            await tx.update(products).set({ quantity: product.quantity + item.quantity }).where(eq2(products.id, product.id));
            await tx.insert(stockMovements).values({
              productId: product.id,
              type: "in",
              quantity: item.quantity,
              reason: `Cancelamento da venda #${saleId}`,
              userId
            });
          }
          const [cancelledSale] = await tx.update(sales).set({
            status: "cancelled",
            cancelledBy: userId,
            cancelledAt: /* @__PURE__ */ new Date(),
            cancelReason: data.reason
          }).where(eq2(sales.id, saleId)).returning();
          return cancelledSale;
        });
      }
      async getSalePaymentHistory(saleId) {
        return db.select().from(salesPaymentHistory).where(eq2(salesPaymentHistory.saleId, saleId)).orderBy(desc2(salesPaymentHistory.changedAt));
      }
      async getSalesStats() {
        const allSales = await db.select().from(sales).where(eq2(sales.status, "active"));
        const totalRevenue = allSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
        const allItems = await db.select({
          productId: saleItems.productId,
          quantity: saleItems.quantity,
          productName: products.name
        }).from(saleItems).innerJoin(products, eq2(saleItems.productId, products.id));
        const productSales = {};
        allItems.forEach((item) => {
          const productId = item.productId;
          if (productId === null) return;
          if (!productSales[productId]) {
            productSales[productId] = { name: item.productName, quantity: 0 };
          }
          productSales[productId].quantity += item.quantity;
        });
        const topProducts = Object.entries(productSales).map(([id, data]) => ({
          productId: Number(id),
          name: data.name,
          quantity: data.quantity
        })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
        return {
          totalSales: allSales.length,
          totalRevenue,
          topProducts
        };
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/utils.ts
var utils_exports = {};
__export(utils_exports, {
  comparePasswords: () => comparePasswords,
  hashPassword: () => hashPassword
});
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error("Formato de senha inv\xE1lido");
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    if (hashedBuf.length !== suppliedBuf.length) {
      console.error("Comprimento do buffer de senha incompat\xEDvel");
      return false;
    }
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Erro ao comparar senhas:", error);
    return false;
  }
}
var scryptAsync;
var init_utils = __esm({
  "server/utils.ts"() {
    "use strict";
    scryptAsync = promisify(scrypt);
  }
});

// server/index.ts
import "dotenv/config";
import express2 from "express";
import helmet from "helmet";
import rateLimit2 from "express-rate-limit";
import path2 from "path";

// server/routes.ts
init_schema();
init_storage();
import { createServer } from "http";

// server/auth.ts
init_storage();
init_utils();
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session3 from "express-session";
function setupAuth(app2) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be defined before initializing authentication");
  }
  const sessionSettings = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_COOKIES !== "true",
      maxAge: 1e3 * 60 * 60 * 24 * 7
      // 1 semana
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session3(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Credenciais inv\xE1lidas" });
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        console.log("Login bem-sucedido:", user.username, user.role);
        const { password: _password, ...safeUser } = user;
        return res.status(200).json(safeUser);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password: _password, ...safeUser } = req.user;
    res.json(safeUser);
  });
  app2.use(["/api/products/*/delete", "/api/products/create", "/api/admin/*"], (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Acesso negado: apenas administradores" });
    }
    next();
  });
}

// server/routes.ts
init_utils();

// server/middleware/rbac.ts
function requireAuth(req, res, next) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      error: "Autentica\xE7\xE3o necess\xE1ria",
      code: "AUTHENTICATION_REQUIRED"
    });
  }
  next();
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "N\xE3o autenticado",
        code: "NOT_AUTHENTICATED"
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acesso negado. Roles permitidos: ${allowedRoles.join(", ")}`,
        code: "INSUFFICIENT_PERMISSIONS",
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }
    next();
  };
}
var requireAdmin = requireRole("admin");
var requireSeller = requireRole("admin", "seller");
function addUserContext(req, res, next) {
  if (req.user) {
    if (process.env.NODE_ENV === "development") {
      res.setHeader("X-User-ID", req.user.id.toString());
      res.setHeader("X-User-Role", req.user.role);
    }
  }
  next();
}
function logAccess(resource) {
  return (req, res, next) => {
    if (req.user) {
      console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.user.role.toUpperCase()}(${req.user.username}) ${req.method} ${req.originalUrl} - Resource: ${resource}`);
    }
    next();
  };
}

// server/middleware/rate-limit.ts
import rateLimit from "express-rate-limit";
function createRoleBasedRateLimit(options2) {
  const {
    windowMs = 15 * 60 * 1e3,
    // 15 minutos
    adminMax = 300,
    // Admins podem fazer 300 requests por janela
    sellerMax = 150,
    // Sellers podem fazer 150 requests por janela
    guestMax = 50,
    // Usuários não autenticados: 50 requests
    message = "Muitas requisi\xE7\xF5es. Tente novamente em alguns minutos."
  } = options2;
  return rateLimit({
    windowMs,
    max: (req) => {
      if (!req.user) {
        return guestMax;
      }
      switch (req.user.role) {
        case "admin":
          return adminMax;
        case "seller":
          return sellerMax;
        default:
          return guestMax;
      }
    },
    message: {
      error: message,
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: windowMs / 1e3
    },
    standardHeaders: true,
    // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
    // Disable the `X-RateLimit-*` headers
    // Remover keyGenerator customizado para evitar problemas com IPv6
    // A biblioteca express-rate-limit lida com IPv6 automaticamente
    skip: (req) => {
      if (process.env.NODE_ENV === "development") {
        const ip = req.ip || req.socket.remoteAddress || "";
        if (ip.includes("127.0.0.1") || ip.includes("::1") || ip.includes("localhost")) {
          return true;
        }
      }
      return false;
    },
    // Log quando o rate limit é atingido (será tratado no handler)
    handler: (req, res) => {
      const user = req.user ? `${req.user.role}(${req.user.username})` : "guest";
      console.warn(`[RATE LIMIT] ${user} from ${req.ip} exceeded rate limit for ${req.originalUrl}`);
      res.status(429).json({
        error: message,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: windowMs / 1e3
      });
    }
  });
}
var generalRateLimit = createRoleBasedRateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  adminMax: 300,
  sellerMax: 150,
  guestMax: 50
});
var criticalRateLimit = createRoleBasedRateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  adminMax: 100,
  sellerMax: 50,
  guestMax: 10,
  message: "Muitas opera\xE7\xF5es cr\xEDticas. Aguarde antes de tentar novamente."
});
var authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  max: 10,
  // Máximo 10 tentativas de login por IP
  message: {
    error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    code: "AUTH_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // A biblioteca express-rate-limit lida com IPv6 automaticamente
  // Não é necessário keyGenerator customizado
  handler: (req, res) => {
    console.warn(`[AUTH RATE LIMIT] Too many login attempts from ${req.ip}`);
    res.status(429).json({
      error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
      code: "AUTH_RATE_LIMIT_EXCEEDED"
    });
  }
});
var reportsRateLimit = createRoleBasedRateLimit({
  windowMs: 5 * 60 * 1e3,
  // 5 minutos
  adminMax: 20,
  // Máximo 20 relatórios por admin a cada 5 minutos
  sellerMax: 5,
  // Máximo 5 relatórios por seller a cada 5 minutos
  guestMax: 0,
  // Guests não podem acessar relatórios
  message: "Muitas consultas de relat\xF3rios. Aguarde antes de solicitar novos relat\xF3rios."
});
var uploadRateLimit = createRoleBasedRateLimit({
  windowMs: 60 * 1e3,
  // 1 minuto
  adminMax: 20,
  // 20 uploads por minuto
  sellerMax: 5,
  // 5 uploads por minuto
  guestMax: 0,
  // Guests não podem fazer upload
  message: "Muitos uploads. Aguarde antes de enviar mais arquivos."
});
function smartRateLimit(req, res, next) {
  const path3 = req.path.toLowerCase();
  const method = req.method.toUpperCase();
  if (path3.includes("/login") || path3.includes("/auth")) {
    return authRateLimit(req, res, next);
  }
  if (path3.includes("/upload") || path3.includes("/image")) {
    return uploadRateLimit(req, res, next);
  }
  if (path3.includes("/report") || path3.includes("/dashboard") || path3.includes("/stats")) {
    return reportsRateLimit(req, res, next);
  }
  if (["POST", "PUT", "DELETE"].includes(method)) {
    return criticalRateLimit(req, res, next);
  }
  return generalRateLimit(req, res, next);
}

// server/routes.ts
init_audit_log();
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.use(addUserContext);
  app2.use(smartRateLimit);
  app2.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.post(
    "/api/login",
    authRateLimit,
    auditAuth("LOGIN"),
    (req, res, next) => {
      next();
    }
  );
  app2.post(
    "/api/logout",
    requireAuth,
    auditAuth("LOGOUT"),
    (req, res, next) => {
      next();
    }
  );
  app2.use("/api", (req, res, next) => {
    const publicPaths = ["/api/setup-admin", "/api/login", "/api/health"];
    const fullPath = `/api${req.path}`;
    if (publicPaths.includes(fullPath)) {
      return next();
    }
    requireAuth(req, res, next);
  });
  app2.get(
    "/api/users",
    requireAdmin,
    auditView("users", true),
    // Dados sensíveis
    logAccess("users"),
    async (_req, res) => {
      const users2 = await storage.getUsers();
      const safeUsers = users2.map(({ password: _password, ...rest }) => rest);
      res.json(safeUsers);
    }
  );
  app2.post(
    "/api/admin/users",
    requireAdmin,
    auditMiddleware("users", "CREATE"),
    logAccess("users"),
    async (req, res) => {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Dados inv\xE1lidos",
          errors: result.error.flatten()
        });
      }
      const existingUser = await storage.getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usu\xE1rio j\xE1 existe" });
      }
      try {
        const hashedPassword = await hashPassword(result.data.password);
        const userData = {
          username: result.data.username,
          password: hashedPassword,
          role: result.data.role
        };
        const newUser = await storage.createUser(userData);
        const { password, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ message: "Erro ao criar usu\xE1rio" });
      }
    }
  );
  app2.get(
    "/api/products",
    requireSeller,
    // Admin ou Seller
    auditView("products"),
    async (req, res) => {
      const items = await storage.getProducts();
      res.json(items);
    }
  );
  app2.get(
    "/api/products/:id",
    requireSeller,
    auditView("products"),
    async (req, res) => {
      const productId = Number(req.params.id);
      if (Number.isNaN(productId)) return res.status(400).json({ message: "ID inv\xE1lido" });
      const item = await storage.getProduct(productId);
      if (!item) return res.status(404).json({ message: "Produto n\xE3o encontrado" });
      res.json(item);
    }
  );
  app2.post(
    "/api/products",
    requireAdmin,
    auditMiddleware("products", "CREATE"),
    logAccess("products"),
    async (req, res) => {
      const result = insertProductSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(result.error);
      }
      const product = await storage.createProduct({
        ...result.data,
        createdBy: req.user.id
      });
      res.status(201).json(product);
    }
  );
  app2.patch(
    "/api/products/:id",
    requireAdmin,
    captureOldValues(async (req) => {
      const id = Number(req.params.id);
      return await storage.getProduct(id);
    }),
    auditMiddleware("products", "UPDATE"),
    logAccess("products"),
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
  app2.delete(
    "/api/products/:id",
    requireAdmin,
    captureOldValues(async (req) => {
      const id = Number(req.params.id);
      return await storage.getProduct(id);
    }),
    auditMiddleware("products", "DELETE"),
    logAccess("products"),
    async (req, res) => {
      await storage.deleteProduct(Number(req.params.id));
      res.sendStatus(204);
    }
  );
  app2.post(
    "/api/sales",
    requireSeller,
    // Admin ou Seller
    auditMiddleware("sales", "CREATE"),
    logAccess("sales"),
    async (req, res) => {
      const result = createSaleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Dados de venda inv\xE1lidos",
          errors: result.error.flatten()
        });
      }
      try {
        const sale = await storage.createSale({
          ...result.data,
          sellerId: req.user.id
        });
        res.status(201).json(sale);
      } catch (error) {
        res.status(400).json({ message: error instanceof Error ? error.message : "Erro ao realizar venda" });
      }
    }
  );
  app2.get(
    "/api/sales",
    requireSeller,
    // Admin ou Seller podem ver vendas
    auditView("sales", true),
    // Dados sensíveis
    logAccess("sales"),
    async (req, res) => {
      const sales2 = await storage.getSalesManual();
      if (req.user.role === "seller") {
        const filteredSales = sales2.filter((sale) => sale.sellerId === req.user.id);
        return res.json(filteredSales);
      }
      res.json(sales2);
    }
  );
  app2.get(
    "/api/sales/:id",
    requireSeller,
    auditView("sales", true),
    logAccess("sales"),
    async (req, res) => {
      const saleId = Number(req.params.id);
      if (Number.isNaN(saleId)) {
        return res.status(400).json({ message: "ID inv\xE1lido" });
      }
      const sale = await storage.getSale(saleId);
      if (!sale) {
        return res.status(404).json({ message: "Venda n\xE3o encontrada" });
      }
      if (req.user.role === "seller" && sale.sellerId !== req.user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      res.json(sale);
    }
  );
  app2.patch(
    "/api/sales/:id/payment-method",
    requireSeller,
    // Admin ou Seller
    captureOldValues(async (req) => {
      const id = Number(req.params.id);
      return await storage.getSale(id);
    }),
    auditMiddleware("sales", "UPDATE"),
    logAccess("sales"),
    async (req, res) => {
      const saleId = Number(req.params.id);
      if (Number.isNaN(saleId)) {
        return res.status(400).json({ message: "ID inv\xE1lido" });
      }
      const result = updatePaymentMethodSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Dados inv\xE1lidos",
          errors: result.error.flatten()
        });
      }
      try {
        const sale = await storage.getSale(saleId);
        if (!sale) {
          return res.status(404).json({ message: "Venda n\xE3o encontrada" });
        }
        if (req.user.role === "seller" && sale.sellerId !== req.user.id) {
          return res.status(403).json({ message: "Acesso negado" });
        }
        const updatedSale = await storage.updateSalePaymentMethod(
          saleId,
          result.data,
          req.user.id
        );
        res.json(updatedSale);
      } catch (error) {
        res.status(400).json({
          message: error instanceof Error ? error.message : "Erro ao alterar forma de pagamento"
        });
      }
    }
  );
  app2.post(
    "/api/sales/:id/cancel",
    requireAdmin,
    // Apenas Admin
    captureOldValues(async (req) => {
      const id = Number(req.params.id);
      return await storage.getSale(id);
    }),
    auditMiddleware("sales", "DELETE"),
    // Cancelamento é tratado como DELETE na auditoria
    logAccess("sales"),
    async (req, res) => {
      const saleId = Number(req.params.id);
      if (Number.isNaN(saleId)) {
        return res.status(400).json({ message: "ID inv\xE1lido" });
      }
      const result = cancelSaleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Dados inv\xE1lidos",
          errors: result.error.flatten()
        });
      }
      try {
        const cancelledSale = await storage.cancelSale(
          saleId,
          result.data,
          req.user.id
        );
        res.json(cancelledSale);
      } catch (error) {
        res.status(400).json({
          message: error instanceof Error ? error.message : "Erro ao cancelar venda"
        });
      }
    }
  );
  app2.get(
    "/api/stats",
    requireAdmin,
    reportsRateLimit,
    // Rate limit específico para relatórios
    auditView("stats", true),
    // Dados sensíveis
    logAccess("stats"),
    async (_req, res) => {
      const stats = await storage.getSalesStats();
      res.json(stats);
    }
  );
  app2.get(
    "/api/admin/audit-logs",
    requireAdmin,
    reportsRateLimit,
    auditView("audit-logs", true),
    logAccess("audit-logs"),
    async (req, res) => {
      try {
        const { getAuditReport: getAuditReport2 } = await Promise.resolve().then(() => (init_audit_log(), audit_log_exports));
        const logs = await getAuditReport2({
          limit: Number(req.query.limit) || 100,
          offset: Number(req.query.offset) || 0,
          userId: req.query.userId ? Number(req.query.userId) : void 0,
          resource: req.query.resource,
          action: req.query.action
        });
        res.json(logs);
      } catch (error) {
        res.status(500).json({ message: "Erro ao buscar logs de auditoria" });
      }
    }
  );
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { nanoid } from "nanoid";
var __filename = fileURLToPath(import.meta.url);
var __dirname2 = dirname(__filename);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    configFile: path.resolve(__dirname2, "..", "vite.config.ts"),
    server: serverOptions,
    appType: "custom"
  });
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api-docs") || req.path === "/api-docs.json") {
      return next();
    }
    vite.middlewares(req, res, next);
  });
  app2.use("*", async (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/api-docs")) {
      return next();
    }
    try {
      const clientTemplate = path.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error("Erro ao servir index.html:", e);
      res.status(500).send("Erro ao carregar a aplica\xE7\xE3o");
    }
  });
}
function serveStatic(app2) {
  const distPath = path.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/setup-default-users.ts
init_storage();
init_utils();
async function setupDefaultUsers() {
  try {
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME?.trim() || "admin";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
    const defaultUsers = [
      { username: adminUsername, password: adminPassword, role: "admin" },
      { username: "seller", password: "seller123", role: "seller" }
    ];
    for (const userTemplate of defaultUsers) {
      try {
        const exists = await storage.getUserByUsername(userTemplate.username);
        if (!exists) {
          const hashedPassword = await hashPassword(userTemplate.password);
          await storage.createUser({
            username: userTemplate.username,
            password: hashedPassword,
            role: userTemplate.role
          });
          console.log(`Usu\xE1rio ${userTemplate.username} (${userTemplate.role}) criado com sucesso`);
        }
      } catch (error) {
        const errorWithCode = error;
        if (errorWithCode.code === "23505") {
          console.warn(`Usu\xE1rio ${userTemplate.username} j\xE1 existe (detec\xE7\xE3o concorrente).`);
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    console.error("Erro ao criar usu\xE1rios padr\xE3o:", error);
    throw error;
  }
}

// server/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
var swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "API de Gerenciamento de Estoque",
    version: "1.0.0",
    description: "Documenta\xE7\xE3o da API para o sistema de gerenciamento de estoque"
  },
  servers: [
    {
      url: "/api",
      description: "Servidor de desenvolvimento"
    }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "connect.sid"
      }
    }
  },
  security: [
    {
      cookieAuth: []
    }
  ]
};
var options = {
  swaggerDefinition,
  apis: ["./server/routes.ts"]
};
var swaggerSpec = swaggerJSDoc(options);
function setupSwagger(app2) {
  app2.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app2.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  console.log("Swagger UI dispon\xEDvel em /api-docs");
}

// server/index.ts
if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET must be defined before starting the server.");
  process.exit(1);
}
var app = express2();
app.use(
  helmet({
    contentSecurityPolicy: app.get("env") === "development" ? false : void 0
    // Usar padrão do Helmet em produção
  })
);
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});
var authLimiter = rateLimit2({
  windowMs: 15 * 60 * 1e3,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.post("/api/setup-admin", async (req, res) => {
  try {
    log("Recebida requisi\xE7\xE3o para criar admin");
    express2.json()(req, res, async () => {
      const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const { hashPassword: hashPassword3 } = await Promise.resolve().then(() => (init_utils(), utils_exports));
      const existingAdmin = await storage2.getUserByUsername("admin");
      if (existingAdmin) {
        log("Admin j\xE1 existe");
        return res.status(400).send("Admin j\xE1 existe");
      }
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
      const hashedPassword = await hashPassword3(defaultPassword);
      const adminUser = await storage2.createUser({
        username: "admin",
        password: hashedPassword,
        role: "admin"
      });
      log("Admin criado com sucesso");
      res.status(201).json(adminUser);
    });
  } catch (error) {
    log("Erro ao criar admin: " + error);
    console.error("Erro ao criar admin:", error);
    res.status(500).send("Erro ao criar admin");
  }
});
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
(async () => {
  try {
    await setupDefaultUsers();
    setupSwagger(app);
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
      app.use("*", (req, res) => {
        if (req.path.startsWith("/api")) {
          return res.status(404).json({ message: "Rota API n\xE3o encontrada" });
        }
        const distPath = path2.resolve(__dirname, "public");
        res.sendFile(path2.resolve(distPath, "index.html"));
      });
    }
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Servidor rodando em 0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao inicializar servidor:", error);
    process.exit(1);
  }
})();
