import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { applyBodyLimit } from './body-limit';
import { assertEnv } from './config/env';

async function bootstrap() {
  assertEnv(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  applyBodyLimit(app);
  app.set('trust proxy', true);
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
  app.enableCors({ origin: origins, credentials: true });
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
