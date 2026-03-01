import { Controller, Post, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { UserCreatedEvent } from '../../../libs/event_schemas/UserCreatedEvent';
import { PrismaService } from '../../../libs/database/src/prisma.service';

@Controller('users')
export class AppController implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly prisma: PrismaService, // Inject Prisma
  ) { }

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  @Post()
  async createUser(@Body() event: UserCreatedEvent) {
    // 1. Persist to Neon Postgres
    const user = await this.prisma.user.create({
      data: {
        email: event.data.email,
        role: event.data.role,
      },
    });

    console.log('💾 User Saved to Postgres:', user.id);

    // 2. Publish to Kafka
    this.kafkaClient.emit('user.events', event);

    return {
      status: 'User Created & Published',
      db_id: user.id,
      kafka_eventId: event.eventId
    };
  }
}
