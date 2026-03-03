import { NestFactory } from '@nestjs/core';
import { GoalModule } from './goal.module';
import { GlobalExceptionFilter } from '../../../libs/exceptions/src/global-exception.filter';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
    const app = await NestFactory.create(GoalModule, { bufferLogs: true });

    // Use Pino structured logger
    app.useLogger(app.get(Logger));

    // Dynamic CORS from environment
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4000')
        .split(',')
        .map((o) => o.trim());

    app.enableCors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: Origin '${origin}' not allowed`));
            }
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });

    // Apply global exception filter for standardized error responses
    app.useGlobalFilters(new GlobalExceptionFilter());

    const port = process.env.PORT_GOAL_SERVICE || process.env.PORT || 3002;
    await app.listen(port);
    app.get(Logger).log(`🎯 Goal Service running on: http://localhost:${port}`);
}
bootstrap();
