import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { AcademiesService } from '../academies/academies.service';
import { BranchesService } from '../branches/branches.service';
import {
  AcademyMembership,
  AcademyRole,
} from '../memberships/entities/academy-membership.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserStatus } from './entities/user.entity';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  memberships: Array<{
    id: string;
    academyId: string | null;
    branchId: string | null;
    role: AcademyRole;
    isPrimary: boolean;
    isActive: boolean;
    academy: {
      id: string;
      name: string;
      slug: string;
    } | null;
    branch: {
      id: string;
      name: string;
      code: string;
    } | null;
  }>;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly dataSource: DataSource,
    private readonly academiesService: AcademiesService,
    private readonly branchesService: BranchesService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserProfile> {
    const email = createUserDto.email.trim().toLowerCase();

    const isSuperAdmin = createUserDto.role === AcademyRole.SUPER_ADMIN;

    if (!isSuperAdmin && !createUserDto.academyId) {
      throw new BadRequestException('academyId is required for this role');
    }

    if (createUserDto.academyId) {
      await this.academiesService.findOne(createUserDto.academyId);
    }

    if (createUserDto.branchId) {
      const branch = await this.branchesService.findOne(createUserDto.branchId);

      if (
        createUserDto.academyId &&
        branch.academyId !== createUserDto.academyId
      ) {
        throw new BadRequestException(
          'Branch does not belong to the selected academy',
        );
      }
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    try {
      const userId = await this.dataSource.transaction(async (manager) => {
        const usersRepository = manager.getRepository(User);

        const membershipsRepository = manager.getRepository(AcademyMembership);

        const user = usersRepository.create({
          firstName: createUserDto.firstName.trim(),
          lastName: createUserDto.lastName.trim(),
          email,
          phone: createUserDto.phone?.trim() || null,
          passwordHash,
          status: UserStatus.ACTIVE,
          lastLoginAt: null,
        });

        const savedUser = await usersRepository.save(user);

        const membership = membershipsRepository.create({
          userId: savedUser.id,
          academyId: createUserDto.academyId ?? null,
          branchId: createUserDto.branchId ?? null,
          role: createUserDto.role,
          isPrimary: true,
          isActive: true,
        });

        await membershipsRepository.save(membership);

        return savedUser.id;
      });

      return await this.findProfileById(userId);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findAll(): Promise<UserProfile[]> {
    const users = await this.usersRepository.find({
      relations: {
        memberships: {
          academy: true,
          branch: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return users.map((user) => this.toProfile(user));
  }

  async findAllByAcademyId(academyId: string): Promise<UserProfile[]> {
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.memberships', 'membership')
      .leftJoinAndSelect('membership.academy', 'academy')
      .leftJoinAndSelect('membership.branch', 'branch')
      .where('membership.academyId = :academyId', {
        academyId,
      })
      .andWhere('user.deletedAt IS NULL')
      .orderBy('user.createdAt', 'DESC')
      .distinct(true)
      .getMany();

    return users.map((user) => this.toProfile(user));
  }

  async findProfileById(id: string): Promise<UserProfile> {
    const user = await this.usersRepository.findOne({
      where: {
        id,
      },
      relations: {
        memberships: {
          academy: true,
          branch: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toProfile(user);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.memberships', 'membership')
      .leftJoinAndSelect('membership.academy', 'academy')
      .leftJoinAndSelect('membership.branch', 'branch')
      .where('LOWER(user.email) = LOWER(:email)', {
        email: email.trim(),
      })
      .andWhere('user.deletedAt IS NULL')
      .orderBy('membership.isPrimary', 'DESC')
      .addOrderBy('membership.createdAt', 'ASC')
      .getOne();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  toProfile(user: User): UserProfile {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      memberships: (user.memberships ?? []).map((membership) => ({
        id: membership.id,
        academyId: membership.academyId,
        branchId: membership.branchId,
        role: membership.role,
        isPrimary: membership.isPrimary,
        isActive: membership.isActive,
        academy: membership.academy
          ? {
              id: membership.academy.id,
              name: membership.academy.name,
              slug: membership.academy.slug,
            }
          : null,
        branch: membership.branch
          ? {
              id: membership.branch.id,
              name: membership.branch.name,
              code: membership.branch.code,
            }
          : null,
      })),
    };
  }

  private handleDatabaseError(error: unknown): never {
    const postgresCode = (
      error as {
        driverError?: {
          code?: string;
        };
      }
    )?.driverError?.code;

    if (error instanceof QueryFailedError && postgresCode === '23505') {
      throw new ConflictException('A user with this email already exists');
    }

    throw error;
  }
}
