import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  
  app.enableCors({
    origin: 'http://localhost:4000',
    credentials: true,
  });

  await app.listen(3001);
  console.log(`🔒 Auth Service running on: http://localhost:3001`);
}
bootstrap();
