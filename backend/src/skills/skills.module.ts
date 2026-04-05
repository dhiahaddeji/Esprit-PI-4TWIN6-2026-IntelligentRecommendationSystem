import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillRequest, SkillRequestSchema } from './skill-request.schema';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SkillRequest.name, schema: SkillRequestSchema },
    ]),
    UsersModule,
  ],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
