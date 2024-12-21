import { Controller, Post, Body, Res } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto, CreateUserDto } from '../../users/dto/user.dto'
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(loginDto);
    return res.status(result.status).json({
      ...result,
    });
  }

  @Post('register')
  async signup(@Body() args: CreateUserDto, @Res() res: Response) {
    const result = await this.authService.signup(args);
    return res.status(result.status).json({
      ...result,
    });
  }
}
