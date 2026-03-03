import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LoggerModule } from 'nestjs-pino';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../libs/database/src/prisma.service';
import { RedisService } from '../../../libs/security/src/redis.service';

@Module({
    imports: [
        // Load .env globally from the monorepo root
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),

        LoggerModule.forRoot({
            pinoHttp: {
                name: 'auth-service',
                level: process.env.LOG_LEVEL || 'info',
                transport: process.env.NODE_ENV !== 'production'
                    ? { target: 'pino-pretty', options: { colorize: true } }
                    : undefined,
            },
        }),

        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET || 'super-secret-development-key',
            signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any },
        }),

        ClientsModule.register([{
            name: 'KAFKA_SERVICE',
            transport: Transport.KAFKA,
            options: {
                client: {
                    brokers: [(process.env.KAFKA_BROKER_URL || 'localhost:9092')],
                },
                producerOnlyMode: true,
            },
        }]),
    ],
    controllers: [AuthController],
    providers: [AuthService, PrismaService, RedisService],
})
export class AuthModule { }
