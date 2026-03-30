import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ActivitiesService } from './activity.service';

@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Roles('HR')
  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.service.create({
      ...body,
      seats: Number(body.seats || 0),
      createdBy: req.user.userId,
      status: 'DRAFT',
      participants: [],
    });
  }

  @Roles('HR', 'MANAGER', 'EMPLOYEE', 'SUPERADMIN')
  @Get()
  list() {
    return this.service.findAll();
  }

  @Roles('HR', 'MANAGER', 'EMPLOYEE', 'SUPERADMIN')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Roles('MANAGER')
  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @Body() body: { participants: string[] }) {
    return this.service.update(id, {
      participants: body.participants || [],
      status: 'MANAGER_CONFIRMED',
    });
  }

  @Roles('MANAGER')
  @Patch(':id/notified')
  notified(@Param('id') id: string) {
    return this.service.update(id, { status: 'NOTIFIED' });
  }

  @Roles('HR')
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.update(id, { status: body.status as any });
  }
}
