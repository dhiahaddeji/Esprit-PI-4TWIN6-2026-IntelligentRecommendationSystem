import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SkillsService } from './skills.service';

@Controller('skills')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  // ── Employee: get my skills ──────────────────────────────────────────
  @Roles('EMPLOYEE')
  @Get('mine')
  async getMySkills(@Request() req: any) {
    return this.skillsService.getMySkills(req.user.userId);
  }

  // ── Employee: submit skill update request ────────────────────────────
  @Roles('EMPLOYEE')
  @Post('request')
  async submitRequest(
    @Request() req: any,
    @Body() body: { savoir: any[]; savoir_faire: any[]; savoir_etre: any[] },
  ) {
    const user = req.user;
    const name = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.name || user.email;
    return this.skillsService.submitRequest(
      user.userId,
      name,
      body.savoir || [],
      body.savoir_faire || [],
      body.savoir_etre || [],
    );
  }

  // ── Manager / HR: get all pending requests ───────────────────────────
  @Roles('MANAGER', 'HR', 'SUPERADMIN')
  @Get('pending')
  async getPending() {
    return this.skillsService.getPending();
  }

  // ── Manager / HR: get all requests ──────────────────────────────────
  @Roles('MANAGER', 'HR', 'SUPERADMIN')
  @Get('all')
  async getAll() {
    return this.skillsService.getAll();
  }

  // ── HR: get one employee's skills ────────────────────────────────────
  @Roles('HR', 'SUPERADMIN', 'MANAGER')
  @Get('employee/:id')
  async getEmployeeSkills(@Param('id') id: string) {
    return this.skillsService.getEmployeeSkills(id);
  }

  // ── Manager: approve ─────────────────────────────────────────────────
  @Roles('MANAGER', 'SUPERADMIN')
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { note?: string },
  ) {
    return this.skillsService.approve(id, req.user.userId, body.note);
  }

  // ── Manager: reject ──────────────────────────────────────────────────
  @Roles('MANAGER', 'SUPERADMIN')
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { note?: string },
  ) {
    return this.skillsService.reject(id, req.user.userId, body.note);
  }

  // ── HR Analytics: skills coverage by department ─────────────────────
  @Roles('HR', 'SUPERADMIN', 'MANAGER')
  @Get('analytics')
  async getAnalytics() {
    return this.skillsService.getSkillsAnalytics();
  }

  // ── AI: all employees with skills ────────────────────────────────────
  @Roles('HR', 'SUPERADMIN')
  @Get('employees-skills')
  async getAllEmployeeSkills() {
    return this.skillsService.getAllEmployeeSkills();
  }

  // ── Post-activity evaluation: update skill levels after participation ─
  @Roles('HR', 'MANAGER', 'SUPERADMIN')
  @Post('evaluate')
  async postActivityEvaluation(
    @Body() body: { employeeId: string; skillUpdates: { skillName: string; newLevel: string }[] },
  ) {
    return this.skillsService.postActivityEvaluation(
      body.employeeId,
      body.skillUpdates || [],
    );
  }
}
