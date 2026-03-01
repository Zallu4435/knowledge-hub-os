import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { PrismaService } from '../../../libs/database/src/prisma.service'; // Add this

@Module({
  imports: [
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
  providers: [PrismaService], // Add this
})
export class AppModule { }
