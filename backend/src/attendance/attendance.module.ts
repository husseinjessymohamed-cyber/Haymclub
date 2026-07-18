import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroupEnrollment } from '../trainees/entities/group-enrollment.entity';
import { Trainee } from '../trainees/entities/trainee.entity';
import { TraineesModule } from '../trainees/trainees.module';
import { TrainingGroupsModule } from '../training-groups/training-groups.module';
import { UsersModule } from '../users/users.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { TrainingSession } from './entities/training-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrainingSession,
      AttendanceRecord,
      GroupEnrollment,
      Trainee,
    ]),
    TrainingGroupsModule,
    TraineesModule,
    UsersModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
