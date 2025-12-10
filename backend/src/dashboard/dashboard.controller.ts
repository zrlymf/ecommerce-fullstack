import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt')) // Wajib Login
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('seller')
  getSellerStats(@Request() req) {
    // req.user.userId didapat dari Token JWT
    return this.dashboardService.getSellerStats(req.user.userId);
  }
}