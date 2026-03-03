import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from 'nestjs-pino';
import { GoalController } from './goal.controller';
import { PrismaService } from '../../../libs/database/src/prisma.service';
import { RedisService } from '../../../libs/security/src/redis.service';

@Module({
    imports: [
        // Load .env globally from the monorepo root
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),

        // Structured JSON logger
        LoggerModule.forRoot({
            pinoHttp: {
                name: 'goal-service',
                level: process.env.LOG_LEVEL || 'info',
                transport: process.env.NODE_ENV !== 'production'
                    ? { target: 'pino-pretty', options: { colorize: true } }
                    : undefined,
            },
        }),

        JwtModule.register({ global: true }),

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
    controllers: [GoalController],
    providers: [PrismaService, RedisService],
})
export class GoalModule { }
