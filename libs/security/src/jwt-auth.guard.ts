import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RedisService } from './redis.service';

/**
 * JwtAuthGuard — validates Bearer tokens AND checks the Redis blacklist.
 *
 * Token revocation flow:
 *   1. POST /auth/logout  → Auth Service adds the token to Redis with TTL
 *   2. Every subsequent request → this guard checks Redis before allowing access
 *      If the token is found in Redis  → throw UnauthorizedException immediately
 *      If the token is NOT in Redis    → allow the request through
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(
        private jwtService: JwtService,
        private redisService: RedisService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('Missing authentication token');
        }

        let payload: any;
        try {
            // 1. Cryptographically verify the token
            payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET || 'super-secret-development-key',
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        // 2. Check Redis blacklist — use the raw token as the key (covers logout)
        const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            this.logger.warn(`Blacklisted token attempted access from user: ${payload?.sub}`);
            throw new UnauthorizedException('Token has been revoked. Please log in again.');
        }

        // 3. Attach the verified user payload to the request object
        request['user'] = payload;
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
