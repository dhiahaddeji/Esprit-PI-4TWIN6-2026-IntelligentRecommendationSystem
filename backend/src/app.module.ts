import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HrModule } from './hr/hr.module';
import { ManagerModule } from './manager/manager.module';
import { EmployeeModule } from './employee/employee.module';
import { SuperAdminModule } from './superadmin/superadmin.module';

@Module({
  imports: [

    MongooseModule.forRoot('mongodb://localhost:27017/maghrebiya'),

    AuthModule,
    UsersModule,
    HrModule,
    ManagerModule,
    EmployeeModule,
    SuperAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}