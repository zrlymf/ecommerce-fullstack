import { Controller, Post, Body, UseGuards, Request, Get, Patch, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  // POST /orders -> Buat Pesanan Baru
  @Post()
  create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, createOrderDto);
  }

  // GET /orders/my-orders -> Lihat Riwayat Pesanan (Customer)
  @Get('my-orders')
  findAll(@Request() req, @Query() query: any) {
    return this.ordersService.findAllMyOrders(req.user.userId, query);
  }

  // GET /orders/manage -> Lihat Pesanan Masuk (Seller)
  @Get('manage')
  findSellerOrders(@Request() req) {
    return this.ordersService.findOrdersForSeller(req.user.userId);
  }

  // PATCH /orders/:id/status -> Update status (Seller)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @Request() req) {
    return this.ordersService.updateStatus(+id, dto, req.user.userId);
  }

  // PATCH /orders/:id/cancel -> Cancel Order (Customer)
  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.cancelMyOrder(+id, req.user.userId);
  }

  // PATCH /orders/:id/receive -> Konfirmasi Terima Barang (Customer) 
  @Patch(':id/receive')
  receiveOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.receiveOrder(+id, req.user.userId);
  }
}