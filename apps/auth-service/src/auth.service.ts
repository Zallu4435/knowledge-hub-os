import { Injectable, UnauthorizedException, ConflictException, Inject, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientKafka } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../../libs/database/src/prisma.service';
import { UserCreatedEvent } from '../../../libs/event_schemas/UserCreatedEvent';

@Injectable()
export class AuthService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka // Inject Kafka
    ) { }

    async onModuleInit() {
        await this.kafkaClient.connect();
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
            }
        };

        // Fire it to Kafka!
        this.kafkaClient.emit('user.events', eventPayload);
        console.log(`📢 Auth Service emitted UserCreatedEvent for: ${user.email}`);

        const payload = { sub: user.id, email: user.email, role: user.role };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: { id: user.id, email: user.email, role: user.role }
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
            user: { id: user.id, email: user.email, role: user.role }
        };
    }
}
