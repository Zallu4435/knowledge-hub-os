import { Controller, Get, Post, Body, Inject, OnModuleInit, UseGuards, Req, Res } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { UserCreatedEvent } from '../../../libs/event_schemas/UserCreatedEvent';
import { PrismaService } from '../../../libs/database/src/prisma.service';
import { JwtAuthGuard } from '../../../libs/security/src/jwt-auth.guard';
import { Response } from 'express';

// ─────────────────────────────────────────────────────────────
// Phase 12 — Prometheus metrics for this service
// ─────────────────────────────────────────────────────────────
import * as client from 'prom-client';

// Register default Node.js metrics (event loop lag, memory, GC, etc.)
client.collectDefaultMetrics({ prefix: 'api_gateway_' });

// Custom counter: how many Kafka events this gateway has published
const kafkaPublishCounter = new client.Counter({
  name: 'api_gateway_kafka_events_published_total',
  help: 'Total number of Kafka events published by the API Gateway',
  labelNames: ['topic'],
});

// HTTP request counter (pair with pino-http request ID for tracing)
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests handled',
  labelNames: ['method', 'route', 'status'],
});

@Controller()
export class AppController implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly prisma: PrismaService,
  ) { }

  async onModuleInit() {
    if (process.env.KAFKA_BROKER_URL) {
      await this.kafkaClient.connect();
    }
  }

  // ── Health ────────────────────────────────────────────────
  @Get('users/health')
  health() {
    return { status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() };
  }

  // ── Phase 12: Prometheus metrics scrape endpoint ──────────
  @Get('metrics')
  async metrics(@Res() res: Response) {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  }

  // ── Protected user creation → Postgres + Kafka ────────────
  @UseGuards(JwtAuthGuard)
  @Post('users')
  async createUser(@Body() event: UserCreatedEvent, @Req() request: any) {
    // request.user now contains the verified JWT payload
    const user = await this.prisma.user.create({
      data: {
        email: event.data.email,
        role: event.data.role,
      },
    });

    if (process.env.KAFKA_BROKER_URL) {
      this.kafkaClient.emit('user.events', event);
      // Track the publish in Prometheus
      kafkaPublishCounter.labels('user.events').inc();
    }

    // HTTP fallback: when Kafka is not configured (e.g. Render free tier),
    // post directly to ai-service. Fire-and-forget — don't await.
    const aiServiceUrl = process.env.AI_SERVICE_INTERNAL_URL || process.env.NEXT_PUBLIC_AI_SERVICE_URL;
    if (!process.env.KAFKA_BROKER_URL && aiServiceUrl) {
      fetch(`${aiServiceUrl}/events/user-created`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch((err) => console.error('[HTTP-fallback] user event failed:', err));
    }

    httpRequestsTotal.labels('POST', '/users', '200').inc();

    return {
      status: 'Secure Request Processed',
      db_id: user.id,
      kafka_eventId: event.eventId,
    };
  }
}

