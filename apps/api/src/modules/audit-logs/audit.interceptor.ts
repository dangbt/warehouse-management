import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

const ACTION_MAP: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

// Skip these paths from audit logging
const SKIP_PATHS = ['/api/v1/auth/login', '/api/v1/audit-logs'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const path = req.url;

    // Only log mutating requests
    if (!ACTION_MAP[method]) return next.handle();
    if (SKIP_PATHS.some((p) => path.startsWith(p))) return next.handle();

    const userId = req.user?.id || null;
    const action = this.getAction(method, path);
    const resource = this.getResource(path);
    const resourceId = req.params?.id || null;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    return next.handle().pipe(
      tap((response) => {
        // Fire and forget — don't block response
        this.prisma.auditLog
          .create({
            data: {
              userId,
              action,
              resource,
              resourceId: resourceId || response?.id || null,
              newValues: method === 'DELETE' ? null : response || null,
              ipAddress: ip,
              userAgent,
              metadata: method !== 'GET' ? req.body : null,
            },
          })
          .catch(() => {}); // Silently fail — audit should not break app
      }),
    );
  }

  private getAction(method: string, path: string): string {
    if (path.includes('/approve')) return 'APPROVE';
    if (path.includes('/reject')) return 'REJECT';
    if (path.includes('/toggle-active')) return 'TOGGLE_ACTIVE';
    if (path.includes('/permissions')) return 'UPDATE_PERMISSIONS';
    return ACTION_MAP[method] || 'UNKNOWN';
  }

  private getResource(path: string): string {
    // /api/v1/ingredients/xxx → ingredients
    const parts = path.replace('/api/v1/', '').split('/');
    return parts[0] || 'unknown';
  }
}
