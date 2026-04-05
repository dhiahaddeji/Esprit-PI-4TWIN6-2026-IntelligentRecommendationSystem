import {
  Controller,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

function generatePassword(length = 12): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$&*-_';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

@Controller('admin')
export class SuperAdminController {
  constructor(
    private usersService: UsersService,
    private mailService: MailService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'HR', 'MANAGER')
  @Get('users')
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'HR', 'MANAGER')
  @Get('user/:id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('create-user')
  async createUser(@Body() body: any) {
    const tempPassword = generatePassword();
    const passwordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.usersService.create({
      ...body,
      password: tempPassword,
      mustChangePassword: true,
      passwordExpiresAt,
      isProfileComplete: false,
      status: 'ACTIVE',
      en_ligne: false,
    });

    await this.mailService.sendWelcomeWithCredentials({
      to: body.email,
      name: body.name,
      role: body.role,
      password: tempPassword,
    });

    return {
      message: 'Compte créé et email envoyé.',
      userId: user._id,
      email: user.email,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Patch('update-user/:id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Delete('delete-user/:id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('check-matricule/:matricule')
  async checkMatricule(@Param('matricule') matricule: string) {
    const exists = await this.usersService.findByMatricule(matricule);
    return { exists: !!exists };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('next-matricule/:role')
  async nextMatricule(@Param('role') role: string) {
    const matricule = await this.usersService.nextMatricule(role);
    return { matricule };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Patch('suspend-user/:id')
  async suspendUser(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    // Récupérer l'utilisateur existant
    const user = await this.usersService.findById(id);

    // Mettre à jour le statut à 'SUSPENDED'
    const suspendedUser = await this.usersService.update(id, {
      status: 'SUSPENDED',
    });

    // Envoyer l'email de notification
    await this.mailService.sendAccountSuspendedEmail({
      to: user.email,
      name: user.name,
      reason: body.reason,
    });

    return {
      message: 'Utilisateur suspendu et email envoyé.',
      userId: suspendedUser._id,
      email: suspendedUser.email,
      status: suspendedUser.status,
    };
  }
}
