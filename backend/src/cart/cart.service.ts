import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private normalizeVariant(variant: any): string {
    if (!variant || typeof variant !== 'object') return '{}';
    return JSON.stringify(variant, Object.keys(variant).sort());
  }

  // 1. TAMBAH KE KERANJANG 
  async create(userId: number, createCartDto: CreateCartDto) {
    const { productId, quantity, selectedVariant } = createCartDto;

    // A. Cek Produk
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    // B. Cek Stok Awal
    if (product.stock < quantity) {
        throw new BadRequestException('Stok produk tidak mencukupi');
    }

    // C. Cari atau Buat Cart
    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }

    // D. Cek apakah item dengan varian ini sudah ada
    const existingItems = await this.prisma.cartItem.findMany({
      where: {
        cartId: cart.id,
        productId: productId,
      },
    });

    // Bandingkan JSON yang masuk dengan JSON di database
    const incomingVariantStr = this.normalizeVariant(selectedVariant);

    const matchItem = existingItems.find((item) => {
      const dbVariantStr = this.normalizeVariant(item.selectedVariant);
      return dbVariantStr === incomingVariantStr;
    });

    if (matchItem) {
      // SKENARIO 1: Barang sudah ada -> UPDATE QUANTITY
      const newQuantity = matchItem.quantity + quantity;

      // Cek stok lagi dengan total baru
      if (product.stock < newQuantity) {
        throw new BadRequestException(`Stok tidak cukup. Anda sudah punya ${matchItem.quantity} di keranjang, ditambah ${quantity} melebihi stok.`);
      }

      return this.prisma.cartItem.update({
        where: { id: matchItem.id },
        data: { quantity: newQuantity },
      });

    } else {
      // SKENARIO 2: Barang belum ada atau Varian beda -> BUAT BARU
      return this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
          selectedVariant: selectedVariant || {}, 
        },
      });
    }
  }

  // 2. LIHAT ISI KERANJANG
  async findAll(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                user: { select: { id: true, name: true, storeName: true, storeLocation: true } } 
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!cart) return { items: [] }; 
    
    // Transformasi data agar price jadi Number 
    const safeItems = cart.items.map(item => ({
      ...item,
      product: {
        ...item.product,
        price: Number(item.product.price) 
      }
    }));

    return { ...cart, items: safeItems };
  }

  // 3. UPDATE JUMLAH BARANG
  async update(id: number, updateCartDto: UpdateCartDto, userId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true }
    });

    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Item tidak ditemukan atau bukan milik Anda');
    }

    // Validasi Stok saat update 
    if (updateCartDto.quantity > 0) {
        const product = await this.prisma.product.findUnique({ where: { id: item.productId }});
        if (product && product.stock < updateCartDto.quantity) {
            throw new BadRequestException('Stok tidak mencukupi');
        }
    }

    return this.prisma.cartItem.update({
      where: { id },
      data: { quantity: updateCartDto.quantity }
    });
  }

  // 4. HAPUS BARANG DARI KERANJANG
  async remove(id: number, userId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true }
    });

    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Item tidak ditemukan');
    }

    return this.prisma.cartItem.delete({ where: { id } });
  }
}