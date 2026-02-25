import { Controller, Post, Delete, Patch, Body, Param, UseGuards, Request, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from '../users/users.service';

@Controller('admin')
export class SuperAdminController {

  constructor(private usersService: UsersService) {}

  @Get('debug')
  debug(@Request() req: any) {
    console.log('🔍 DEBUG /admin/debug - Headers:', req.headers);
    console.log('🔍 DEBUG /admin/debug - Auth header:', req.headers.authorization);
    return {
      message: 'Debug endpoint',
      authHeader: req.headers.authorization ? 'Present' : 'Missing',
      user: req.user || 'No user',
    };
  }

  @Get('create-user')
  getCreateUserPage() {
    return { message: "Page de création autorisée (GET)" };
  }

  // ✅ Endpoint pour récupérer tous les utilisateurs
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('users')
  async getAllUsers() {
    return this.usersService.findAll();
  }

  // ✅ Endpoint pour récupérer un utilisateur par ID
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('user/:id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('create-user')
  async createUser(@Body() body: any) {
    return this.usersService.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('update-user/:id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('delete-user/:id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Get('check-matricule/:matricule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
async checkMatricule(@Param('matricule') matricule: string) {
  const exists = await this.usersService.findByMatricule(matricule);
  return { exists: !!exists };
}
}