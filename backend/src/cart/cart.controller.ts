import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt')) 
@Controller('cart')
export class CartController { 
  constructor(private readonly cartService: CartService) {}

  // 1. Tambah Barang (POST /cart)
  @Post()
  create(@Request() req, @Body() createCartDto: CreateCartDto) {
    return this.cartService.create(req.user.userId, createCartDto);
  }

  // 2. Lihat Keranjang (GET /cart)
  @Get()
  findAll(@Request() req) {
    return this.cartService.findAll(req.user.userId);
  }

  // 3. Update Jumlah (PATCH /cart/:id)
  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateCartDto: UpdateCartDto) {
    return this.cartService.update(+id, updateCartDto, req.user.userId);
  }

  // 4. Hapus Barang (DELETE /cart/:id)
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.cartService.remove(+id, req.user.userId);
  }
}