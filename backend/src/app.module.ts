import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { EmailModule } from './email/email.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule, 
    AuthModule, 
    ProductsModule, 
    EmailModule, 
    CartModule, 
    OrdersModule, 
    DashboardModule, UsersModule, ReviewsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}