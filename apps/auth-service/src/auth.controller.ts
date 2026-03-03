import { Body, Controller, Post, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../../libs/security/src/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    register(@Body() body: Record<string, any>) {
        return this.authService.register(body.email, body.password, body.role);
    }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    login(@Body() body: Record<string, any>) {
        return this.authService.login(body.email, body.password);
    }

    /**
     * POST /auth/logout
     * Adds the current Bearer token to the Redis blacklist so it can never be
     * reused — even if the client-side cookie or localStorage is still present.
     */
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('logout')
    logout(@Req() req: any) {
        return this.authService.logout(req);
    }
}
