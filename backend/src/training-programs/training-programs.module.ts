import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AcademiesModule } from '../academies/academies.module';
import { SportsModule } from '../sports/sports.module';
import { TrainingProgram } from './entities/training-program.entity';
import { TrainingProgramsController } from './training-programs.controller';
import { TrainingProgramsService } from './training-programs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainingProgram]),
    AcademiesModule,
    SportsModule,
  ],
  controllers: [TrainingProgramsController],
  providers: [TrainingProgramsService],
  exports: [TrainingProgramsService],
})
export class TrainingProgramsModule {}
