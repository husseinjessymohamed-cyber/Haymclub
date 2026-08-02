import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import {
  BaseEntity,
} from '../../common/entities/base.entity';

import {
  Trainee,
} from '../../trainees/entities/trainee.entity';

@Entity({
  name: 'trainee_rankings',
})
@Index(
  'UQ_trainee_rankings_academy_trainee',
  ['academyId', 'traineeId'],
  {
    unique: true,
  },
)
@Index(
  'IDX_trainee_rankings_academy_points',
  ['academyId', 'points'],
)
export class TraineeRanking extends BaseEntity {
  @Column({
    name: 'academy_id',
    type: 'uuid',
  })
  academyId: string;

  @Column({
    name: 'trainee_id',
    type: 'uuid',
  })
  traineeId: string;

  @ManyToOne(
    () => Trainee,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'trainee_id',
  })
  trainee: Trainee;

  @Column({
    name: 'updated_by_user_id',
    type: 'uuid',
  })
  updatedByUserId: string;

  @Column({
    type: 'integer',
    default: 0,
  })
  points: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  note: string | null;
}
