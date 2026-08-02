import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SuperAdminJwtGuard extends AuthGuard('jwt') {}

@Injectable()
export class SuperAdminAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: unknown;
    }>();

    if (!this.containsSuperAdmin(request.user)) {
      throw new ForbiddenException('SUPER_ADMIN access required');
    }

    return true;
  }

  private containsSuperAdmin(value: unknown, depth = 0): boolean {
    if (depth > 6) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().toUpperCase() === 'SUPER_ADMIN';
    }

    if (Array.isArray(value)) {
      return value.some((item) => this.containsSuperAdmin(item, depth + 1));
    }

    if (typeof value !== 'object' || value === null) {
      return false;
    }

    return Object.entries(value).some(([key, item]) => {
      const normalizedKey = key.toLowerCase();

      if (
        normalizedKey.includes('role') ||
        normalizedKey.includes('membership') ||
        normalizedKey === 'user'
      ) {
        return this.containsSuperAdmin(item, depth + 1);
      }

      return false;
    });
  }
}
