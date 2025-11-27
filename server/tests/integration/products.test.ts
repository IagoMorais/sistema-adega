import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { pool, db } from '../../db';
import { ensureTestDatabase } from '../setup-test-db';
import { storage } from '../../storage';
import { products as productsTable, stockMovements, users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import type { InsertProduct, Product } from '../../../shared/schema';

describe('Products Integration Tests', () => {
  let testUserId: number;

  beforeAll(async () => {
    await ensureTestDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Limpar todas as tabelas e recriar usuário de teste
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
      await client.query('SELECT setval(\'products_id_seq\', 1, false);');
      await client.query('SELECT setval(\'users_id_seq\', 1, false);');
      await client.query('SELECT setval(\'stock_movements_id_seq\', 1, false);');
      
      await client.query('SET CONSTRAINTS ALL IMMEDIATE;');
      
      // Criar usuário de teste para este teste específico
      const [testUser] = await db.insert(users).values({
        username: 'test_user_products',
        password: 'test_password',
        role: 'admin'
      }).returning();
      testUserId = testUser.id;
    } finally {
      client.release();
    }
  });

  describe('createProduct', () => {
    it('deve criar um produto com dados válidos', async () => {
      const productData: InsertProduct & { createdBy: number } = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      };

      const product = await storage.createProduct(productData);

      expect(product).toBeDefined();
      expect(product.id).toBeGreaterThan(0);
      expect(product.name).toBe('Cerveja Brahma');
      expect(product.brand).toBe('Brahma');
      expect(product.price).toBe('3.50');
      expect(product.quantity).toBe(100);
      expect(product.minStockLevel).toBe(10);
    });

    it('deve criar produto com imagem', async () => {
      const productData: InsertProduct & { createdBy: number } = {
        name: 'Cerveja Skol',
        brand: 'Skol',
        price: 4.00,
        quantity: 50,
        minStockLevel: 5,
        imageUrl: 'https://example.com/skol.jpg',
        discount: 0,
        createdBy: testUserId
      };

      const product = await storage.createProduct(productData);

      expect(product.imageUrl).toBe('https://example.com/skol.jpg');
    });

    it('deve criar produto com desconto', async () => {
      const productData: InsertProduct & { createdBy: number } = {
        name: 'Cerveja Antarctica',
        brand: 'Antarctica',
        price: 5.00,
        quantity: 75,
        minStockLevel: 8,
        discount: 10,
        createdBy: testUserId
      };

      const product = await storage.createProduct(productData);

      expect(product.discount).toBe('10.00');
    });

    it('deve criar múltiplos produtos', async () => {
      const product1: InsertProduct & { createdBy: number } = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      };

      const product2: InsertProduct & { createdBy: number } = {
        name: 'Cerveja Skol',
        brand: 'Skol',
        price: 4.00,
        quantity: 50,
        minStockLevel: 5,
        discount: 0,
        createdBy: testUserId
      };

      const p1 = await storage.createProduct(product1);
      const p2 = await storage.createProduct(product2);

      expect(p1.id).not.toBe(p2.id);
      expect(p1.name).toBe('Cerveja Brahma');
      expect(p2.name).toBe('Cerveja Skol');
    });

    it('deve registrar movimento de estoque inicial', async () => {
      const productData: InsertProduct & { createdBy: number } = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      };

      const product = await storage.createProduct(productData);

      const movements = await db.select()
        .from(stockMovements)
        .where(eq(stockMovements.productId, product.id));

      expect(movements).toHaveLength(1);
      expect(movements[0].type).toBe('in');
      expect(movements[0].quantity).toBe(100);
      expect(movements[0].reason).toBe('Initial Stock');
    });
  });

  describe('getProducts', () => {
    it('deve retornar lista vazia quando não há produtos', async () => {
      const products = await storage.getProducts();
      expect(products).toEqual([]);
    });

    it('deve retornar todos os produtos', async () => {
      await storage.createProduct({
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      await storage.createProduct({
        name: 'Cerveja Skol',
        brand: 'Skol',
        price: 4.00,
        quantity: 50,
        minStockLevel: 5,
        discount: 0,
        createdBy: testUserId
      });

      const products = await storage.getProducts();

      expect(products).toHaveLength(2);
      expect(products.some((p: Product) => p.name === 'Cerveja Brahma')).toBe(true);
      expect(products.some((p: Product) => p.name === 'Cerveja Skol')).toBe(true);
    });

    it('deve retornar produtos ordenados', async () => {
      await storage.createProduct({
        name: 'Produto A',
        brand: 'Marca A',
        price: 10.00,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      await storage.createProduct({
        name: 'Produto B',
        brand: 'Marca B',
        price: 20.00,
        quantity: 50,
        minStockLevel: 5,
        discount: 0,
        createdBy: testUserId
      });

      const products = await storage.getProducts();

      expect(products).toHaveLength(2);
      // Ordenados por nome (A vem antes de B)
      expect(products[0].name).toBe('Produto A');
      expect(products[1].name).toBe('Produto B');
    });
  });

  describe('getProduct', () => {
    it('deve retornar produto por ID', async () => {
      const created = await storage.createProduct({
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      const product = await storage.getProduct(created.id);

      expect(product).toBeDefined();
      expect(product?.id).toBe(created.id);
      expect(product?.name).toBe('Cerveja Brahma');
    });

    it('deve retornar undefined para ID inexistente', async () => {
      const product = await storage.getProduct(99999);
      expect(product).toBeUndefined();
    });
  });

  describe('updateProduct', () => {
    it('deve atualizar todos os campos do produto', async () => {
      const created = await storage.createProduct({
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      const updated = await storage.updateProduct(created.id, {
        name: 'Cerveja Brahma Duplo Malte',
        brand: 'Brahma',
        price: '4.50',
        quantity: 150,
        minStockLevel: 15,
        discount: '5.00'
      });

      expect(updated).toBeDefined();
      expect(updated.name).toBe('Cerveja Brahma Duplo Malte');
      expect(updated.price).toBe('4.50');
      expect(updated.quantity).toBe(150);
      expect(updated.minStockLevel).toBe(15);
      expect(updated.discount).toBe('5.00');
    });

    it('deve atualizar apenas campos específicos', async () => {
      const created = await storage.createProduct({
        name: 'Cerveja Skol',
        brand: 'Skol',
        price: 4.00,
        quantity: 50,
        minStockLevel: 5,
        discount: 0,
        createdBy: testUserId
      });

      const updated = await storage.updateProduct(created.id, {
        price: '4.50'
      });

      expect(updated.price).toBe('4.50');
      expect(updated.quantity).toBe(50); // não alterado
      expect(updated.name).toBe('Cerveja Skol'); // não alterado
    });

    it('deve lançar erro ao atualizar produto inexistente', async () => {
      await expect(
        storage.updateProduct(99999, { price: '10.00' })
      ).rejects.toThrow('Product not found');
    });

    it('deve atualizar updatedAt timestamp', async () => {
      const created = await storage.createProduct({
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      // Aguardar um momento para garantir diferença no timestamp
      await new Promise(resolve => setTimeout(resolve, 100));

      const updated = await storage.updateProduct(created.id, {
        name: 'Cerveja Brahma Atualizada'
      });

      expect(updated.updatedAt).toBeDefined();
      if (created.updatedAt && updated.updatedAt) {
        expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
          new Date(created.updatedAt).getTime()
        );
      }
    });
  });

  describe('deleteProduct', () => {
    it('deve deletar produto existente', async () => {
      const created = await storage.createProduct({
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      await storage.deleteProduct(created.id);

      const product = await storage.getProduct(created.id);
      expect(product).toBeUndefined();
    });

    it('deve retornar sem erro ao deletar produto inexistente', async () => {
      await expect(storage.deleteProduct(99999)).resolves.not.toThrow();
    });

    it('não deve afetar outros produtos ao deletar um', async () => {
      const p1 = await storage.createProduct({
        name: 'Produto 1',
        brand: 'Marca 1',
        price: 10.00,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      const p2 = await storage.createProduct({
        name: 'Produto 2',
        brand: 'Marca 2',
        price: 20.00,
        quantity: 50,
        minStockLevel: 5,
        discount: 0,
        createdBy: testUserId
      });

      await storage.deleteProduct(p1.id);

      const products = await storage.getProducts();
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe(p2.id);
    });
  });

  describe('getLowStockProducts', () => {
    it('deve identificar produtos abaixo do estoque mínimo', async () => {
      await storage.createProduct({
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 5,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      await storage.createProduct({
        name: 'Cerveja Skol',
        brand: 'Skol',
        price: 4.00,
        quantity: 50,
        minStockLevel: 5,
        discount: 0,
        createdBy: testUserId
      });

      const lowStock = await storage.getLowStockProducts();

      expect(lowStock).toHaveLength(1);
      expect(lowStock[0].name).toBe('Cerveja Brahma');
    });

    it('deve identificar produtos sem estoque', async () => {
      await storage.createProduct({
        name: 'Cerveja Esgotada',
        brand: 'Marca',
        price: 5.00,
        quantity: 0,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      const lowStock = await storage.getLowStockProducts();

      expect(lowStock).toHaveLength(1);
      expect(lowStock[0].name).toBe('Cerveja Esgotada');
      expect(lowStock[0].quantity).toBe(0);
    });

    it('não deve retornar produtos com estoque adequado', async () => {
      await storage.createProduct({
        name: 'Cerveja Com Estoque',
        brand: 'Marca',
        price: 5.00,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      const lowStock = await storage.getLowStockProducts();

      expect(lowStock).toHaveLength(0);
    });
  });

  describe('getProductsPaginated', () => {
    it('deve paginar produtos corretamente', async () => {
      // Criar 15 produtos
      for (let i = 1; i <= 15; i++) {
        await storage.createProduct({
          name: `Produto ${i}`,
          brand: 'Marca',
          price: 10.00,
          quantity: 100,
          minStockLevel: 10,
          discount: 0,
          createdBy: testUserId
        });
      }

      const page1 = await storage.getProductsPaginated(1, 10);
      expect(page1.data).toHaveLength(10);
      expect(page1.total).toBe(15);
      expect(page1.pages).toBe(2);
      expect(page1.page).toBe(1);

      const page2 = await storage.getProductsPaginated(2, 10);
      expect(page2.data).toHaveLength(5);
      expect(page2.page).toBe(2);
    });

    it('deve retornar página vazia se não houver produtos', async () => {
      const result = await storage.getProductsPaginated(1, 10);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });
  });

  describe('Price and Discount Calculations', () => {
    it('deve armazenar preço com 2 casas decimais', async () => {
      const product = await storage.createProduct({
        name: 'Cerveja',
        brand: 'Marca',
        price: 3.999,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      expect(product.price).toBe('4.00');
    });

    it('deve calcular preço com desconto', async () => {
      const product = await storage.createProduct({
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 10.00,
        quantity: 100,
        minStockLevel: 10,
        discount: 20,
        createdBy: testUserId
      });

      const priceWithDiscount = parseFloat(product.price) * (1 - parseFloat(product.discount) / 100);
      expect(priceWithDiscount).toBe(8.00);
    });
  });
});
