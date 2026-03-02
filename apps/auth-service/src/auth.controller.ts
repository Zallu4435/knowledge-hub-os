import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

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
}
