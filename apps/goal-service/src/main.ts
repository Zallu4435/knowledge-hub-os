import { NestFactory } from '@nestjs/core';
import { GoalModule } from './goal.module';

async function bootstrap() {
    const app = await NestFactory.create(GoalModule);

    app.enableCors({
        origin: 'http://localhost:4000',
        credentials: true,
    });

    await app.listen(3002);
    console.log(`🎯 Goal Service running on: http://localhost:3002`);
}
bootstrap();
