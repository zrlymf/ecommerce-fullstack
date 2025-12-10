import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { UpgradeSellerDto } from './dto/upgrade-seller.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) { }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) throw new ForbiddenException('Email sudah terdaftar');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role || 'CUSTOMER',
        storeName: dto.storeName,
        storeLocation: dto.storeLocation,
      },
    });

    const tokens = await this.getTokens(newUser.id, newUser.email, newUser.role, newUser.name);
    await this.updateRefreshTokenHash(newUser.id, tokens.refresh_token);
    return tokens;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Email atau password salah');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) throw new UnauthorizedException('Email atau password salah');

    const tokens = await this.getTokens(user.id, user.email, user.role, user.name);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);
    return tokens;
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.hashedRefreshToken) throw new ForbiddenException('Akses Ditolak');

    const rtMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!rtMatches) throw new ForbiddenException('Akses Ditolak');

    const tokens = await this.getTokens(user.id, user.email, user.role, user.name);

    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
    return { message: 'Berhasil Logout' };
  }

  async upgradeToSeller(userId: number, dto: UpgradeSellerDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { 
        role: 'SELLER',
        storeName: dto.storeName,         
        storeLocation: dto.storeLocation  
      },
    });

    const tokens = await this.getTokens(user.id, user.email, user.role, user.name);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);
    return tokens;
  }

  async updateRefreshTokenHash(userId: number, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hash },
    });
  }

  async getTokens(userId: number, email: string, role: string, name: string) {
    const payload = { 
      sub: userId, 
      email, 
      role, 
      name 
    };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: 'RAHASIA_SANGAT_PENTING', 
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: 'RAHASIA_SANGAT_PENTING',
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }
}