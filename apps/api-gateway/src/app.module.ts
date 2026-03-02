import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { PrismaService } from '../../../libs/database/src/prisma.service';

@Module({
  imports: [
    JwtModule.register({ global: true }),
    ClientsModule.register([{
      name: 'KAFKA_SERVICE',
      transport: Transport.KAFKA,
      options: {
        client: { brokers: ['localhost:9092'] },
        producerOnlyMode: true,
      },
    }]),
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule { }
