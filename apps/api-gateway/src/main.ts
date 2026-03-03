import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '../../../libs/exceptions/src/global-exception.filter';
import { Logger } from 'nestjs-pino';

// ─────────────────────────────────────────────────────────────
// Phase 12 — OpenTelemetry Tracing (must be imported FIRST,
// before any other NestJS modules load, so all auto-instrumentations
// are registered before they patch http/kafka/etc.)
// ─────────────────────────────────────────────────────────────
import '../../../libs/telemetry/src/tracer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino structured logger
  app.useLogger(app.get(Logger));

  // Dynamic CORS from environment
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g., server-to-server, curl)
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

  const port = process.env.PORT_API_GATEWAY || process.env.PORT || 3000;
  await app.listen(port);
  app.get(Logger).log(`🚀 API Gateway is running on: http://localhost:${port}`);
}
bootstrap();
