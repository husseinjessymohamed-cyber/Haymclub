import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { AcademiesModule } from './academies/academies.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { BranchesModule } from './branches/branches.module';
import { BillingModule } from './billing/billing.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { MembershipsModule } from './memberships/memberships.module';
import { SportsModule } from './sports/sports.module';
import { TrainingProgramsModule } from './training-programs/training-programs.module';
import { TrainingGroupsModule } from './training-groups/training-groups.module';
import { TraineesModule } from './trainees/trainees.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    DatabaseModule,
    AcademiesModule,
    BranchesModule,
    MembershipsModule,
    UsersModule,
    AuthModule,
    SportsModule,
    TrainingProgramsModule,
    TrainingGroupsModule,
    TraineesModule,
    AttendanceModule,
    BillingModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
