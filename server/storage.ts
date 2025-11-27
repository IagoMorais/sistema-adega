import {
  User,
  InsertUser,
  InsertUserInternal,
  Product,
  InsertProduct,
  StockMovement,
  Sale,
  SaleItem,
  SalePayment,
  CreateSaleInput,
  CreateSaleSplitInput,
  UpdatePaymentMethodInput,
  CancelSaleInput,
  SalesPaymentHistory,
  users,
  products,
  stockMovements,
  sales,
  saleItems,
  salePayments,
  salesPaymentHistory,
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { eq, desc, sql, lte } from "drizzle-orm";
import { getAuditReport } from "./middleware/audit-log";

const PostgresSessionStore = connectPg(session);

export interface AuditFilters {
  userId?: number;
  resource?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUserInternal): Promise<User>;
  getUsers(): Promise<User[]>;

  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsPaginated(page?: number, limit?: number): Promise<PaginationResult<Product>>;
  getLowStockProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct & { createdBy: number }): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  createSale(data: CreateSaleInput & { sellerId: number }): Promise<Sale & { items: SaleItem[] }>;
  calculateSaleTotal(items: { productId: number; quantity: number }[]): Promise<number>;
  createSaleSplit(data: CreateSaleSplitInput & { sellerId: number }): Promise<Sale & { items: SaleItem[]; payments: SalePayment[] }>;
  getSales(): Promise<(Sale & { seller: User | null, items: SaleItem[] })[]>;
  getSale(id: number): Promise<(Sale & { seller: User | null, items: SaleItem[], paymentHistory: SalesPaymentHistory[] }) | undefined>;
  updateSalePaymentMethod(saleId: number, data: UpdatePaymentMethodInput, userId: number): Promise<Sale>;
  cancelSale(saleId: number, data: CancelSaleInput, userId: number): Promise<Sale>;
  getSalePaymentHistory(saleId: number): Promise<SalesPaymentHistory[]>;

  getSalesStats(): Promise<{
    totalSales: number;
    totalRevenue: number;
    topProducts: { productId: number; name: string; quantity: number }[];
  }>;

  getAuditLogs(filters: AuditFilters): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) throw new Error("User not found");
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.username);
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(products.name);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct & { createdBy: number }): Promise<Product> {
    // Converter price e discount para string (formato decimal do DB)
    const productData = {
      ...product,
      price: product.price.toString(),
      discount: product.discount.toString(),
    };
    
    const [newProduct] = await db.insert(products).values(productData).returning();

    // Log initial stock movement if quantity > 0
    if (newProduct.quantity > 0) {
      await db.insert(stockMovements).values({
        productId: newProduct.id,
        type: "in",
        quantity: newProduct.quantity,
        reason: "Initial Stock",
        userId: product.createdBy,
      });
    }

    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) throw new Error("Product not found");
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    // Deletar movimentos de estoque relacionados primeiro
    await db.delete(stockMovements).where(eq(stockMovements.productId, id));
    // Deletar itens de venda relacionados
    await db.delete(saleItems).where(eq(saleItems.productId, id));
    // Deletar o produto
    await db.delete(products).where(eq(products.id, id));
  }

  async calculateSaleTotal(items: { productId: number; quantity: number }[]): Promise<number> {
    let total = 0;
    
    for (const item of items) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (!product) throw new Error(`Produto ${item.productId} não encontrado`);
      
      const price = Number(product.price);
      total += price * item.quantity;
    }
    
    return total;
  }

  async createSale(data: CreateSaleInput & { sellerId: number }): Promise<Sale & { items: SaleItem[] }> {
    return db.transaction(async (tx) => {
      let totalAmount = 0;
      const itemsToInsert: any[] = [];
      const movementsToInsert: any[] = [];

      // 1. Validate stock and calculate total
      for (const item of data.items) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (!product) throw new Error(`Produto ${item.productId} não encontrado`);

        if (product.quantity < item.quantity) {
          throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}`);
        }

        const price = Number(product.price);
        // Apply discount if any (logic can be complex, keeping simple for now)
        // Assuming price is final price

        totalAmount += price * item.quantity;

        itemsToInsert.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtTime: price.toString(),
        });

        // Prepare stock deduction
        movementsToInsert.push({
          productId: item.productId,
          type: "out",
          quantity: item.quantity,
          reason: "Sale",
          userId: data.sellerId,
        });

        // Update product stock
        await tx.update(products)
          .set({ quantity: product.quantity - item.quantity })
          .where(eq(products.id, product.id));
      }

      // 2. Create Sale
      const [sale] = await tx.insert(sales).values({
        totalAmount: totalAmount.toString(),
        paymentMethod: data.paymentMethod,
        sellerId: data.sellerId,
      }).returning();

      // 3. Create Sale Items
      const saleItemsData = itemsToInsert.map(item => ({
        ...item,
        saleId: sale.id,
      }));

      const createdItems = await tx.insert(saleItems).values(saleItemsData).returning();

      // 4. Create Stock Movements
      await tx.insert(stockMovements).values(movementsToInsert);

      return { ...sale, items: createdItems };
    });
  }

  async createSaleSplit(data: CreateSaleSplitInput & { sellerId: number }): Promise<Sale & { items: SaleItem[]; payments: SalePayment[] }> {
    return db.transaction(async (tx) => {
      let totalAmount = 0;
      const itemsToInsert: any[] = [];
      const movementsToInsert: any[] = [];

      // 1. Validate stock and calculate total
      for (const item of data.items) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (!product) throw new Error(`Produto ${item.productId} não encontrado`);

        if (product.quantity < item.quantity) {
          throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}`);
        }

        const price = Number(product.price);
        totalAmount += price * item.quantity;

        itemsToInsert.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtTime: price.toString(),
        });

        // Prepare stock deduction
        movementsToInsert.push({
          productId: item.productId,
          type: "out",
          quantity: item.quantity,
          reason: "Sale (Split Payment)",
          userId: data.sellerId,
        });

        // Update product stock
        await tx.update(products)
          .set({ quantity: product.quantity - item.quantity })
          .where(eq(products.id, product.id));
      }

      // 2. Create Sale with "split" as payment method identifier
      const [sale] = await tx.insert(sales).values({
        totalAmount: totalAmount.toString(),
        paymentMethod: "split", // Identificador para pagamento dividido
        sellerId: data.sellerId,
      }).returning();

      // 3. Create Sale Items
      const saleItemsData = itemsToInsert.map(item => ({
        ...item,
        saleId: sale.id,
      }));

      const createdItems = await tx.insert(saleItems).values(saleItemsData).returning();

      // 4. Create Payment Records
      const paymentsData = data.payments.map(payment => ({
        saleId: sale.id,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount.toString(),
      }));

      const createdPayments = await tx.insert(salePayments).values(paymentsData).returning();

      // 5. Create Stock Movements
      await tx.insert(stockMovements).values(movementsToInsert);

      return { ...sale, items: createdItems, payments: createdPayments };
    });
  }

  async getSales(): Promise<(Sale & { seller: User | null, items: SaleItem[] })[]> {
    // Usar query manual já implementada
    return this.getSalesManual();
  }

  // Re-implementing getSales with manual joins for safety since I didn't add relations
  async getSalesManual(): Promise<(Sale & { seller: User | null, items: SaleItem[] })[]> {
    const allSales = await db.select().from(sales).orderBy(desc(sales.createdAt));
    const results = [];

    for (const sale of allSales) {
      const seller = sale.sellerId ? await this.getUser(sale.sellerId).catch(() => null) : null;
      const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
      results.push({ ...sale, seller, items });
    }
    return results;
  }

  async getProductsPaginated(page: number = 1, limit: number = 50): Promise<PaginationResult<Product>> {
    const offset = (page - 1) * limit;
    
    const productsData = await db.select()
      .from(products)
      .orderBy(products.name)
      .limit(limit)
      .offset(offset);
    
    const [totalResult] = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(products);
    
    const total = totalResult?.count || 0;
    
    return {
      data: productsData,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  async getLowStockProducts(): Promise<Product[]> {
    return db.select()
      .from(products)
      .where(sql`${products.quantity} <= ${products.minStockLevel}`)
      .orderBy(products.quantity);
  }

  async getAuditLogs(filters: AuditFilters) {
    return getAuditReport(filters);
  }

  async getSale(id: number): Promise<(Sale & { seller: User | null, items: SaleItem[], paymentHistory: SalesPaymentHistory[] }) | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    if (!sale) return undefined;

    const seller = sale.sellerId ? await this.getUser(sale.sellerId).catch(() => null) : null;
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
    const paymentHistory = await db.select().from(salesPaymentHistory)
      .where(eq(salesPaymentHistory.saleId, sale.id))
      .orderBy(desc(salesPaymentHistory.changedAt));

    return { ...sale, seller, items, paymentHistory };
  }

  async updateSalePaymentMethod(saleId: number, data: UpdatePaymentMethodInput, userId: number): Promise<Sale> {
    return db.transaction(async (tx) => {
      // 1. Get current sale
      const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));
      if (!sale) throw new Error("Venda não encontrada");

      // 2. Check if sale is active
      if (sale.status !== "active") {
        throw new Error("Não é possível alterar forma de pagamento de venda cancelada");
      }

      // 3. Check if payment method is different
      if (sale.paymentMethod === data.paymentMethod) {
        throw new Error("A forma de pagamento já é esta");
      }

      // 4. Record payment method change in history
      await tx.insert(salesPaymentHistory).values({
        saleId: sale.id,
        oldPaymentMethod: sale.paymentMethod,
        newPaymentMethod: data.paymentMethod,
        changedBy: userId,
      });

      // 5. Update sale payment method
      const [updatedSale] = await tx.update(sales)
        .set({ paymentMethod: data.paymentMethod })
        .where(eq(sales.id, saleId))
        .returning();

      return updatedSale;
    });
  }

  async cancelSale(saleId: number, data: CancelSaleInput, userId: number): Promise<Sale> {
    return db.transaction(async (tx) => {
      // 1. Get current sale with items
      const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));
      if (!sale) throw new Error("Venda não encontrada");

      // 2. Check if sale is already cancelled
      if (sale.status === "cancelled") {
        throw new Error("Esta venda já está cancelada");
      }

      // 3. Get sale items
      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));

      // 4. Return products to stock
      for (const item of items) {
        if (item.productId === null) continue;

        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (!product) continue;

        // Update product quantity
        await tx.update(products)
          .set({ quantity: product.quantity + item.quantity })
          .where(eq(products.id, product.id));

        // Record stock movement
        await tx.insert(stockMovements).values({
          productId: product.id,
          type: "in",
          quantity: item.quantity,
          reason: `Cancelamento da venda #${saleId}`,
          userId: userId,
        });
      }

      // 5. Update sale status
      const [cancelledSale] = await tx.update(sales)
        .set({
          status: "cancelled",
          cancelledBy: userId,
          cancelledAt: new Date(),
          cancelReason: data.reason,
        })
        .where(eq(sales.id, saleId))
        .returning();

      return cancelledSale;
    });
  }

  async getSalePaymentHistory(saleId: number): Promise<SalesPaymentHistory[]> {
    return db.select()
      .from(salesPaymentHistory)
      .where(eq(salesPaymentHistory.saleId, saleId))
      .orderBy(desc(salesPaymentHistory.changedAt));
  }

  async getSalesStats() {
    const allSales = await db.select().from(sales).where(eq(sales.status, "active"));
    const totalRevenue = allSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

    // Top products
    const allItems = await db.select({
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      productName: products.name
    })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id));

    const productSales: Record<number, { name: string, quantity: number }> = {};

    allItems.forEach(item => {
      const productId = item.productId;
      if (productId === null) return; // Skip items without productId
      
      if (!productSales[productId]) {
        productSales[productId] = { name: item.productName, quantity: 0 };
      }
      productSales[productId].quantity += item.quantity;
    });

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({
        productId: Number(id),
        name: data.name,
        quantity: data.quantity
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalSales: allSales.length,
      totalRevenue,
      topProducts
    };
  }
}

export const storage = new DatabaseStorage();
