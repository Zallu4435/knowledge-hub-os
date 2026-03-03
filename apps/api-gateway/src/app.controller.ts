import { Controller, Get, Post, Body, Inject, OnModuleInit, UseGuards, Req } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { UserCreatedEvent } from '../../../libs/event_schemas/UserCreatedEvent';
import { PrismaService } from '../../../libs/database/src/prisma.service';
import { JwtAuthGuard } from '../../../libs/security/src/jwt-auth.guard'; // Import Guard

@Controller('users')
export class AppController implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly prisma: PrismaService,
  ) { }

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() };
  }

  // 🔒 THIS ROUTE IS NOW PROTECTED
  @UseGuards(JwtAuthGuard)
  @Post()
  async createUser(@Body() event: UserCreatedEvent, @Req() request: any) {
    // request.user now contains the verified JWT payload!
    console.log(`Verified Request from User: ${request.user.email}`);

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
      status: 'Secure Request Processed',
      db_id: user.id,
      kafka_eventId: event.eventId
    };
  }
}
