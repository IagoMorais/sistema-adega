import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { pool, db } from '../../db';
import { ensureTestDatabase } from '../setup-test-db';
import { storage } from '../../storage';
import { users, auditLogs } from '../../../shared/schema';
import { createAuditLog } from '../../middleware/audit-log';
import { eq } from 'drizzle-orm';

describe('Audit Integration Tests', () => {
  let testUserId: number;
  let testAdminId: number;

  // Helper para criar Request mock
  const createMockReq = (ip = '127.0.0.1', userAgent = 'test-agent') => ({
    ip,
    get: (header: string) => header === 'user-agent' ? userAgent : undefined,
    connection: { remoteAddress: ip }
  } as any);

  beforeAll(async () => {
    await ensureTestDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Limpar todas as tabelas e recriar usuários de teste
    const client = await pool.connect();
    try {
      await client.query('SET CONSTRAINTS ALL DEFERRED;');
      await client.query('TRUNCATE TABLE audit_logs, stock_movements, sale_items, sales, products, users, session RESTART IDENTITY CASCADE');
      await client.query('SET CONSTRAINTS ALL IMMEDIATE;');
      
      // Criar usuários de teste para este teste específico
      const [admin] = await db.insert(users).values({
        username: 'admin_test_' + Date.now(),
        password: 'test_password',
        role: 'admin'
      }).returning();
      testAdminId = admin.id;

      const [seller] = await db.insert(users).values({
        username: 'seller_test_' + Date.now(),
        password: 'test_password',
        role: 'seller'
      }).returning();
      testUserId = seller.id;
    } finally {
      client.release();
    }
  });

  describe('createAuditLog', () => {
    it('deve registrar ação de criação', async () => {
      await createAuditLog(testUserId, {
        action: 'CREATE',
        resource: 'product',
        resourceId: 1,
        newValues: { name: 'Cerveja Brahma', price: 5.00 }
      }, createMockReq());

      const logs = await db.select().from(auditLogs);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe(testUserId);
      expect(logs[0].action).toBe('CREATE');
      expect(logs[0].resource).toBe('product');
      expect(logs[0].resourceId).toBe(1);
      expect(logs[0].ipAddress).toBe('127.0.0.1');
      expect(logs[0].userAgent).toBe('test-agent');
    });

    it('deve registrar ação de atualização com valores antigos e novos', async () => {
      await createAuditLog(testUserId, {
        action: 'UPDATE',
        resource: 'product',
        resourceId: 1,
        oldValues: { name: 'Cerveja Antiga', price: 4.00 },
        newValues: { name: 'Cerveja Nova', price: 5.00 }
      }, createMockReq());

      const logs = await db.select().from(auditLogs);
      
      expect(logs[0].action).toBe('UPDATE');
      expect(logs[0].oldValues).toEqual({ name: 'Cerveja Antiga', price: 4.00 });
      expect(logs[0].newValues).toEqual({ name: 'Cerveja Nova', price: 5.00 });
    });

    it('deve registrar ação de deleção', async () => {
      await createAuditLog(testAdminId, {
        action: 'DELETE',
        resource: 'product',
        resourceId: 1,
        oldValues: { name: 'Produto Deletado', price: 10.00 }
      }, createMockReq());

      const logs = await db.select().from(auditLogs);
      
      expect(logs[0].action).toBe('DELETE');
      expect(logs[0].oldValues).toBeDefined();
      expect(logs[0].newValues).toBeNull();
    });

    it('deve registrar múltiplas ações', async () => {
      await createAuditLog(testUserId, {
        action: 'CREATE',
        resource: 'product',
        resourceId: 1,
        newValues: { name: 'Produto 1' }
      }, createMockReq());

      await createAuditLog(testAdminId, {
        action: 'UPDATE',
        resource: 'product',
        resourceId: 1,
        oldValues: { name: 'Produto 1' },
        newValues: { name: 'Produto 1 Atualizado' }
      }, createMockReq());

      await createAuditLog(testAdminId, {
        action: 'DELETE',
        resource: 'product',
        resourceId: 1,
        oldValues: { name: 'Produto 1 Atualizado' }
      }, createMockReq());

      const logs = await db.select().from(auditLogs);
      expect(logs).toHaveLength(3);
    });

    it('deve registrar ações em diferentes recursos', async () => {
      await createAuditLog(testUserId, {
        action: 'CREATE',
        resource: 'product',
        resourceId: 1,
        newValues: { name: 'Produto' }
      }, createMockReq());

      await createAuditLog(testAdminId, {
        action: 'CREATE',
        resource: 'sale',
        resourceId: 1,
        newValues: { totalAmount: 50.00 }
      }, createMockReq());

      await createAuditLog(testAdminId, {
        action: 'CREATE',
        resource: 'user',
        resourceId: 3,
        newValues: { username: 'new_user' }
      }, createMockReq());

      const logs = await db.select().from(auditLogs);
      expect(logs).toHaveLength(3);
      
      const resources = logs.map(log => log.resource);
      expect(resources).toContain('product');
      expect(resources).toContain('sale');
      expect(resources).toContain('user');
    });

    it('deve preservar informações de IP e User Agent', async () => {
      await createAuditLog(testUserId, {
        action: 'CREATE',
        resource: 'product',
        resourceId: 1,
        newValues: { name: 'Produto' }
      }, createMockReq('192.168.100.50', 'Mozilla/5.0'));

      const logs = await db.select().from(auditLogs);
      
      expect(logs[0].ipAddress).toBe('192.168.100.50');
      expect(logs[0].userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('getAuditLogs', () => {
    beforeEach(async () => {
      // Criar alguns logs de teste
      await createAuditLog(testUserId, {
        action: 'CREATE',
        resource: 'product',
        resourceId: 1,
        newValues: { name: 'Produto 1' }
      }, createMockReq());

      await createAuditLog(testAdminId, {
        action: 'UPDATE',
        resource: 'product',
        resourceId: 1,
        oldValues: { price: 5.00 },
        newValues: { price: 6.00 }
      }, createMockReq('192.168.1.1'));

      await createAuditLog(testUserId, {
        action: 'CREATE',
        resource: 'sale',
        resourceId: 1,
        newValues: { totalAmount: 50.00 }
      }, createMockReq());

      await createAuditLog(testAdminId, {
        action: 'DELETE',
        resource: 'product',
        resourceId: 2,
        oldValues: { name: 'Produto Deletado' }
      }, createMockReq('192.168.1.1'));
    });

    it('deve retornar todos os logs sem filtros', async () => {
      const logs = await storage.getAuditLogs({});
      expect(logs.length).toBeGreaterThanOrEqual(4);
    });

    it('deve filtrar logs por userId', async () => {
      const logs = await storage.getAuditLogs({ userId: testUserId });
      
      expect(logs.length).toBeGreaterThan(0);
      logs.forEach(log => {
        expect(log.userId).toBe(testUserId);
      });
    });

    it('deve filtrar logs por resource', async () => {
      const logs = await storage.getAuditLogs({ resource: 'product' });
      
      expect(logs.length).toBeGreaterThan(0);
      logs.forEach(log => {
        expect(log.resource).toBe('product');
      });
    });

    it('deve filtrar logs por action', async () => {
      const logs = await storage.getAuditLogs({ action: 'CREATE' });
      
      expect(logs.length).toBeGreaterThan(0);
      logs.forEach(log => {
        expect(log.action).toBe('CREATE');
      });
    });

    it('deve filtrar logs por data', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const logs = await storage.getAuditLogs({
        startDate: yesterday,
        endDate: tomorrow
      });

      expect(logs.length).toBeGreaterThan(0);
    });

    it('deve aplicar múltiplos filtros simultaneamente', async () => {
      const logs = await storage.getAuditLogs({
        userId: testUserId,
        resource: 'product',
        action: 'CREATE'
      });

      logs.forEach(log => {
        expect(log.userId).toBe(testUserId);
        expect(log.resource).toBe('product');
        expect(log.action).toBe('CREATE');
      });
    });

    it('deve respeitar o limite de resultados', async () => {
      const logs = await storage.getAuditLogs({ limit: 2 });
      expect(logs.length).toBeLessThanOrEqual(2);
    });

    it('deve aplicar paginação com offset', async () => {
      const page1 = await storage.getAuditLogs({ limit: 2, offset: 0 });
      const page2 = await storage.getAuditLogs({ limit: 2, offset: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('Audit Trail Integrity', () => {
    it('deve criar log de auditoria ao criar produto', async () => {
      const product = await storage.createProduct({
        name: 'Cerveja Test',
        brand: 'Test Brand',
        price: 5.00,
        quantity: 100,
        minStockLevel: 10,
        discount: 0,
        createdBy: testUserId
      });

      await createAuditLog(testUserId, {
        action: 'CREATE',
        resource: 'product',
        resourceId: product.id,
        newValues: {
          name: product.name,
          price: product.price,
          quantity: product.quantity
        }
      }, createMockReq());

      const logs = await storage.getAuditLogs({ resource: 'product' });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('deve manter histórico completo de alterações de um recurso', async () => {
      const productId = 1;

      await createAuditLog(testUserId, {
        action: 'CREATE',
        resource: 'product',
        resourceId: productId,
        newValues: { name: 'Produto Original', price: 10.00 }
      }, createMockReq());

      await createAuditLog(testUserId, {
        action: 'UPDATE',
        resource: 'product',
        resourceId: productId,
        oldValues: { price: 10.00 },
        newValues: { price: 12.00 }
      }, createMockReq());

      await createAuditLog(testAdminId, {
        action: 'UPDATE',
        resource: 'product',
        resourceId: productId,
        oldValues: { price: 12.00 },
        newValues: { price: 15.00 }
      }, createMockReq('192.168.1.1'));

      const logs = await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.resourceId, productId));

      expect(logs).toHaveLength(3);
      expect(logs[0].action).toBe('CREATE');
      expect(logs[1].action).toBe('UPDATE');
      expect(logs[2].action).toBe('UPDATE');
    });

    it('deve registrar quem fez cada alteração', async () => {
      await createAuditLog(testUserId, {
        action: 'CREATE',
        resource: 'product',
        resourceId: 1,
        newValues: { name: 'Produto' }
      }, createMockReq());

      await createAuditLog(testAdminId, {
        action: 'UPDATE',
        resource: 'product',
        resourceId: 1,
        oldValues: { name: 'Produto' },
        newValues: { name: 'Produto Atualizado' }
      }, createMockReq('192.168.1.1'));

      const sellerLogs = await storage.getAuditLogs({ userId: testUserId });
      const adminLogs = await storage.getAuditLogs({ userId: testAdminId });

      expect(sellerLogs.length).toBeGreaterThan(0);
      expect(adminLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Audit Performance', () => {
    it('deve lidar com grande volume de logs', async () => {
      // Criar 100 logs
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          createAuditLog(
            i % 2 === 0 ? testUserId : testAdminId,
            {
              action: i % 3 === 0 ? 'CREATE' : i % 3 === 1 ? 'UPDATE' : 'DELETE',
              resource: 'product',
              resourceId: i,
              newValues: { test: true }
            },
            createMockReq()
          )
        );
      }

      await Promise.all(promises);

      const logs = await storage.getAuditLogs({ limit: 100 });
      expect(logs.length).toBe(100);
    });

    it('deve filtrar eficientemente em grande volume', async () => {
      // Criar logs variados
      for (let i = 0; i < 50; i++) {
        await createAuditLog(testUserId, {
          action: 'CREATE',
          resource: i % 2 === 0 ? 'product' : 'sale',
          resourceId: i,
          newValues: { test: true }
        }, createMockReq());
      }

      const productLogs = await storage.getAuditLogs({ resource: 'product' });
      const saleLogs = await storage.getAuditLogs({ resource: 'sale' });

      expect(productLogs.length + saleLogs.length).toBe(50);
    });
  });
});
