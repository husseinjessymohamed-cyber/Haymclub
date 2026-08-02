import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../src/app.module';
import {
  User,
  UserStatus,
} from '../src/users/entities/user.entity';
import {
  AcademyMembership,
  AcademyRole,
} from '../src/memberships/entities/academy-membership.entity';

async function main(): Promise<void> {
  const email = (
    process.env.ADMIN_EMAIL ??
    'mohamedhusseinabdeen@gmail.com'
  ).trim().toLowerCase();

  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error(
      'كلمة المرور مطلوبة ويجب ألا تقل عن 8 أحرف.',
    );
  }

  const app = await NestFactory.createApplicationContext(
    AppModule,
    {
      logger: ['error', 'warn'],
    },
  );

  try {
    const dataSource = app.get(DataSource);
    const passwordHash = await bcrypt.hash(password, 12);

    await dataSource.transaction(async (manager) => {
      const usersRepository =
        manager.getRepository(User);

      const membershipsRepository =
        manager.getRepository(AcademyMembership);

      let user = await usersRepository
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('LOWER(user.email) = LOWER(:email)', {
          email,
        })
        .getOne();

      if (!user) {
        user = usersRepository.create({
          firstName: 'Mohamed Hussein',
          lastName: 'Abdeen',
          email,
          phone: null,
          passwordHash,
          status: UserStatus.ACTIVE,
          lastLoginAt: null,
        });
      } else {
        user.email = email;
        user.passwordHash = passwordHash;
        user.status = UserStatus.ACTIVE;
      }

      user = await usersRepository.save(user);

      let membership =
        await membershipsRepository.findOne({
          where: {
            userId: user.id,
            role: AcademyRole.SUPER_ADMIN,
          },
        });

      if (!membership) {
        membership = membershipsRepository.create({
          userId: user.id,
          academyId: null,
          branchId: null,
          role: AcademyRole.SUPER_ADMIN,
          isPrimary: true,
          isActive: true,
        });
      } else {
        membership.academyId = null;
        membership.branchId = null;
        membership.isPrimary = true;
        membership.isActive = true;
      }

      await membershipsRepository.save(membership);
    });

    console.log('');
    console.log('✅ تم إنشاء حساب SUPER_ADMIN بنجاح');
    console.log(`📧 البريد: ${email}`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    '❌ فشل إنشاء حساب المدير:',
    error instanceof Error ? error.message : error,
  );

  process.exit(1);
});
