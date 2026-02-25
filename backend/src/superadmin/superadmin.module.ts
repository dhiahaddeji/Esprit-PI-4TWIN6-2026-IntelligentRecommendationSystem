import { Module } from '@nestjs/common';
import { SuperAdminController } from './superadmin.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}