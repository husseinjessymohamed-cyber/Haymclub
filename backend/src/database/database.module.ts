import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.getOrThrow<string>('DB_HOST'),

        port: Number(
          configService.get<string>('DB_PORT') ?? '5432',
        ),

        username:
          configService.getOrThrow<string>('DB_USERNAME'),

        password:
          configService.getOrThrow<string>('DB_PASSWORD'),

        database:
          configService.getOrThrow<string>('DB_NAME'),

        autoLoadEntities: true,

        synchronize: parseBoolean(
          configService.get<string>('DB_SYNCHRONIZE'),
          true,
        ),

        logging: parseBoolean(
          configService.get<string>('DB_LOGGING'),
          false,
        ),

        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}