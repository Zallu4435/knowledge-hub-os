import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * GlobalExceptionFilter — catches ALL unhandled exceptions across every NestJS service.
 *
 * Returns a standardized JSON structure so the Next.js frontend always gets a
 * predictable error shape:
 *   { statusCode, message, timestamp, path }
 *
 * Apply globally in main.ts via:
 *   app.useGlobalFilters(new GlobalExceptionFilter());
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            const res = exception.getResponse();
            message =
                typeof res === 'string'
                    ? res
                    : (res as any).message || exception.message;
            // NestJS class-validator returns message as an array; flatten it
            if (Array.isArray(message)) {
                message = message.join(', ');
            }
        } else if (exception instanceof Error) {
            message = exception.message;
        }

        // Structured log for observability tools (Datadog, Grafana Loki, etc.)
        this.logger.error({
            statusCode,
            message,
            path: request.url,
            method: request.method,
            stack: exception instanceof Error ? exception.stack : undefined,
        });

        response.status(statusCode).json({
            statusCode,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
