import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Academy } from '../academies/entities/academy.entity';

import { Branch } from '../branches/entities/branch.entity';

import { Trainee } from '../trainees/entities/trainee.entity';

import { User } from '../users/entities/user.entity';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(Academy)
    private readonly academiesRepository: Repository<Academy>,

    @InjectRepository(Branch)
    private readonly branchesRepository: Repository<Branch>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Trainee)
    private readonly traineesRepository: Repository<Trainee>,
  ) {}

  async getDashboard() {
    const [
      totalAcademies,
      totalBranches,
      totalUsers,
      totalTrainees,
      academyStatuses,
    ] = await Promise.all([
      this.academiesRepository.count(),
      this.branchesRepository.count(),
      this.usersRepository.count(),
      this.traineesRepository.count(),

      this.academiesRepository
        .createQueryBuilder('academy')
        .select('UPPER(academy.status::text)', 'status')
        .addSelect('COUNT(academy.id)', 'total')
        .groupBy('UPPER(academy.status::text)')
        .getRawMany<{
          status: string;
          total: string;
        }>(),
    ]);

    const statusCounts = {
      active: 0,
      trial: 0,
      suspended: 0,
      other: 0,
    };

    for (const row of academyStatuses) {
      const total = Number(row.total ?? 0);

      if (row.status === 'ACTIVE') {
        statusCounts.active += total;
      } else if (row.status === 'TRIAL') {
        statusCounts.trial += total;
      } else if (row.status === 'SUSPENDED') {
        statusCounts.suspended += total;
      } else {
        statusCounts.other += total;
      }
    }

    return {
      generatedAt: new Date().toISOString(),

      metrics: {
        academies: {
          total: totalAcademies,
          ...statusCounts,
        },

        branches: {
          total: totalBranches,
        },

        users: {
          total: totalUsers,
        },

        trainees: {
          total: totalTrainees,
        },
      },
    };
  }

  async getAcademies() {
    return this.academiesRepository.find({
      order: {
        createdAt: 'DESC',
      },

      take: 500,
    });
  }
}
