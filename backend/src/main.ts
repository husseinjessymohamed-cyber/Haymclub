import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function getAllowedOrigins(): Set<string> {
  const configuredFrontendUrls = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map(normalizeUrl)
    .filter(Boolean);

  const localFrontendUrls = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ];

  const codespaceName = process.env.CODESPACE_NAME;

  const codespacesDomain =
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? 'app.github.dev';

  const codespaceFrontendUrl = codespaceName
    ? `https://${codespaceName}-5173.${codespacesDomain}`
    : null;

  return new Set(
    [
      ...configuredFrontendUrls,
      ...localFrontendUrls,
      codespaceFrontendUrl,
    ].filter((url): url is string => Boolean(url)),
  );
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use(helmet());
  app.use(compression());

  const allowedOrigins = getAllowedOrigins();

  logger.log(
    `Allowed frontend origins: ${Array.from(allowedOrigins).join(', ')}`,
  );

  app.enableCors({
    origin: (origin, callback) => {
      // السماح بطلبات curl وPostman والطلبات الداخلية
      // لأنها قد لا تحتوي على Origin
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeUrl(origin);

      if (allowedOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      logger.warn(`CORS blocked origin: ${normalizedOrigin}`);

      callback(null, false);
    },

    credentials: true,

    methods: [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],

    exposedHeaders: ['Authorization'],

    optionsSuccessStatus: 204,

    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port, '0.0.0.0');

  logger.log(`Haymclub API running on http://localhost:${port}/api`);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');

  logger.error(
    'Failed to start Haymclub API',
    error instanceof Error ? error.stack : String(error),
  );

  process.exit(1);
});