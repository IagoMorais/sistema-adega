import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../shared/schema';

/**
 * Middleware que verifica se o usuário está autenticado
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      error: 'Autenticação necessária',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  next();
}

/**
 * Middleware que verifica se o usuário tem uma das roles permitidas
 * @param allowedRoles - Array de roles que podem acessar o endpoint
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Não autenticado',
        code: 'NOT_AUTHENTICATED' 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Acesso negado. Roles permitidos: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }
    
    next();
  };
}

/**
 * Middleware que permite apenas administradores
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware que permite administradores e vendedores
 */
export const requireSeller = requireRole('admin', 'seller');

/**
 * Middleware que verifica se o usuário é o próprio ou um admin
 * Útil para endpoints como /users/:id onde um vendedor só pode ver seus próprios dados
 */
export function requireOwnershipOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Não autenticado',
      code: 'NOT_AUTHENTICATED' 
    });
  }

  const requestedUserId = parseInt(req.params.id || req.params.userId || '0');
  const isOwner = req.user.id === requestedUserId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      error: 'Acesso negado. Você só pode acessar seus próprios dados',
      code: 'ACCESS_DENIED',
      userRole: req.user.role
    });
  }

  next();
}

/**
 * Middleware que adiciona informações do usuário no contexto da requisição
 * Útil para logs e auditoria
 */
export function addUserContext(req: Request, res: Response, next: NextFunction) {
  if (req.user) {
    // Adicionar contexto do usuário nos headers de resposta (para desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-User-ID', req.user.id.toString());
      res.setHeader('X-User-Role', req.user.role);
    }
  }
  next();
}

/**
 * Middleware de log de acesso baseado em role
 */
export function logAccess(resource: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      console.log(`[${new Date().toISOString()}] ${req.user.role.toUpperCase()}(${req.user.username}) ${req.method} ${req.originalUrl} - Resource: ${resource}`);
    }
    next();
  };
}
