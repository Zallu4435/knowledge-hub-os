import { Controller, Post, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { UserCreatedEvent } from '../../../libs/event_schemas/UserCreatedEvent';

@Controller('users')
export class AppController implements OnModuleInit {
  constructor(@Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka) { }

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  @Post()
  createUser(@Body() event: UserCreatedEvent) {
    console.log('✅ Gateway Received Event:', event.eventId);

    // Publish to the 'user.events' topic
    this.kafkaClient.emit('user.events', event);

    return { status: 'Event Published to Kafka', eventId: event.eventId };
  }
}
