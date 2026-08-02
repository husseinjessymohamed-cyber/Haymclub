import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Academy } from '../academies/entities/academy.entity';

import { Branch } from '../branches/entities/branch.entity';

import { Trainee } from '../trainees/entities/trainee.entity';

import { User } from '../users/entities/user.entity';

import { SuperAdminController } from './super-admin.controller';

import { SuperAdminService } from './super-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Academy, Branch, User, Trainee])],

  controllers: [SuperAdminController],

  providers: [SuperAdminService],
})
export class SuperAdminModule {}
