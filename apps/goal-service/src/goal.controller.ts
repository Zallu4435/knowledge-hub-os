import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { PrismaService } from '../../../libs/database/src/prisma.service';
import { JwtAuthGuard } from '../../../libs/security/src/jwt-auth.guard';
import * as crypto from 'crypto';

// Public health endpoint (no auth guard)
@Controller()
export class HealthController {
    @Get('health')
    health() {
        return { status: 'ok', service: 'goal-service', timestamp: new Date().toISOString() };
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
        await this.kafkaClient.connect();
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

        this.kafkaClient.emit('task.completed', eventPayload);
        console.log(`✅ Task Completed & Event Emitted: ${task.title}`);

        return task;
    }
}
