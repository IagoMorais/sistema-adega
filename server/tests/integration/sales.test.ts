import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { pool, db } from '../../db';
import { ensureTestDatabase } from '../setup-test-db';
import { storage } from '../../storage';
import { users, products, sales, saleItems, stockMovements } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import type { CreateSaleInput, InsertProduct } from '../../../shared/schema';

describe('Sales Integration Tests', () => {
  let testSellerId: number;
  let testProduct1Id: number;
  let testProduct2Id: number;

  beforeAll(async () => {
    await ensureTestDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Limpar todas as tabelas e recriar dados de teste
    const client = await pool.connect();
    try {
      await client.query('SET CONSTRAINTS ALL DEFERRED;');
      
      // Deletar dados em ordem reversa de dependências
      await client.query('DELETE FROM audit_logs;');
      await client.query('DELETE FROM stock_movements;');
      await client.query('DELETE FROM sale_items;');
      await client.query('DELETE FROM sales;');
      await client.query('DELETE FROM products;');
      await client.query('DELETE FROM users;');
      
      // Resetar sequences
      await client.query('SELECT setval(\'sales_id_seq\', 1, false);');
      await client.query('SELECT setval(\'sale_items_id_seq\', 1, false);');
      await client.query('SELECT setval(\'products_id_seq\', 1, false);');
      await client.query('SELECT setval(\'users_id_seq\', 1, false);');
      await client.query('SELECT setval(\'stock_movements_id_seq\', 1, false);');
      
      await client.query('SET CONSTRAINTS ALL IMMEDIATE;');
      
      // Criar usuário vendedor de teste para este teste específico
      const [seller] = await db.insert(users).values({
        username: 'seller_test_sales',
        password: 'test_password',
        role: 'seller'
      }).returning();
      testSellerId = seller.id;
    } finally {
      client.release();
    }

    // Criar produtos de teste após limpar e resetar
    const product1 = await storage.createProduct({
      name: 'Cerveja Brahma',
      brand: 'Brahma',
      price: 5.00,
      quantity: 100,
      minStockLevel: 10,
      discount: 0,
      createdBy: testSellerId
    });
    testProduct1Id = product1.id;

    const product2 = await storage.createProduct({
      name: 'Cerveja Skol',
      brand: 'Skol',
      price: 4.50,
      quantity: 50,
      minStockLevel: 5,
      discount: 0,
      createdBy: testSellerId
    });
    testProduct2Id = product2.id;
  });

  describe('createSale', () => {
    it('deve criar venda com um item', async () => {
      const saleData: CreateSaleInput & { sellerId: number } = {
        paymentMethod: 'cash',
        items: [
          { productId: testProduct1Id, quantity: 2 }
        ],
        sellerId: testSellerId
      };

      const sale = await storage.createSale(saleData);

      expect(sale).toBeDefined();
      expect(sale.id).toBeGreaterThan(0);
      expect(sale.paymentMethod).toBe('cash');
      expect(sale.sellerId).toBe(testSellerId);
      expect(sale.totalAmount).toBe('10.00'); // 2 * 5.00
      expect(sale.items).toHaveLength(1);
      expect(sale.items[0].productId).toBe(testProduct1Id);
      expect(sale.items[0].quantity).toBe(2);
    });

    it('deve criar venda com múltiplos itens', async () => {
      const saleData: CreateSaleInput & { sellerId: number } = {
        paymentMethod: 'card',
        items: [
          { productId: testProduct1Id, quantity: 3 },
          { productId: testProduct2Id, quantity: 2 }
        ],
        sellerId: testSellerId
      };

      const sale = await storage.createSale(saleData);

      expect(sale.totalAmount).toBe('24.00'); // (3 * 5.00) + (2 * 4.50)
      expect(sale.items).toHaveLength(2);
    });

    it('deve atualizar estoque após venda', async () => {
      const saleData: CreateSaleInput & { sellerId: number } = {
        paymentMethod: 'pix',
        items: [
          { productId: testProduct1Id, quantity: 5 }
        ],
        sellerId: testSellerId
      };

      await storage.createSale(saleData);

      const product = await storage.getProduct(testProduct1Id);
      expect(product?.quantity).toBe(95); // 100 - 5
    });

    it('deve registrar movimento de estoque', async () => {
      const saleData: CreateSaleInput & { sellerId: number } = {
        paymentMethod: 'cash',
        items: [
          { productId: testProduct1Id, quantity: 3 }
        ],
        sellerId: testSellerId
      };

      await storage.createSale(saleData);

      const movements = await db.select()
        .from(stockMovements)
        .where(eq(stockMovements.productId, testProduct1Id));

      // Deve ter 2 movimentos: Initial Stock + Sale
      expect(movements.length).toBeGreaterThanOrEqual(2);
      const saleMovement = movements.find(m => m.reason === 'Sale');
      expect(saleMovement).toBeDefined();
      expect(saleMovement?.type).toBe('out');
      expect(saleMovement?.quantity).toBe(3);
    });

    it('deve rejeitar venda com estoque insuficiente', async () => {
      const saleData: CreateSaleInput & { sellerId: number } = {
        paymentMethod: 'cash',
        items: [
          { productId: testProduct1Id, quantity: 150 } // Mais que os 100 disponíveis
        ],
        sellerId: testSellerId
      };

      await expect(storage.createSale(saleData)).rejects.toThrow('Estoque insuficiente');
    });

    it('deve rejeitar venda com produto inexistente', async () => {
      const saleData: CreateSaleInput & { sellerId: number } = {
        paymentMethod: 'cash',
        items: [
          { productId: 99999, quantity: 1 }
        ],
        sellerId: testSellerId
      };

      await expect(storage.createSale(saleData)).rejects.toThrow();
    });

    it('deve aceitar diferentes métodos de pagamento', async () => {
      const methods = ['cash', 'card', 'pix'];

      for (const method of methods) {
        const saleData: CreateSaleInput & { sellerId: number } = {
          paymentMethod: method,
          items: [{ productId: testProduct1Id, quantity: 1 }],
          sellerId: testSellerId
        };

        const sale = await storage.createSale(saleData);
        expect(sale.paymentMethod).toBe(method);
      }
    });

    it('deve armazenar preço do produto no momento da venda', async () => {
      const saleData: CreateSaleInput & { sellerId: number } = {
        paymentMethod: 'cash',
        items: [{ productId: testProduct1Id, quantity: 1 }],
        sellerId: testSellerId
      };

      const sale = await storage.createSale(saleData);

      expect(sale.items[0].priceAtTime).toBe('5.00');

      // Atualizar preço do produto
      await storage.updateProduct(testProduct1Id, { price: '6.00' });

      // Verificar que a venda mantém o preço antigo
      const savedSale = await db.select()
        .from(saleItems)
        .where(eq(saleItems.id, sale.items[0].id));

      expect(savedSale[0].priceAtTime).toBe('5.00');
    });

    it('deve processar venda atomicamente', async () => {
      const saleData: CreateSaleInput & { sellerId: number } = {
        paymentMethod: 'cash',
        items: [
          { productId: testProduct1Id, quantity: 10 },
          { productId: 99999, quantity: 1 } // Produto inexistente
        ],
        sellerId: testSellerId
      };

      await expect(storage.createSale(saleData)).rejects.toThrow();

      // Verificar que o estoque não foi alterado (rollback)
      const product = await storage.getProduct(testProduct1Id);
      expect(product?.quantity).toBe(100); // Estoque original
    });
  });

  describe('getSales', () => {
    it('deve retornar lista vazia quando não há vendas', async () => {
      const salesList = await storage.getSales();
      expect(salesList).toEqual([]);
    });

    it('deve retornar todas as vendas', async () => {
      await storage.createSale({
        paymentMethod: 'cash',
        items: [{ productId: testProduct1Id, quantity: 1 }],
        sellerId: testSellerId
      });

      await storage.createSale({
        paymentMethod: 'card',
        items: [{ productId: testProduct2Id, quantity: 2 }],
        sellerId: testSellerId
      });

      const salesList = await storage.getSales();
      expect(salesList).toHaveLength(2);
    });

    it('deve incluir informações do vendedor', async () => {
      await storage.createSale({
        paymentMethod: 'cash',
        items: [{ productId: testProduct1Id, quantity: 1 }],
        sellerId: testSellerId
      });

      const salesList = await storage.getSales();
      expect(salesList[0].seller).toBeDefined();
      expect(salesList[0].seller?.id).toBe(testSellerId);
      expect(salesList[0].seller?.role).toBe('seller');
    });

    it('deve incluir itens da venda', async () => {
      await storage.createSale({
        paymentMethod: 'cash',
        items: [
          { productId: testProduct1Id, quantity: 2 },
          { productId: testProduct2Id, quantity: 1 }
        ],
        sellerId: testSellerId
      });

      const salesList = await storage.getSales();
      expect(salesList[0].items).toHaveLength(2);
    });

    it('deve ordenar vendas por data (mais recentes primeiro)', async () => {
      const sale1 = await storage.createSale({
        paymentMethod: 'cash',
        items: [{ productId: testProduct1Id, quantity: 1 }],
        sellerId: testSellerId
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const sale2 = await storage.createSale({
        paymentMethod: 'card',
        items: [{ productId: testProduct2Id, quantity: 1 }],
        sellerId: testSellerId
      });

      const salesList = await storage.getSales();
      expect(salesList[0].id).toBe(sale2.id); // Mais recente primeiro
      expect(salesList[1].id).toBe(sale1.id);
    });
  });

  describe('getSalesStats', () => {
    it('deve retornar estatísticas vazias quando não há vendas', async () => {
      const stats = await storage.getSalesStats();
      
      expect(stats.totalSales).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.topProducts).toEqual([]);
    });

    it('deve calcular total de vendas e receita', async () => {
      await storage.createSale({
        paymentMethod: 'cash',
        items: [{ productId: testProduct1Id, quantity: 2 }],
        sellerId: testSellerId
      });

      await storage.createSale({
        paymentMethod: 'card',
        items: [{ productId: testProduct2Id, quantity: 3 }],
        sellerId: testSellerId
      });

      const stats = await storage.getSalesStats();
      
      expect(stats.totalSales).toBe(2);
      expect(stats.totalRevenue).toBe(23.50); // (2 * 5.00) + (3 * 4.50)
    });

    it('deve identificar produtos mais vendidos', async () => {
      // Venda 1: 5 unidades do produto 1
      await storage.createSale({
        paymentMethod: 'cash',
        items: [{ productId: testProduct1Id, quantity: 5 }],
        sellerId: testSellerId
      });

      // Venda 2: 3 unidades do produto 2
      await storage.createSale({
        paymentMethod: 'card',
        items: [{ productId: testProduct2Id, quantity: 3 }],
        sellerId: testSellerId
      });

      // Venda 3: mais 2 unidades do produto 1
      await storage.createSale({
        paymentMethod: 'pix',
        items: [{ productId: testProduct1Id, quantity: 2 }],
        sellerId: testSellerId
      });

      const stats = await storage.getSalesStats();
      
      expect(stats.topProducts).toHaveLength(2);
      expect(stats.topProducts[0].productId).toBe(testProduct1Id);
      expect(stats.topProducts[0].quantity).toBe(7); // 5 + 2
      expect(stats.topProducts[0].name).toBe('Cerveja Brahma');
      
      expect(stats.topProducts[1].productId).toBe(testProduct2Id);
      expect(stats.topProducts[1].quantity).toBe(3);
    });

    it('deve limitar top products a 5 itens', async () => {
      // Criar 10 produtos diferentes
      const productIds: number[] = [];
      for (let i = 0; i < 10; i++) {
        const product = await storage.createProduct({
          name: `Produto ${i}`,
          brand: 'Marca',
          price: 10.00,
          quantity: 100,
          minStockLevel: 10,
          discount: 0,
          createdBy: testSellerId
        });
        productIds.push(product.id);
        
        // Vender cada produto
        await storage.createSale({
          paymentMethod: 'cash',
          items: [{ productId: product.id, quantity: i + 1 }],
          sellerId: testSellerId
        });
      }

      const stats = await storage.getSalesStats();
      
      expect(stats.topProducts.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Complex Sales Scenarios', () => {
    it('deve processar vendas simultâneas corretamente', async () => {
      const sale1Promise = storage.createSale({
        paymentMethod: 'cash',
        items: [{ productId: testProduct1Id, quantity: 10 }],
        sellerId: testSellerId
      });

      const sale2Promise = storage.createSale({
        paymentMethod: 'card',
        items: [{ productId: testProduct1Id, quantity: 15 }],
        sellerId: testSellerId
      });

      const [sale1, sale2] = await Promise.all([sale1Promise, sale2Promise]);

      expect(sale1.id).not.toBe(sale2.id);

      const product = await storage.getProduct(testProduct1Id);
      expect(product?.quantity).toBe(75); // 100 - 10 - 15
    });

    it('deve calcular corretamente venda com vários itens do mesmo produto', async () => {
      await storage.createSale({
        paymentMethod: 'cash',
        items: [
          { productId: testProduct1Id, quantity: 3 },
          { productId: testProduct2Id, quantity: 2 },
          { productId: testProduct1Id, quantity: 2 } // Produto 1 aparece 2 vezes
        ],
        sellerId: testSellerId
      });

      const product1 = await storage.getProduct(testProduct1Id);
      expect(product1?.quantity).toBe(95); // 100 - 3 - 2
    });

    it('deve manter integridade após múltiplas vendas', async () => {
      const initialStock = 100;
      let totalSold = 0;

      for (let i = 0; i < 5; i++) {
        const quantity = Math.floor(Math.random() * 10) + 1;
        totalSold += quantity;

        await storage.createSale({
          paymentMethod: 'cash',
          items: [{ productId: testProduct1Id, quantity }],
          sellerId: testSellerId
        });
      }

      const product = await storage.getProduct(testProduct1Id);
      expect(product?.quantity).toBe(initialStock - totalSold);

      const salesList = await storage.getSales();
      expect(salesList).toHaveLength(5);
    });
  });
});
