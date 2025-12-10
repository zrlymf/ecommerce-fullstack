import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Request, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UpgradeSellerDto } from './dto/upgrade-seller.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() body: { userId: number; refreshToken: string }) {
    return this.authService.refreshTokens(body.userId, body.refreshToken);
  }

  @UseGuards(AuthGuard('jwt')) 
  @Patch('upgrade-seller')     
  upgradeToSeller(@Request() req, @Body() dto: UpgradeSellerDto) {
    const userId = req.user['userId'];
    return this.authService.upgradeToSeller(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Request() req) {
    const userId = req.user['userId'];
    return this.authService.logout(userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  @Post('test-seller')
  testSeller() {
    return { message: 'Halo Seller! Anda berhasil masuk area terbatas.' };
  }

} 