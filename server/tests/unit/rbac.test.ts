import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  requireAuth,
  requireRole,
  requireAdmin,
  requireSeller,
  requireOwnershipOrAdmin,
  addUserContext,
  logAccess
} from '../../middleware/rbac';
import type { User } from '../../../shared/schema';

describe('RBAC Middleware Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      isAuthenticated: vi.fn() as any,
      user: undefined,
      params: {},
      method: 'GET',
      originalUrl: '/test'
    };
    
    mockRes = {
      status: statusMock,
      setHeader: vi.fn()
    };
    
    nextFn = vi.fn();
  });

  describe('requireAuth', () => {
    it('deve permitir acesso quando usuário está autenticado', () => {
      mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
      mockReq.user = { id: 1, username: 'admin', role: 'admin' } as User;

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('deve bloquear acesso quando usuário não está autenticado', () => {
      mockReq.isAuthenticated = vi.fn().mockReturnValue(false);
      mockReq.user = undefined;

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Autenticação necessária',
        code: 'AUTHENTICATION_REQUIRED'
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('deve bloquear acesso quando isAuthenticated retorna true mas user é undefined', () => {
      mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
      mockReq.user = undefined;

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('deve permitir acesso para admin quando role é permitido', () => {
      mockReq.user = { id: 1, username: 'admin', role: 'admin' } as User;
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('deve permitir acesso para seller quando role é permitido', () => {
      mockReq.user = { id: 2, username: 'seller', role: 'seller' } as User;
      const middleware = requireRole('admin', 'seller');

      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('deve bloquear acesso quando role não é permitido', () => {
      mockReq.user = { id: 2, username: 'seller', role: 'seller' } as User;
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Acesso negado. Roles permitidos: admin',
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: 'seller',
        requiredRoles: ['admin']
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('deve bloquear acesso quando usuário não está autenticado', () => {
      mockReq.user = undefined;
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('deve permitir acesso para admin', () => {
      mockReq.user = { id: 1, username: 'admin', role: 'admin' } as User;

      requireAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('deve bloquear acesso para seller', () => {
      mockReq.user = { id: 2, username: 'seller', role: 'seller' } as User;

      requireAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  describe('requireSeller', () => {
    it('deve permitir acesso para admin', () => {
      mockReq.user = { id: 1, username: 'admin', role: 'admin' } as User;

      requireSeller(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('deve permitir acesso para seller', () => {
      mockReq.user = { id: 2, username: 'seller', role: 'seller' } as User;

      requireSeller(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnershipOrAdmin', () => {
    it('deve permitir acesso para admin acessando dados de outro usuário', () => {
      mockReq.user = { id: 1, username: 'admin', role: 'admin' } as User;
      mockReq.params = { id: '2' };

      requireOwnershipOrAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('deve permitir acesso para usuário acessando seus próprios dados', () => {
      mockReq.user = { id: 2, username: 'seller', role: 'seller' } as User;
      mockReq.params = { id: '2' };

      requireOwnershipOrAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('deve bloquear acesso para seller acessando dados de outro usuário', () => {
      mockReq.user = { id: 2, username: 'seller', role: 'seller' } as User;
      mockReq.params = { id: '3' };

      requireOwnershipOrAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Acesso negado. Você só pode acessar seus próprios dados',
        code: 'ACCESS_DENIED',
        userRole: 'seller'
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('deve funcionar com parâmetro userId', () => {
      mockReq.user = { id: 2, username: 'seller', role: 'seller' } as User;
      mockReq.params = { userId: '2' };

      requireOwnershipOrAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('deve bloquear quando usuário não está autenticado', () => {
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      requireOwnershipOrAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  describe('addUserContext', () => {
    it('deve adicionar headers de contexto em desenvolvimento', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      mockReq.user = { id: 1, username: 'admin', role: 'admin' } as User;

      addUserContext(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-User-ID', '1');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-User-Role', 'admin');
      expect(nextFn).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('não deve adicionar headers em produção', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockReq.user = { id: 1, username: 'admin', role: 'admin' } as User;

      addUserContext(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.setHeader).not.toHaveBeenCalled();
      expect(nextFn).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('deve funcionar sem usuário autenticado', () => {
      mockReq.user = undefined;

      addUserContext(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('logAccess', () => {
    it('deve logar acesso com informações do usuário', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockReq.user = { id: 1, username: 'admin', role: 'admin' } as User;
      mockReq.method = 'GET';
      mockReq.originalUrl = '/api/products';

      const middleware = logAccess('Products');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(consoleSpy).toHaveBeenCalled();
      const logMessage = consoleSpy.mock.calls[0][0];
      expect(logMessage).toContain('ADMIN');
      expect(logMessage).toContain('admin');
      expect(logMessage).toContain('GET');
      expect(logMessage).toContain('/api/products');
      expect(logMessage).toContain('Products');
      expect(nextFn).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('não deve logar quando usuário não está autenticado', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockReq.user = undefined;

      const middleware = logAccess('Products');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(nextFn).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
