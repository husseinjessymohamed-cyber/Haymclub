import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BranchesModule } from '../branches/branches.module';
import { TrainingGroupsModule } from '../training-groups/training-groups.module';
import { GroupEnrollment } from './entities/group-enrollment.entity';
import { Guardian } from './entities/guardian.entity';
import { TraineeGuardian } from './entities/trainee-guardian.entity';
import { Trainee } from './entities/trainee.entity';
import { TraineesController } from './trainees.controller';
import { TraineesService } from './trainees.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trainee,
      Guardian,
      TraineeGuardian,
      GroupEnrollment,
    ]),
    BranchesModule,
    TrainingGroupsModule,
  ],
  controllers: [TraineesController],
  providers: [TraineesService],
  exports: [TraineesService],
})
export class TraineesModule {}
