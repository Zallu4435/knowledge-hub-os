import { Body, Controller, Get, Post, HttpCode, HttpStatus, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../../libs/security/src/jwt-auth.guard';
import { Response } from 'express';

// ─────────────────────────────────────────────────────────────
// Phase 12 — Prometheus metrics
// ─────────────────────────────────────────────────────────────
import * as client from 'prom-client';

client.collectDefaultMetrics({ prefix: 'auth_service_' });

const authOperationCounter = new client.Counter({
    name: 'auth_service_operations_total',
    help: 'Total number of auth operations (register, login, logout)',
    labelNames: ['operation', 'status'],
});

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Get('health')
    health() {
        return { status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() };
    }

    // ── Phase 12: Prometheus metrics scrape endpoint ──────────
    @Get('metrics')
    async metrics(@Res() res: Response) {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    }

    @Post('register')
    async register(@Body() body: Record<string, any>) {
        try {
            const result = await this.authService.register(body.email, body.password, body.role);
            authOperationCounter.labels('register', 'success').inc();
            return result;
        } catch (err) {
            authOperationCounter.labels('register', 'error').inc();
            throw err;
        }
    }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body() body: Record<string, any>) {
        try {
            const result = await this.authService.login(body.email, body.password);
            authOperationCounter.labels('login', 'success').inc();
            return result;
        } catch (err) {
            authOperationCounter.labels('login', 'error').inc();
            throw err;
        }
    }

    /**
     * POST /auth/logout
     * Adds the current Bearer token to the Redis blacklist so it can never be
     * reused — even if the client-side cookie or localStorage is still present.
     */
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('logout')
    async logout(@Req() req: any) {
        authOperationCounter.labels('logout', 'success').inc();
        return this.authService.logout(req);
    }
}

