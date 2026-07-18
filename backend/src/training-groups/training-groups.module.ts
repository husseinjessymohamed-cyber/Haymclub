import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BranchesModule } from '../branches/branches.module';
import { TrainingProgramsModule } from '../training-programs/training-programs.module';
import { UsersModule } from '../users/users.module';
import { TrainingGroupSchedule } from './entities/training-group-schedule.entity';
import { TrainingGroup } from './entities/training-group.entity';
import { TrainingGroupsController } from './training-groups.controller';
import { TrainingGroupsService } from './training-groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainingGroup, TrainingGroupSchedule]),
    BranchesModule,
    TrainingProgramsModule,
    UsersModule,
  ],
  controllers: [TrainingGroupsController],
  providers: [TrainingGroupsService],
  exports: [TrainingGroupsService],
})
export class TrainingGroupsModule {}
