import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',')
  app.enableCors({ origin: origins, credentials: true });
  app.setGlobalPrefix('api/v1');
  await app.listen(3000);
}
bootstrap();
