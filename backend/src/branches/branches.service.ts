import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { AcademiesService } from '../academies/academies.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Branch } from './entities/branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchesRepository: Repository<Branch>,

    private readonly academiesService: AcademiesService,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    await this.academiesService.findOne(createBranchDto.academyId);

    const branch = this.branchesRepository.create({
      ...createBranchDto,
      code: createBranchDto.code.trim().toUpperCase(),
    });

    try {
      return await this.branchesRepository.save(branch);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  findAll(academyId?: string): Promise<Branch[]> {
    return this.branchesRepository.find({
      where: academyId
        ? {
            academyId,
          }
        : undefined,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchesRepository.findOne({
      where: {
        id,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const existingBranch = await this.findOne(id);

    const branch = this.branchesRepository.merge(existingBranch, {
      ...updateBranchDto,
      code: updateBranchDto.code
        ? updateBranchDto.code.trim().toUpperCase()
        : existingBranch.code,
    });

    try {
      return await this.branchesRepository.save(branch);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const branch = await this.findOne(id);

    await this.branchesRepository.softRemove(branch);
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
      throw new ConflictException(
        'A branch with the same code already exists in this academy',
      );
    }

    if (error instanceof QueryFailedError && postgresCode === '23503') {
      throw new NotFoundException('Academy not found');
    }

    throw error;
  }
}
