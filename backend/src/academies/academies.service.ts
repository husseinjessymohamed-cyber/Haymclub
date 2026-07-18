import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { CreateAcademyDto } from './dto/create-academy.dto';
import { UpdateAcademyDto } from './dto/update-academy.dto';
import { Academy } from './entities/academy.entity';

@Injectable()
export class AcademiesService {
  constructor(
    @InjectRepository(Academy)
    private readonly academiesRepository: Repository<Academy>,
  ) {}

  async create(createAcademyDto: CreateAcademyDto): Promise<Academy> {
    const academy = this.academiesRepository.create(createAcademyDto);

    try {
      return await this.academiesRepository.save(academy);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  findAll(): Promise<Academy[]> {
    return this.academiesRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Academy> {
    const academy = await this.academiesRepository.findOne({
      where: { id },
    });

    if (!academy) {
      throw new NotFoundException('Academy not found');
    }

    return academy;
  }

  async update(
    id: string,
    updateAcademyDto: UpdateAcademyDto,
  ): Promise<Academy> {
    const academy = await this.academiesRepository.preload({
      id,
      ...updateAcademyDto,
    });

    if (!academy) {
      throw new NotFoundException('Academy not found');
    }

    try {
      return await this.academiesRepository.save(academy);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const academy = await this.findOne(id);

    await this.academiesRepository.softRemove(academy);
  }

  private handleDatabaseError(error: unknown): never {
    const postgresCode = (error as { driverError?: { code?: string } })
      ?.driverError?.code;

    if (error instanceof QueryFailedError && postgresCode === '23505') {
      throw new ConflictException(
        'An academy with the same slug already exists',
      );
    }

    throw error;
  }
}
