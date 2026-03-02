import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../libs/database/src/prisma.service';

@Module({
    imports: [
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET || 'super-secret-development-key',
            signOptions: { expiresIn: '1d' },
        }),
        // Add the Kafka Client!
        ClientsModule.register([{
            name: 'KAFKA_SERVICE',
            transport: Transport.KAFKA,
            options: {
                client: { brokers: ['localhost:9092'] },
                producerOnlyMode: true,
            },
        }]),
    ],
    controllers: [AuthController],
    providers: [AuthService, PrismaService],
})
export class AuthModule { }
