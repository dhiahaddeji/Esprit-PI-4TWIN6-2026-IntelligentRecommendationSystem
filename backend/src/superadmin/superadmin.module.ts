import { Module } from '@nestjs/common';
import { SuperAdminController } from './superadmin.controller';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [UsersModule, MailModule],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
