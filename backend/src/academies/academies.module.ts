import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AcademiesController } from './academies.controller';
import { AcademiesService } from './academies.service';
import { Academy } from './entities/academy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Academy])],
  controllers: [AcademiesController],
  providers: [AcademiesService],
  exports: [AcademiesService],
})
export class AcademiesModule {}
