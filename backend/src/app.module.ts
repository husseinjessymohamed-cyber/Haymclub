import './config/load-env';
import {
  StorageModule,
} from './storage/storage.module';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AcademiesModule } from './academies/academies.module';

import {
  TraineeInvitationsModule,
} from './trainee-invitations/trainee-invitations.module';

import { AppController } from './app.controller';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { BillingModule } from './billing/billing.module';
import { BranchesModule } from './branches/branches.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { MembershipsModule } from './memberships/memberships.module';
import { SportsModule } from './sports/sports.module';
import { TraineesModule } from './trainees/trainees.module';
import { PortalModule } from './portal/portal.module';
import { TrainingGroupsModule } from './training-groups/training-groups.module';
import { TrainingProgramsModule } from './training-programs/training-programs.module';
import { UsersModule } from './users/users.module';

import { SuperAdminModule } from './super-admin/super-admin.module';

import { SuperAdminSaasModule } from './super-admin-saas/super-admin-saas.module';

import { SuperAdminManagementModule } from './super-admin-management/super-admin-management.module';

import { SuperAdminAcademiesModule } from './super-admin-academies/super-admin-academies.module';

import { SuperAdminAcademyManagementModule } from './super-admin-academy-management/super-admin-academy-management.module';

import { UploadsModule } from './uploads/uploads.module';
import { PasswordResetModule } from './password-reset/password-reset.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GalleryModule } from './gallery/gallery.module';
import { RankingsModule } from './rankings/rankings.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    StorageModule,
    TraineeInvitationsModule,
    WorkflowModule,
    RankingsModule,
    GalleryModule,
    NotificationsModule,
    PasswordResetModule,
    UploadsModule,
    SuperAdminAcademyManagementModule,
    SuperAdminAcademiesModule,
    SuperAdminManagementModule,
    SuperAdminSaasModule,
    SuperAdminModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,

      // يقرأ .env.local أولًا إن كان موجودًا، ثم .env
      envFilePath: ['.env.local', '.env'],

      // يسمح باستخدام متغير داخل متغير مثل:
      // يمكن تكوين DATABASE_URL باستخدام متغيرات DB_*
      expandVariables: true,
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
    PortalModule,
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
