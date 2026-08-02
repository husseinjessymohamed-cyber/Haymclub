import {
  Module,
} from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  Trainee,
} from '../trainees/entities/trainee.entity';

import {
  TraineeRanking,
} from './entities/trainee-ranking.entity';

import {
  RankingsController,
} from './rankings.controller';

import {
  RankingsService,
} from './rankings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TraineeRanking,
      Trainee,
    ]),
  ],

  controllers: [
    RankingsController,
  ],

  providers: [
    RankingsService,
  ],

  exports: [
    RankingsService,
  ],
})
export class RankingsModule {}
