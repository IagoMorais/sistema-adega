import { describe, it, expect } from 'vitest';
import {
  insertProductSchema,
  insertUserSchema,
  insertUserInternalSchema,
  createSaleSchema,
  type InsertProduct,
  type InsertUser,
  type CreateSaleInput
} from '../../../shared/schema';

describe('Validation Schemas Tests', () => {
  describe('insertProductSchema', () => {
    it('deve validar produto com dados válidos', () => {
      const validProduct = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        imageUrl: 'https://example.com/brahma.jpg',
        discount: 0
      };

      const result = insertProductSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Cerveja Brahma');
        expect(result.data.price).toBe(3.50);
        expect(result.data.quantity).toBe(100);
      }
    });

    it('deve aceitar preço como string e converter para número', () => {
      const product = {
        name: 'Cerveja Skol',
        brand: 'Skol',
        price: '4.50',
        quantity: 50,
        minStockLevel: 5
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price).toBe(4.50);
        expect(typeof result.data.price).toBe('number');
      }
    });

    it('deve aceitar preço com vírgula e converter', () => {
      const product = {
        name: 'Cerveja Antarctica',
        brand: 'Antarctica',
        price: '5,75',
        quantity: 30,
        minStockLevel: 5
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price).toBe(5.75);
      }
    });

    it('deve rejeitar produto sem nome', () => {
      const product = {
        name: '',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('Nome é obrigatório'))).toBe(true);
      }
    });

    it('deve rejeitar produto sem marca', () => {
      const product = {
        name: 'Cerveja',
        brand: '',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('Marca é obrigatória'))).toBe(true);
      }
    });

    it('deve rejeitar preço negativo', () => {
      const product = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: -5,
        quantity: 100,
        minStockLevel: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('Preço'))).toBe(true);
      }
    });

    it('deve rejeitar quantidade negativa', () => {
      const product = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: -10,
        minStockLevel: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('Quantidade'))).toBe(true);
      }
    });

    it('deve rejeitar quantidade não inteira', () => {
      const product = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 10.5,
        minStockLevel: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('inteiro'))).toBe(true);
      }
    });

    it('deve usar 0 como valor padrão para desconto se não fornecido', () => {
      const product = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.discount).toBe(0);
      }
    });

    it('deve aceitar desconto válido', () => {
      const product = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        discount: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.discount).toBe(10);
      }
    });

    it('deve rejeitar desconto negativo', () => {
      const product = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        discount: -5
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(false);
    });

    it('deve aceitar imageUrl opcional', () => {
      const productWithImage = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10,
        imageUrl: 'https://example.com/brahma.jpg'
      };

      const productWithoutImage = {
        name: 'Cerveja Skol',
        brand: 'Skol',
        price: 4.50,
        quantity: 50,
        minStockLevel: 5
      };

      expect(insertProductSchema.safeParse(productWithImage).success).toBe(true);
      expect(insertProductSchema.safeParse(productWithoutImage).success).toBe(true);
    });
  });

  describe('insertUserSchema', () => {
    it('deve validar usuário com dados válidos', () => {
      const validUser = {
        username: 'john_doe',
        password: 'senha123',
        confirmPassword: 'senha123',
        role: 'seller' as const
      };

      const result = insertUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('john_doe');
        expect(result.data.role).toBe('seller');
      }
    });

    it('deve usar "seller" como role padrão', () => {
      const user = {
        username: 'john_doe',
        password: 'senha123',
        confirmPassword: 'senha123'
      };

      const result = insertUserSchema.safeParse(user);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('seller');
      }
    });

    it('deve rejeitar username muito curto', () => {
      const user = {
        username: 'ab',
        password: 'senha123',
        confirmPassword: 'senha123',
        role: 'seller' as const
      };

      const result = insertUserSchema.safeParse(user);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('at least 3 characters'))).toBe(true);
      }
    });

    it('deve rejeitar senha muito curta', () => {
      const user = {
        username: 'john_doe',
        password: '12345',
        confirmPassword: '12345',
        role: 'seller' as const
      };

      const result = insertUserSchema.safeParse(user);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('at least 6 characters'))).toBe(true);
      }
    });

    it('deve rejeitar quando senhas não coincidem', () => {
      const user = {
        username: 'john_doe',
        password: 'senha123',
        confirmPassword: 'senha456',
        role: 'seller' as const
      };

      const result = insertUserSchema.safeParse(user);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes("don't match"))).toBe(true);
      }
    });

    it('deve validar role admin', () => {
      const user = {
        username: 'admin_user',
        password: 'senha123',
        confirmPassword: 'senha123',
        role: 'admin' as const
      };

      const result = insertUserSchema.safeParse(user);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('admin');
      }
    });

    it('deve trimmar username', () => {
      const user = {
        username: '  john_doe  ',
        password: 'senha123',
        confirmPassword: 'senha123',
        role: 'seller' as const
      };

      const result = insertUserSchema.safeParse(user);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('john_doe');
      }
    });
  });

  describe('insertUserInternalSchema', () => {
    it('deve validar usuário sem confirmPassword', () => {
      const validUser = {
        username: 'john_doe',
        password: 'senha123',
        role: 'seller' as const
      };

      const result = insertUserInternalSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('john_doe');
        expect(result.data.password).toBe('senha123');
        expect(result.data.role).toBe('seller');
      }
    });

    it('deve rejeitar username muito curto', () => {
      const user = {
        username: 'ab',
        password: 'senha123',
        role: 'seller' as const
      };

      const result = insertUserInternalSchema.safeParse(user);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar senha muito curta', () => {
      const user = {
        username: 'john_doe',
        password: '12345',
        role: 'seller' as const
      };

      const result = insertUserInternalSchema.safeParse(user);
      expect(result.success).toBe(false);
    });
  });

  describe('createSaleSchema', () => {
    it('deve validar venda com dados válidos', () => {
      const validSale = {
        paymentMethod: 'cash',
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 }
        ]
      };

      const result = createSaleSchema.safeParse(validSale);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.paymentMethod).toBe('cash');
        expect(result.data.items).toHaveLength(2);
      }
    });

    it('deve aceitar diferentes métodos de pagamento', () => {
      const methods = ['cash', 'card', 'pix'];
      
      methods.forEach(method => {
        const sale = {
          paymentMethod: method,
          items: [{ productId: 1, quantity: 1 }]
        };

        const result = createSaleSchema.safeParse(sale);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar venda sem método de pagamento', () => {
      const sale = {
        paymentMethod: '',
        items: [{ productId: 1, quantity: 1 }]
      };

      const result = createSaleSchema.safeParse(sale);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('Método de pagamento obrigatório'))).toBe(true);
      }
    });

    it('deve rejeitar venda sem itens', () => {
      const sale = {
        paymentMethod: 'cash',
        items: []
      };

      const result = createSaleSchema.safeParse(sale);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.message.includes('pelo menos um item'))).toBe(true);
      }
    });

    it('deve rejeitar item com productId inválido', () => {
      const sale = {
        paymentMethod: 'cash',
        items: [{ productId: -1, quantity: 1 }]
      };

      const result = createSaleSchema.safeParse(sale);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar item com quantidade zero', () => {
      const sale = {
        paymentMethod: 'cash',
        items: [{ productId: 1, quantity: 0 }]
      };

      const result = createSaleSchema.safeParse(sale);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar item com quantidade negativa', () => {
      const sale = {
        paymentMethod: 'cash',
        items: [{ productId: 1, quantity: -5 }]
      };

      const result = createSaleSchema.safeParse(sale);
      expect(result.success).toBe(false);
    });

    it('deve validar venda com múltiplos itens', () => {
      const sale = {
        paymentMethod: 'pix',
        items: [
          { productId: 1, quantity: 3 },
          { productId: 2, quantity: 2 },
          { productId: 3, quantity: 5 }
        ]
      };

      const result = createSaleSchema.safeParse(sale);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(3);
      }
    });
  });

  describe('Edge Cases and Complex Validations', () => {
    it('deve lidar com espaços em branco em strings', () => {
      const product = {
        name: '   Cerveja Brahma   ',
        brand: '   Brahma   ',
        price: 3.50,
        quantity: 100,
        minStockLevel: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Cerveja Brahma');
        expect(result.data.brand).toBe('Brahma');
      }
    });

    it('deve rejeitar preço inválido (não numérico)', () => {
      const product = {
        name: 'Cerveja Brahma',
        brand: 'Brahma',
        price: 'abc',
        quantity: 100,
        minStockLevel: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(false);
    });

    it('deve aceitar preço zero', () => {
      const product = {
        name: 'Produto Gratuito',
        brand: 'Teste',
        price: 0,
        quantity: 100,
        minStockLevel: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price).toBe(0);
      }
    });

    it('deve aceitar quantidade zero', () => {
      const product = {
        name: 'Produto Esgotado',
        brand: 'Teste',
        price: 5.00,
        quantity: 0,
        minStockLevel: 10
      };

      const result = insertProductSchema.safeParse(product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(0);
      }
    });
  });
});
