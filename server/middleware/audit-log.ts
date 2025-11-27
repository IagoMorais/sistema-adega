import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { auditLogs } from '../../shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * Interface para dados de auditoria
 */
interface AuditData {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW';
  resource: string;
  resourceId?: number;
  oldValues?: any;
  newValues?: any;
  metadata?: Record<string, any>;
}

/**
 * Função utilitária para criar log de auditoria
 */
export async function createAuditLog(
  userId: number | null,
  data: AuditData,
  req: Request
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      oldValues: data.oldValues,
      newValues: data.newValues,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
    });
  } catch (error) {
    // Log error but don't break the application
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Middleware de auditoria automática para operações CRUD
 */
export function auditMiddleware(resource: string, action: AuditData['action']) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    // Interceptar a resposta para capturar dados
    res.json = function(body: any) {
      // Só auditar se a operação foi bem-sucedida (status 200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id || null;
        
        // Dados específicos baseados na ação
        const auditData: AuditData = {
          action,
          resource,
          resourceId: extractResourceId(req, body),
          oldValues: req.body?.oldValues || null,
          newValues: extractNewValues(action, req, body),
          metadata: {
            endpoint: req.originalUrl,
            method: req.method,
            userRole: req.user?.role || 'anonymous'
          }
        };

        // Criar log assíncrono (não bloquear resposta)
        setImmediate(() => {
          createAuditLog(userId, auditData, req);
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Middleware para auditar login/logout
 */
export function auditAuth(action: 'LOGIN' | 'LOGOUT') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = action === 'LOGIN' ? body?.id : req.user?.id;
        const username = action === 'LOGIN' ? body?.username : req.user?.username;

        const auditData: AuditData = {
          action,
          resource: 'auth',
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
        // Auditar tentativas de login falharam
        if (action === 'LOGIN') {
          const auditData: AuditData = {
            action,
            resource: 'auth',
            metadata: {
              username: req.body?.username || 'unknown',
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

/**
 * Middleware para auditar visualizações importantes (relatórios, dados sensíveis)
 */
export function auditView(resource: string, sensitive = false) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Só auditar visualizações de dados sensíveis ou se for um guest
    const shouldAudit = sensitive || !req.user || req.user.role === 'seller';

    if (shouldAudit) {
      const originalJson = res.json;

      res.json = function(body: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const auditData: AuditData = {
            action: 'VIEW',
            resource,
            metadata: {
              endpoint: req.originalUrl,
              query: req.query,
              userRole: req.user?.role || 'anonymous',
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

/**
 * Extrair ID do recurso da requisição ou resposta
 */
function extractResourceId(req: Request, body: any): number | undefined {
  // Tentar extrair do parâmetro da URL
  const paramId = req.params.id || req.params.productId || req.params.saleId || req.params.userId;
  if (paramId) {
    const id = parseInt(paramId);
    if (!isNaN(id)) return id;
  }

  // Tentar extrair da resposta
  if (body && typeof body === 'object') {
    if (body.id) return body.id;
    if (body.data?.id) return body.data.id;
  }

  return undefined;
}

/**
 * Extrair novos valores baseado na ação
 */
function extractNewValues(action: AuditData['action'], req: Request, body: any): any {
  switch (action) {
    case 'CREATE':
      return req.body || body;
    
    case 'UPDATE':
      return req.body;
    
    case 'DELETE':
      return null;
    
    default:
      return null;
  }
}

/**
 * Middleware para capturar valores antigos antes de UPDATE/DELETE
 */
export function captureOldValues(getOldValuesFn: (req: Request) => Promise<any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const oldValues = await getOldValuesFn(req);
      req.body.oldValues = oldValues;
    } catch (error) {
      console.error('Failed to capture old values for audit:', error);
    }
    next();
  };
}

/**
 * Função para gerar relatório de auditoria
 */
export async function getAuditReport(options: {
  userId?: number;
  resource?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const {
    userId,
    resource,
    action,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = options;

  try {
    // Query builder baseado nos filtros
    let query = db.select().from(auditLogs);

    // Aplicar filtros
    const conditions = [];
    
    if (userId) conditions.push(`user_id = ${userId}`);
    if (resource) conditions.push(`resource = '${resource}'`);
    if (action) conditions.push(`action = '${action}'`);
    if (startDate) conditions.push(`created_at >= '${startDate.toISOString()}'`);
    if (endDate) conditions.push(`created_at <= '${endDate.toISOString()}'`);

    // Executar query com filtros
    const result = await query
      .orderBy(auditLogs.createdAt)
      .limit(limit)
      .offset(offset);

    return result;
  } catch (error) {
    console.error('Failed to generate audit report:', error);
    throw error;
  }
}

/**
 * Limpar logs antigos (para ser executado periodicamente)
 */
export async function cleanOldAuditLogs(daysToKeep = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db
      .delete(auditLogs)
      .where(lte(auditLogs.createdAt, cutoffDate));

    console.log(`Cleaned old audit logs older than ${daysToKeep} days`);
    return result;
  } catch (error) {
    console.error('Failed to clean old audit logs:', error);
    throw error;
  }
}
