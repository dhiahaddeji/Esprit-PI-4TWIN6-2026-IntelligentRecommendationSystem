import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { CompetencesModule } from '../competences/competences.module';

@Module({
  imports: [CompetencesModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
