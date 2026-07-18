import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AcademyMembership } from './entities/academy-membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AcademyMembership])],
  exports: [TypeOrmModule],
})
export class MembershipsModule {}
