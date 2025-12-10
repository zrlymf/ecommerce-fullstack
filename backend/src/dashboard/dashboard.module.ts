import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module'; 
import { TasksService } from './tasks.service';     

@Module({
  imports: [PrismaModule, EmailModule], 
  controllers: [DashboardController],
  providers: [
      DashboardService, 
      TasksService 
  ], 
})
export class DashboardModule {}