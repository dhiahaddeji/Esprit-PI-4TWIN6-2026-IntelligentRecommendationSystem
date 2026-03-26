import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RecommendationsService } from './recommendations.service';
import { UsersService } from '../users/users.service';
import { ActivitiesService } from '../activity/activity.service';

@Controller('recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendationsController {
  constructor(
    private readonly recService: RecommendationsService,
    private readonly usersService: UsersService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Roles('HR', 'MANAGER')
  @Get(':activityId')
  get(@Param('activityId') activityId: string) {
    return this.recService.getByActivity(activityId);
  }

  // Fake AI generation (like your mock)
  @Roles('HR')
  @Post(':activityId/run-ai')
  async runAI(@Param('activityId') activityId: string) {
    const activity = await this.activitiesService.findById(activityId);
    if (!activity) throw new Error('Activity not found');

    const all = await this.usersService.findAll();
    const employees = all.filter((u: any) => u.role === 'EMPLOYEE');

    const shuffled = [...employees].sort(() => Math.random() - 0.5);
    const n = Math.max(1, Math.min(activity.seats || 3, 5));

    const list = shuffled.slice(0, n).map((e: any, idx: number) => ({
      employeeId: e._id?.toString?.() || e.id,
      score: Math.round(80 + Math.random() * 20),
      rank: idx + 1,
    }));

    await this.activitiesService.update(activityId, { status: 'AI_SUGGESTED' });
    return this.recService.upsert(activityId, list, false);
  }

  @Roles('HR')
  @Patch(':activityId')
  updateList(
    @Param('activityId') activityId: string,
    @Body() body: { list: any[] },
  ) {
    return this.recService.upsert(activityId, body.list || [], false);
  }

  @Roles('HR')
  @Patch(':activityId/validate')
  async validate(@Param('activityId') activityId: string) {
    await this.activitiesService.update(activityId, {
      status: 'SENT_TO_MANAGER',
    });
    return this.recService.validate(activityId);
  }
}
