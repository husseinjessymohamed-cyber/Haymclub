import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  randomBytes,
} from 'crypto';

import * as bcrypt from 'bcrypt';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  DataSource,
  QueryFailedError,
  Repository,
} from 'typeorm';

import {
  AttendanceService,
} from '../attendance/attendance.service';

import {
  BillingService,
} from '../billing/billing.service';

import type {
  JwtPayload,
} from '../auth/interfaces/jwt-payload.interface';

import {
  AcademyMembership,
  AcademyRole,
} from '../memberships/entities/academy-membership.entity';

import {
  TraineesService,
} from '../trainees/trainees.service';

import {
  User,
  UserStatus,
} from '../users/entities/user.entity';

import {
  UsersService,
} from '../users/users.service';

import {
  CreatePortalLinkDto,
} from './dto/create-portal-link.dto';

import {
  CreateTraineePortalAccountDto,
} from './dto/create-trainee-portal-account.dto';


import {
  FindPortalLinksQueryDto,
} from './dto/find-portal-links-query.dto';

import {
  UpdatePortalLinkDto,
} from './dto/update-portal-link.dto';

import {
  PortalRelationship,
  PortalTraineeLink,
} from './entities/portal-trainee-link.entity';

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(
      PortalTraineeLink,
    )
    private readonly linksRepository:
      Repository<PortalTraineeLink>,

    private readonly dataSource:
      DataSource,

    private readonly usersService:
      UsersService,

    private readonly traineesService:
      TraineesService,

    private readonly attendanceService:
      AttendanceService,

    private readonly billingService:
      BillingService,
  ) {}

  async createTraineeAccountLink(
    dto: CreateTraineePortalAccountDto,
    currentUser: JwtPayload,
  ): Promise<{
    link: PortalTraineeLink;
    credentials: {
      email: string;
      password: string;
    };
  }> {
    const trainee =
      await this.traineesService.findOne(
        dto.traineeId,
      );

    this.assertAdminScope(
      currentUser,
      trainee.academyId,
      trainee.branchId,
    );

    const existingLink =
      await this.linksRepository.findOne({
        where: {
          traineeId: trainee.id,
          relationship:
            PortalRelationship.SELF,
        },
      });

    if (existingLink) {
      throw new ConflictException(
        'هذا المتدرب لديه حساب بوابة بالفعل',
      );
    }

    const safeRegistrationCode =
      trainee.registrationCode
        .trim()
        .toLowerCase()
        .replace(
          /[^a-z0-9.-]/g,
          '-',
        )
        .replace(
          /-+/g,
          '-',
        )
        .replace(
          /^-+|-+$/g,
          '',
        ) ||
      'trainee';

    const emailToken =
      randomBytes(4)
        .toString('hex');

    const email =
      `trainee.${safeRegistrationCode}.${emailToken}@portal.haymclub.app`;

    const password =
      `${randomBytes(9).toString('base64url')}Aa1!`;

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    let linkId: string;

    try {
      linkId =
        await this.dataSource.transaction(
          async (manager) => {
            const linksRepository =
              manager.getRepository(
                PortalTraineeLink,
              );

            const duplicate =
              await linksRepository.findOne({
                where: {
                  traineeId:
                    trainee.id,

                  relationship:
                    PortalRelationship.SELF,
                },
              });

            if (duplicate) {
              throw new ConflictException(
                'هذا المتدرب لديه حساب بوابة بالفعل',
              );
            }

            const usersRepository =
              manager.getRepository(User);

            const membershipsRepository =
              manager.getRepository(
                AcademyMembership,
              );

            const user =
              usersRepository.create({
                firstName:
                  trainee.firstName.trim(),

                lastName:
                  trainee.lastName.trim(),

                email,

                phone:
                  trainee.phone?.trim() ||
                  null,

                passwordHash,

                status:
                  UserStatus.ACTIVE,

                lastLoginAt:
                  null,
              });

            const savedUser =
              await usersRepository.save(
                user,
              );

            const membership =
              membershipsRepository.create({
                userId:
                  savedUser.id,

                academyId:
                  trainee.academyId,

                branchId:
                  trainee.branchId,

                role:
                  AcademyRole.TRAINEE,

                isPrimary:
                  true,

                isActive:
                  true,
              });

            await membershipsRepository.save(
              membership,
            );

            const link =
              linksRepository.create({
                academyId:
                  trainee.academyId,

                userId:
                  savedUser.id,

                traineeId:
                  trainee.id,

                relationship:
                  PortalRelationship.SELF,

                isPrimary:
                  true,

                isActive:
                  true,
              });

            const savedLink =
              await linksRepository.save(
                link,
              );

            return savedLink.id;
          },
        );
    } catch (error) {
      this.handleDatabaseError(error);
    }

    return {
      link:
        await this.findLink(
          linkId,
          currentUser,
        ),

      credentials: {
        email,
        password,
      },
    };
  }

  async createLink(
    dto: CreatePortalLinkDto,
    currentUser: JwtPayload,
  ): Promise<PortalTraineeLink> {
    const [
      profile,
      trainee,
    ] = await Promise.all([
      this.usersService.findProfileById(
        dto.userId,
      ),

      this.traineesService.findOne(
        dto.traineeId,
      ),
    ]);

    this.assertAdminScope(
      currentUser,
      trainee.academyId,
      trainee.branchId,
    );

    const membership =
      profile.memberships.find(
        (item) =>
          item.isActive &&
          item.academyId ===
            trainee.academyId,
      );

    if (!membership) {
      throw new BadRequestException(
        'User does not have an active membership in the trainee academy',
      );
    }

    if (
      membership.role !==
        AcademyRole.PARENT &&
      membership.role !==
        AcademyRole.TRAINEE
    ) {
      throw new BadRequestException(
        'Only parent or trainee accounts can be linked to the client portal',
      );
    }

    if (
      membership.role ===
        AcademyRole.TRAINEE &&
      dto.relationship !==
        PortalRelationship.SELF
    ) {
      throw new BadRequestException(
        'A trainee account must use the SELF relationship',
      );
    }

    if (
      membership.role ===
        AcademyRole.PARENT &&
      dto.relationship ===
        PortalRelationship.SELF
    ) {
      throw new BadRequestException(
        'A parent account cannot use the SELF relationship',
      );
    }

    if (dto.isPrimary) {
      await this.linksRepository.update(
        {
          userId: dto.userId,
        },
        {
          isPrimary: false,
        },
      );
    }

    const link =
      this.linksRepository.create({
        academyId:
          trainee.academyId,

        userId:
          dto.userId,

        traineeId:
          dto.traineeId,

        relationship:
          dto.relationship,

        isPrimary:
          dto.isPrimary ?? false,

        isActive:
          dto.isActive ?? true,
      });

    try {
      const saved =
        await this.linksRepository.save(
          link,
        );

      return this.findLink(
        saved.id,
        currentUser,
      );
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findLinks(
    query: FindPortalLinksQueryDto,
    currentUser: JwtPayload,
  ): Promise<PortalTraineeLink[]> {
    const builder =
      this.linksRepository
        .createQueryBuilder('link')
        .leftJoinAndSelect(
          'link.user',
          'user',
        )
        .leftJoinAndSelect(
          'link.trainee',
          'trainee',
        )
        .leftJoinAndSelect(
          'trainee.branch',
          'branch',
        )
        .leftJoinAndSelect(
          'link.academy',
          'academy',
        )
        .where(
          'link.deletedAt IS NULL',
        )
        .orderBy(
          'link.createdAt',
          'DESC',
        );

    if (
      currentUser.role !==
      AcademyRole.SUPER_ADMIN
    ) {
      if (!currentUser.academyId) {
        return [];
      }

      builder.andWhere(
        'link.academyId = :academyId',
        {
          academyId:
            currentUser.academyId,
        },
      );
    } else if (query.academyId) {
      builder.andWhere(
        'link.academyId = :academyId',
        {
          academyId:
            query.academyId,
        },
      );
    }

    if (
      currentUser.role ===
      AcademyRole.BRANCH_MANAGER
    ) {
      if (!currentUser.branchId) {
        return [];
      }

      builder.andWhere(
        'trainee.branchId = :branchId',
        {
          branchId:
            currentUser.branchId,
        },
      );
    } else if (query.branchId) {
      builder.andWhere(
        'trainee.branchId = :branchId',
        {
          branchId:
            query.branchId,
        },
      );
    }

    if (query.userId) {
      builder.andWhere(
        'link.userId = :userId',
        {
          userId: query.userId,
        },
      );
    }

    if (query.traineeId) {
      builder.andWhere(
        'link.traineeId = :traineeId',
        {
          traineeId:
            query.traineeId,
        },
      );
    }

    if (
      query.isActive !== undefined
    ) {
      builder.andWhere(
        'link.isActive = :isActive',
        {
          isActive:
            query.isActive,
        },
      );
    }

    return builder.getMany();
  }

  async findLink(
    id: string,
    currentUser: JwtPayload,
  ): Promise<PortalTraineeLink> {
    const link =
      await this.linksRepository.findOne({
        where: {
          id,
        },

        relations: {
          academy: true,
          user: true,

          trainee: {
            branch: true,
          },
        },
      });

    if (!link) {
      throw new NotFoundException(
        'Portal link not found',
      );
    }

    this.assertAdminScope(
      currentUser,
      link.academyId,
      link.trainee.branchId,
    );

    return link;
  }

  async updateLink(
    id: string,
    dto: UpdatePortalLinkDto,
    currentUser: JwtPayload,
  ): Promise<PortalTraineeLink> {
    const link =
      await this.findLink(
        id,
        currentUser,
      );

    const profile =
      await this.usersService
        .findProfileById(
          link.userId,
        );

    const membership =
      profile.memberships.find(
        (item) =>
          item.isActive &&
          item.academyId ===
            link.academyId,
      );

    if (!membership) {
      throw new BadRequestException(
        'User no longer has an active academy membership',
      );
    }

    const relationship =
      dto.relationship ??
      link.relationship;

    if (
      membership.role ===
        AcademyRole.TRAINEE &&
      relationship !==
        PortalRelationship.SELF
    ) {
      throw new BadRequestException(
        'A trainee account must use the SELF relationship',
      );
    }

    if (
      membership.role ===
        AcademyRole.PARENT &&
      relationship ===
        PortalRelationship.SELF
    ) {
      throw new BadRequestException(
        'A parent account cannot use the SELF relationship',
      );
    }

    if (dto.isPrimary) {
      await this.linksRepository.update(
        {
          userId:
            link.userId,
        },
        {
          isPrimary: false,
        },
      );
    }

    this.linksRepository.merge(
      link,
      {
        relationship,

        isPrimary:
          dto.isPrimary ??
          link.isPrimary,

        isActive:
          dto.isActive ??
          link.isActive,
      },
    );

    await this.linksRepository.save(
      link,
    );

    return this.findLink(
      id,
      currentUser,
    );
  }

  async removeLink(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    const link =
      await this.findLink(
        id,
        currentUser,
      );

    await this.linksRepository
      .softRemove(link);
  }

  async getMyPortal(
    currentUser: JwtPayload,
  ) {
    const profile =
      await this.usersService
        .findProfileById(
          currentUser.sub,
        );

    const links =
      await this.linksRepository.find({
        where: {
          userId:
            currentUser.sub,

          isActive:
            true,
        },

        relations: {
          academy: true,

          trainee: {
            branch: true,
          },
        },

        order: {
          isPrimary: 'DESC',
          createdAt: 'ASC',
        },
      });

    const scopedLinks =
      links.filter(
        (link) =>
          !currentUser.academyId ||
          link.academyId ===
            currentUser.academyId,
      );

    const trainees =
      await Promise.all(
        scopedLinks.map(
          async (link) => {
            const [
              trainee,
              enrollments,
              attendance,
              billing,
            ] = await Promise.all([
              this.traineesService
                .findOne(
                  link.traineeId,
                ),

              this.traineesService
                .findEnrollments(
                  link.traineeId,
                ),

              this.attendanceService
                .getTraineeStats(
                  link.traineeId,
                ),

              this.billingService
                .getTraineeSummary(
                  link.traineeId,
                ),
            ]);

            return {
              link: {
                id: link.id,
                relationship:
                  link.relationship,
                isPrimary:
                  link.isPrimary,
              },

              trainee,

              enrollments,

              attendance,

              billing,
            };
          },
        ),
      );

    return {
      generatedAt:
        new Date().toISOString(),

      user: profile,

      activeMembership: {
        academyId:
          currentUser.academyId,

        branchId:
          currentUser.branchId,

        role:
          currentUser.role,
      },

      trainees,
    };
  }

  private assertAdminScope(
    currentUser: JwtPayload,
    academyId: string,
    branchId: string,
  ): void {
    if (
      currentUser.role ===
      AcademyRole.SUPER_ADMIN
    ) {
      return;
    }

    if (
      currentUser.academyId !==
      academyId
    ) {
      throw new ForbiddenException(
        'You cannot manage portal links for another academy',
      );
    }

    if (
      currentUser.role ===
        AcademyRole.BRANCH_MANAGER &&
      currentUser.branchId !==
        branchId
    ) {
      throw new ForbiddenException(
        'A branch manager can only manage portal links in their branch',
      );
    }
  }

  private handleDatabaseError(
    error: unknown,
  ): never {
    const postgresCode = (
      error as {
        driverError?: {
          code?: string;
        };
      }
    )?.driverError?.code;

    if (
      error instanceof
        QueryFailedError &&
      postgresCode === '23505'
    ) {
      throw new ConflictException(
        'This user is already linked to this trainee',
      );
    }

    if (
      error instanceof
        QueryFailedError &&
      postgresCode === '23503'
    ) {
      throw new NotFoundException(
        'User, academy or trainee was not found',
      );
    }

    throw error;
  }
}
