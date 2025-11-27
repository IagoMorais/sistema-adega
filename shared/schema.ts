import { pgTable, text, serial, integer, decimal, timestamp, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const toNumber = (
  value: string | number,
  ctx: z.RefinementCtx,
  options: {
    field: string;
    min?: number;
    integer?: boolean;
    allowEmpty?: boolean;
    defaultValue?: number;
  },
) => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${options.field} inválido`,
      });
      return z.NEVER;
    }
    if (options.min !== undefined && value < options.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${options.field} deve ser maior ou igual a ${options.min}`,
      });
      return z.NEVER;
    }
    if (options.integer && !Number.isInteger(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${options.field} deve ser um número inteiro`,
      });
      return z.NEVER;
    }
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      if (options.allowEmpty && options.defaultValue !== undefined) {
        return options.defaultValue;
      }
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${options.field} é obrigatório`,
      });
      return z.NEVER;
    }

    const normalized = trimmed.replace(",", ".");
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${options.field} inválido`,
      });
      return z.NEVER;
    }

    if (options.min !== undefined && parsed < options.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${options.field} deve ser maior ou igual a ${options.min}`,
      });
      return z.NEVER;
    }

    if (options.integer && !Number.isInteger(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${options.field} deve ser um número inteiro`,
      });
      return z.NEVER;
    }

    return parsed;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `${options.field} inválido`,
  });
  return z.NEVER;
};

export const userRoles = ["admin", "seller"] as const;
export const movementTypes = ["in", "out", "adjustment"] as const;
export const paymentMethods = ["cash", "card", "pix"] as const;
export const saleStatus = ["active", "cancelled"] as const;

// [REFATORADO]: Mantido para autenticação de Admin e Vendedor
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: userRoles }).notNull().default("seller"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// [REFATORADO]: Necessário para persistência de sessão do Express
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// [REFATORADO]: Tabela principal de Estoque
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(0),
  minStockLevel: integer("min_stock_level").notNull().default(5),
  imageUrl: text("imageurl"),
  discount: decimal("discount", { precision: 5, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// [REFATORADO]: Registro de Movimentações (InventoryLogs)
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  type: text("type", { enum: movementTypes }).notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// [REFATORADO]: Registro de Vendas (Saída de Estoque)
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  sellerId: integer("seller_id").references(() => users.id),
  status: text("status", { enum: saleStatus }).notNull().default("active"),
  cancelledBy: integer("cancelled_by").references(() => users.id),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// [REFATORADO]: Itens da Venda
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  priceAtTime: decimal("price_at_time", { precision: 10, scale: 2 }).notNull(),
});

// [NOVO]: Histórico de alterações de forma de pagamento
export const salesPaymentHistory = pgTable("sales_payment_history", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  oldPaymentMethod: text("old_payment_method").notNull(),
  newPaymentMethod: text("new_payment_method").notNull(),
  changedBy: integer("changed_by").references(() => users.id).notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

// [NOVO]: Pagamentos divididos (split payments)
export const salePayments = pgTable("sale_payments", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  paymentMethod: text("payment_method").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod Schemas
export const insertUserSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  role: z.enum(userRoles).default("seller"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertProductSchema = createInsertSchema(products)
  .omit({
    id: true,
    updatedAt: true,
  })
  .extend({
    name: z.string().trim().min(1, "Nome é obrigatório"),
    brand: z.string().trim().min(1, "Marca é obrigatória"),
    price: z.union([z.string(), z.number()]).transform((val, ctx) =>
      toNumber(val, ctx, { field: "Preço", min: 0 }),
    ),
    quantity: z.union([z.string(), z.number()]).transform((val, ctx) =>
      toNumber(val, ctx, { field: "Quantidade", min: 0, integer: true }),
    ),
    minStockLevel: z.union([z.string(), z.number()]).transform((val, ctx) =>
      toNumber(val, ctx, { field: "Estoque mínimo", min: 0, integer: true }),
    ),
    discount: z
      .union([z.string(), z.number(), z.undefined()])
      .transform((val, ctx) => {
        if (val === undefined) {
          return 0;
        }
        return toNumber(val, ctx, {
          field: "Desconto",
          min: 0,
          allowEmpty: true,
          defaultValue: 0,
        });
      }),
    imageUrl: z.string().trim().min(1, "URL da imagem inválida").optional(),
  });

export const createSaleSchema = z.object({
  paymentMethod: z.string().min(1, "Método de pagamento obrigatório"),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1, "A venda deve ter pelo menos um item"),
});

export const createSaleSplitSchema = z.object({
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1, "A venda deve ter pelo menos um item"),
  payments: z.array(z.object({
    paymentMethod: z.enum(paymentMethods, {
      errorMap: () => ({ message: "Forma de pagamento inválida" }),
    }),
    amount: z.union([z.string(), z.number()]).transform((val, ctx) =>
      toNumber(val, ctx, { field: "Valor do pagamento", min: 0.01 }),
    ),
  })).min(2, "Pagamento dividido deve ter pelo menos 2 formas").max(5, "Máximo de 5 formas de pagamento"),
}).refine((data) => {
  // Validar que a soma dos pagamentos seja positiva
  const total = data.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return total > 0;
}, {
  message: "A soma dos pagamentos deve ser maior que zero",
  path: ["payments"],
});

export const updatePaymentMethodSchema = z.object({
  paymentMethod: z.enum(paymentMethods, {
    errorMap: () => ({ message: "Forma de pagamento inválida" }),
  }),
});

export const cancelSaleSchema = z.object({
  reason: z.string().min(5, "Motivo deve ter pelo menos 5 caracteres"),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type SalesPaymentHistory = typeof salesPaymentHistory.$inferSelect;
export type SalePayment = typeof salePayments.$inferSelect;
export type UserRole = typeof userRoles[number];
export type MovementType = typeof movementTypes[number];
export type SaleStatus = typeof saleStatus[number];

// [NOVO]: Tabela de Auditoria para rastreamento de ações
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

// Schema interno para criação de usuários (sem confirmPassword)
export const insertUserInternalSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(userRoles).default("seller"),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserInternal = z.infer<typeof insertUserInternalSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CreateSaleSplitInput = z.infer<typeof createSaleSplitSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;
