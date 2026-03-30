import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Roles('HR', 'SUPERADMIN')
  @Post('chat')
  async chat(
    @Body() body: {
      message: string;
      context?: {
        requiredSkills?: string[];
        prioritization?: string;
        recommendedList?: any[];
        activityTitle?: string;
      };
    },
  ) {
    return this.aiService.chat(body.message, body.context);
  }

  // Extract skills from activity description (NLP auto-fill)
  @Roles('HR', 'SUPERADMIN')
  @Post('extract-skills')
  async extractSkills(@Body() body: { description: string }) {
    return this.aiService.extractSkillsFromDescription(body.description);
  }
}
