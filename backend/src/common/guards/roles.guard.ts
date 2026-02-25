import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // pas de rôle requis
    }

    const { user } = context.switchToHttp().getRequest();
    console.log('🔍 RolesGuard - User:', user);
    console.log('🔍 RolesGuard - Required:', requiredRoles);
    console.log('🔍 RolesGuard - Match:', requiredRoles.includes(user?.role));
    
    if (!user || !user.role) {
      console.error('❌ RolesGuard - User ou role absent!');
      return false;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      console.error(`❌ RolesGuard - Rôle ${user.role} non autorisé. Autorisés: ${requiredRoles}`);
    }
    return hasRole;
  }
}