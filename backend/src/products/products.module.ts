import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module'; 

@Module({
  imports: [
    PrismaModule, 
    EmailModule
  ], 
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}