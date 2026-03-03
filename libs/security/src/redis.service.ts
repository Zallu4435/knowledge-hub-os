import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * RedisService — thin wrapper around ioredis for JWT blacklisting.
 *
 * Usage:
 *   await redisService.blacklistToken(jti, ttlSeconds);
 *   const isBlacklisted = await redisService.isTokenBlacklisted(jti);
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly client: Redis;
    private readonly logger = new Logger(RedisService.name);

    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.client = new Redis(redisUrl);

        this.client.on('connect', () =>
            this.logger.log('✅ Connected to Redis'),
        );
        this.client.on('error', (err: Error) =>
            this.logger.error(`❌ Redis error: ${err.message}`),
        );
    }

    /**
     * Add a JWT token ID (jti) to the blacklist.
     * @param jti   — unique token identifier (JWT "jti" claim, or the token itself)
     * @param ttl   — seconds until the token naturally expires (same as JWT exp)
     */
    async blacklistToken(jti: string, ttl: number): Promise<void> {
        await this.client.set(`blacklist:${jti}`, '1', 'EX', ttl);
        this.logger.log(`Token ${jti.substring(0, 8)}… added to Redis blacklist (TTL: ${ttl}s)`);
    }

    /**
     * Check if a token ID is in the blacklist.
     */
    async isTokenBlacklisted(jti: string): Promise<boolean> {
        const result = await this.client.get(`blacklist:${jti}`);
        return result !== null;
    }

    async onModuleDestroy() {
        await this.client.quit();
    }
}
