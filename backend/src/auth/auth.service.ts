import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────

  private buildToken(user: any) {
    return this.jwtService.sign({
      sub:  user._id,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email,
      role:  user.role,
    });
  }

  private buildUserPayload(user: any) {
    return {
      userId: user._id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      photoUrl: user.photoUrl,
      mustChangePassword: user.mustChangePassword ?? false,
      isProfileComplete: user.isProfileComplete ?? false,
    };
  }

  // ── Email / password login ─────────────────────────────────────────

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Mot de passe incorrect');

    // Vérifier expiration du mot de passe temporaire
    if (user.passwordExpiresAt && new Date() > user.passwordExpiresAt) {
      throw new UnauthorizedException(
        'Votre mot de passe temporaire a expiré (24 h). Contactez l\'administrateur.',
      );
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    await this.usersService.updateOnlineStatus(user._id.toString(), true);

    return {
      accessToken: this.buildToken(user),
      user: this.buildUserPayload(user),
    };
  }

  // ── GitHub OAuth login (SUPERADMIN uniquement) ─────────────────────

  async loginWithGithub(profile: {
    githubId: string;
    email: string;
    name: string;
  }) {
    // 1. Chercher par githubId
    let user = await this.usersService.findByGithubId(profile.githubId);

    // Correction : si le githubId est lié à un compte non-SUPERADMIN
    // (erreur d'une tentative précédente), on délie et on recommence
    if (user && user.role !== 'SUPERADMIN') {
      await this.usersService.update(user._id.toString(), { githubId: null });
      user = null;
    }

    if (!user) {
      // 2. Lier au SUPERADMIN du système (unique admin)
      user = await this.usersService.findSuperAdmin();

      if (!user) {
        throw new ForbiddenException(
          'Aucun compte Super Administrateur trouvé dans le système.',
        );
      }

      await this.usersService.update(user._id.toString(), {
        githubId: profile.githubId,
      });

      // Recharger après update pour avoir le doc à jour
      user = await this.usersService.findSuperAdmin();
      if (!user) throw new ForbiddenException('Super Administrateur introuvable après mise à jour.');
    }

    await this.usersService.updateOnlineStatus(user._id.toString(), true);

    return {
      accessToken: this.buildToken(user),
      user: this.buildUserPayload(user),
    };
  }

  // ── Changer le mot de passe (première connexion) ───────────────────

  async changePassword(userId: string, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(userId, {
      password: hashed,
      mustChangePassword: false,
      passwordExpiresAt: null,
    });
    return { message: 'Mot de passe mis à jour avec succès.' };
  }
}
