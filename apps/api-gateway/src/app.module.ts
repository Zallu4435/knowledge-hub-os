import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { PrismaService } from '../../../libs/database/src/prisma.service';
import { RedisService } from '../../../libs/security/src/redis.service';

@Module({
  imports: [
    // Load .env globally from the monorepo root & make ConfigService injectable everywhere
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),

    // Structured JSON logger (Pino)
    LoggerModule.forRoot({
      pinoHttp: {
        name: 'api-gateway',
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
  controllers: [AppController],
  providers: [PrismaService, RedisService],
})
export class AppModule { }
