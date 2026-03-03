import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    Inject,
    OnModuleInit,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientKafka } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../../libs/database/src/prisma.service';
import { UserCreatedEvent } from '../../../libs/event_schemas/UserCreatedEvent';
import { RedisService } from '../../../libs/security/src/redis.service';

@Injectable()
export class AuthService implements OnModuleInit {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private redisService: RedisService,
        @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    ) { }

    async onModuleInit() {
        if (process.env.KAFKA_BROKER_URL) {
            await this.kafkaClient.connect();
        }
    }

    async register(email: string, pass: string, role: string = 'developer') {
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser) throw new ConflictException('Email already in use');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(pass, salt);

        const user = await this.prisma.user.create({
            data: { email, password: hashedPassword, role },
        });

        // Construct the strict event payload
        const eventPayload: UserCreatedEvent = {
            eventId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            data: {
                userId: user.id,
                email: user.email,
                role: user.role,
            },
        };

        // Emit to Kafka (if configured)
        if (process.env.KAFKA_BROKER_URL) {
            this.kafkaClient.emit('user.events', eventPayload);
            this.logger.log(`📢 Auth Service emitted UserCreatedEvent for: ${user.email}`);
        }

        // HTTP fallback: when Kafka is not configured
        const aiServiceUrl = process.env.AI_SERVICE_INTERNAL_URL || process.env.NEXT_PUBLIC_AI_SERVICE_URL;
        if (!process.env.KAFKA_BROKER_URL && aiServiceUrl) {
            fetch(`${aiServiceUrl}/events/user-created`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventPayload),
            }).catch((err) => this.logger.error('[HTTP-fallback] user event failed:', err));
        }

        const payload = { sub: user.id, email: user.email, role: user.role };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: { id: user.id, email: user.email, role: user.role },
        };
    }

    async login(email: string, pass: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { sub: user.id, email: user.email, role: user.role };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: { id: user.id, email: user.email, role: user.role },
        };
    }

    /**
     * Logout: extract the raw token from the Authorization header and add it to
     * the Redis blacklist with a TTL matching its remaining validity time.
     */
    async logout(req: any): Promise<{ message: string }> {
        const authHeader: string = req.headers?.authorization || '';
        const token = authHeader.replace('Bearer ', '').trim();

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        // Decode without verifying (already verified by JwtAuthGuard)
        const decoded: any = this.jwtService.decode(token);
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded?.exp ? decoded.exp - now : 86400; // fallback 24h

        await this.redisService.blacklistToken(token, ttl > 0 ? ttl : 1);
        this.logger.log(`🔒 Token blacklisted for user: ${decoded?.sub}`);

        return { message: 'Logged out successfully. Token has been revoked.' };
    }
}
