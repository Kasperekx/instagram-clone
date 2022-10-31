import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/index';
import { ForbiddenException, Injectable } from '@nestjs/common';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async signUp(dto: CreateUserDto) {
    const hash = await argon.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          nickname: dto.nickname,
          hash,
        },
      });
      const tokens = await this.getTokens(user.id, user.email);
      await this.updateRthash(user.id, tokens.refresh_token);
      return tokens;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw error;
    }
  }

  async signIn(dto: CreateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (!user) throw new ForbiddenException('Access Denied!');
    const comparePass = await argon.verify(user.hash, dto.password);
    if (!comparePass) throw new ForbiddenException('Password is wrong');
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRthash(user.id, tokens.refresh_token);
    return tokens;
  }

  async getTokens(userId: number, email: string) {
    const accessToken = this.jwtService.signAsync(
      {
        sub: userId,
        email,
      },
      {
        secret: this.config.get('SECRET_KEY'),
        expiresIn: 60 * 15,
      },
    );
    const refreshToken = this.jwtService.signAsync(
      {
        sub: userId,
        email,
      },
      {
        secret: this.config.get('SECRET_KEY'),
        expiresIn: 60 * 60 * 24 * 7,
      },
    );

    return {
      access_token: await accessToken,
      refresh_token: await refreshToken,
    };
  }

  async updateRthash(userId: number, refreshToken: string): Promise<void> {
    const hash = await argon.hash(refreshToken);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRt: hash,
      },
    });
  }
}
