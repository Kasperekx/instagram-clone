import { CreateUserDto } from './dto/auth.dto';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  signUp(@Body() dto: CreateUserDto): Promise<User> {
    return this.authService.signUp(dto);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() dto: CreateUserDto): Promise<User> {
    return this.authService.signIn(dto);
  }
}
