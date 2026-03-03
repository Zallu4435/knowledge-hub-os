import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { GlobalExceptionFilter } from '../../../libs/exceptions/src/global-exception.filter';
import { Logger } from 'nestjs-pino';

// ─────────────────────────────────────────────────────────────
// Phase 12 — OpenTelemetry Tracing (MUST be first import)
// Patches http/kafkajs before NestJS loads any modules.
// ─────────────────────────────────────────────────────────────
import '../../../libs/telemetry/src/tracer';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule, { bufferLogs: true });

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

  const port = process.env.PORT_AUTH_SERVICE || process.env.PORT || 3001;
  await app.listen(port);
  app.get(Logger).log(`🔒 Auth Service running on: http://localhost:${port}`);
}
bootstrap();
