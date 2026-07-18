import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AcademiesModule } from '../academies/academies.module';
import { BranchesModule } from '../branches/branches.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AcademiesModule,
    BranchesModule,
    MembershipsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
