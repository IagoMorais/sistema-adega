import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limit personalizado baseado na role do usuário
 * Admins têm limites mais altos que vendedores
 */
export function createRoleBasedRateLimit(options: {
  windowMs?: number;
  adminMax?: number;
  sellerMax?: number;
  guestMax?: number;
  message?: string;
}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutos
    adminMax = 300, // Admins podem fazer 300 requests por janela
    sellerMax = 150, // Sellers podem fazer 150 requests por janela
    guestMax = 50, // Usuários não autenticados: 50 requests
    message = 'Muitas requisições. Tente novamente em alguns minutos.'
  } = options;

  return rateLimit({
    windowMs,
    max: (req: Request) => {
      // Se não está autenticado
      if (!req.user) {
        return guestMax;
      }

      // Baseado na role do usuário
      switch (req.user.role) {
        case 'admin':
          return adminMax;
        case 'seller':
          return sellerMax;
        default:
          return guestMax;
      }
    },
    message: {
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: windowMs / 1000
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Remover keyGenerator customizado para evitar problemas com IPv6
    // A biblioteca express-rate-limit lida com IPv6 automaticamente
    skip: (req: Request) => {
      // Pular rate limit para requisições de localhost em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        const ip = req.ip || req.socket.remoteAddress || '';
        if (ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost')) {
          return true;
        }
      }
      return false;
    },
    // Log quando o rate limit é atingido (será tratado no handler)
    handler: (req: Request, res: Response) => {
      const user = req.user ? `${req.user.role}(${req.user.username})` : 'guest';
      console.warn(`[RATE LIMIT] ${user} from ${req.ip} exceeded rate limit for ${req.originalUrl}`);
      
      res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: windowMs / 1000
      });
    }
  });
}

/**
 * Rate limit para endpoints gerais (autenticação, listagens)
 */
export const generalRateLimit = createRoleBasedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  adminMax: 300,
  sellerMax: 150,
  guestMax: 50
});

/**
 * Rate limit mais restritivo para operações críticas (criação, edição, exclusão)
 */
export const criticalRateLimit = createRoleBasedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  adminMax: 100,
  sellerMax: 50,
  guestMax: 10,
  message: 'Muitas operações críticas. Aguarde antes de tentar novamente.'
});

/**
 * Rate limit muito restritivo para autenticação (previne ataques de força bruta)
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // A biblioteca express-rate-limit lida com IPv6 automaticamente
  // Não é necessário keyGenerator customizado
  handler: (req: Request, res: Response) => {
    console.warn(`[AUTH RATE LIMIT] Too many login attempts from ${req.ip}`);
    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Rate limit para APIs de relatórios (que podem ser pesadas)
 */
export const reportsRateLimit = createRoleBasedRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  adminMax: 20, // Máximo 20 relatórios por admin a cada 5 minutos
  sellerMax: 5,  // Máximo 5 relatórios por seller a cada 5 minutos
  guestMax: 0,   // Guests não podem acessar relatórios
  message: 'Muitas consultas de relatórios. Aguarde antes de solicitar novos relatórios.'
});

/**
 * Rate limit para upload de imagens
 */
export const uploadRateLimit = createRoleBasedRateLimit({
  windowMs: 60 * 1000, // 1 minuto
  adminMax: 20, // 20 uploads por minuto
  sellerMax: 5,  // 5 uploads por minuto
  guestMax: 0,   // Guests não podem fazer upload
  message: 'Muitos uploads. Aguarde antes de enviar mais arquivos.'
});

/**
 * Middleware que aplica diferentes rate limits baseado no endpoint
 */
export function smartRateLimit(req: Request, res: Response, next: any) {
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();

  // Endpoints de autenticação
  if (path.includes('/login') || path.includes('/auth')) {
    return authRateLimit(req, res, next);
  }

  // Endpoints de upload
  if (path.includes('/upload') || path.includes('/image')) {
    return uploadRateLimit(req, res, next);
  }

  // Endpoints de relatórios
  if (path.includes('/report') || path.includes('/dashboard') || path.includes('/stats')) {
    return reportsRateLimit(req, res, next);
  }

  // Operações críticas (POST, PUT, DELETE)
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    return criticalRateLimit(req, res, next);
  }

  // Endpoints gerais
  return generalRateLimit(req, res, next);
}

/**
 * Middleware para bypass do rate limit em desenvolvimento
 */
export function developmentRateLimitBypass(req: Request, res: Response, next: any) {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_RATE_LIMIT === 'true') {
    return next();
  }
  return smartRateLimit(req, res, next);
}
