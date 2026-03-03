import { Controller, Get, Post, Patch, Body, Param, Req, Res, UseGuards, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { PrismaService } from '../../../libs/database/src/prisma.service';
import { JwtAuthGuard } from '../../../libs/security/src/jwt-auth.guard';
import * as crypto from 'crypto';
import { Response } from 'express';

// ─────────────────────────────────────────────────────────────
// Phase 12 — Prometheus metrics
// ─────────────────────────────────────────────────────────────
import * as client from 'prom-client';

client.collectDefaultMetrics({ prefix: 'goal_service_' });

const tasksCompletedCounter = new client.Counter({
    name: 'goal_service_tasks_completed_total',
    help: 'Total number of tasks marked as complete',
    labelNames: ['status'],
});

const kafkaPublishCounter = new client.Counter({
    name: 'goal_service_kafka_events_published_total',
    help: 'Total Kafka events published by goal-service',
    labelNames: ['topic'],
});

// Public health endpoint (no auth guard)
@Controller()
export class HealthController {
    @Get('health')
    health() {
        return { status: 'ok', service: 'goal-service', timestamp: new Date().toISOString() };
    }

    // ── Phase 12: Prometheus metrics scrape endpoint ──────────
    @Get('metrics')
    async metrics(@Res() res: Response) {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    }
}

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalController implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka
    ) { }

    async onModuleInit() {
        if (process.env.KAFKA_BROKER_URL) {
            await this.kafkaClient.connect();
        }
    }

    // Fetch all goals and their related tasks for the logged-in user
    @Get()
    async getGoals(@Req() req: any) {
        const userId = req.user.sub;

        const goals = await this.prisma.goal.findMany({
            where: { userId: userId },
            include: {
                tasks: {
                    orderBy: { createdAt: 'asc' } // Keep tasks in a consistent order
                }
            },
            orderBy: { createdAt: 'desc' } // Newest goals first
        });

        return goals;
    }

    // Create a new Goal with some initial Tasks
    @Post()
    async createGoal(@Req() req: any, @Body() body: { title: string; tasks: string[] }) {
        const userId = req.user.sub;

        const goal = await this.prisma.goal.create({
            data: {
                title: body.title,
                userId: userId,
                tasks: {
                    create: body.tasks.map(title => ({ title }))
                }
            },
            include: { tasks: true }
        });

        return goal;
    }

    // Mark a task as complete and tell Kafka!
    @Patch('tasks/:id/complete')
    async completeTask(@Req() req: any, @Param('id') taskId: string) {
        const task = await this.prisma.task.update({
            where: { id: taskId },
            data: { status: 'DONE' },
            include: { goal: true }
        });

        // Fire the event to Kafka for the AI Brain to process
        const eventPayload = {
            eventId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            data: {
                userId: req.user.sub,
                goalTitle: task.goal.title,
                taskTitle: task.title
            }
        };

        if (process.env.KAFKA_BROKER_URL) {
            this.kafkaClient.emit('task.completed', eventPayload);
            kafkaPublishCounter.labels('task.completed').inc();
        }

        // HTTP fallback: when Kafka is not configured (e.g. Render free tier),
        // post directly to ai-service. Fire-and-forget — don't await.
        const aiServiceUrl = process.env.AI_SERVICE_INTERNAL_URL || process.env.NEXT_PUBLIC_AI_SERVICE_URL;
        if (!process.env.KAFKA_BROKER_URL && aiServiceUrl) {
            fetch(`${aiServiceUrl}/events/task-completed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventPayload),
            }).catch((err) => console.error('[HTTP-fallback] task event failed:', err));
        }

        // Track in Prometheus
        tasksCompletedCounter.labels('DONE').inc();

        return task;
    }
}

