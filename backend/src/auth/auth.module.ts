import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

function parseAccessTokenLifetime(value: string): number {
  const expiresIn = Number(value);

  if (!Number.isInteger(expiresIn) || expiresIn <= 0) {
    throw new Error(
      'JWT_ACCESS_EXPIRES_IN must be a positive integer in seconds, for example 900',
    );
  }

  return expiresIn;
}

@Module({
  imports: [
    UsersModule,

    PassportModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const secret =
          configService.getOrThrow<string>('JWT_ACCESS_SECRET');

        const expiresIn = parseAccessTokenLifetime(
          configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '900',
        );

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService, JwtStrategy],

  exports: [AuthService, JwtModule],
})
export class AuthModule {}
