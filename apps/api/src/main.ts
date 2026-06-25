import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', true);
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
  app.enableCors({ origin: origins, credentials: true });
  app.setGlobalPrefix('api/v1');
  await app.listen(3000);
}
bootstrap();
