import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AcademiesModule } from '../academies/academies.module';
import { Sport } from './entities/sport.entity';
import { SportsController } from './sports.controller';
import { SportsService } from './sports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sport]), AcademiesModule],
  controllers: [SportsController],
  providers: [SportsService],
  exports: [SportsService],
})
export class SportsModule {}
