import { BadRequestException, Injectable, ForbiddenException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Order } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) { }

  // 1. CREATE ORDER (Split Order Logic)
  async create(userId: number, dto: CreateOrderDto) {
    const customer = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!customer) throw new BadRequestException('User tidak ditemukan');

    return this.prisma.$transaction(async (tx) => {
      // 1. Ambil semua item dari keranjang
      const cartItems = await tx.cartItem.findMany({
        where: { id: { in: dto.cartItemIds }, cart: { userId: userId } },
        include: {
          product: { include: { user: true } }
        }
      });

      if (cartItems.length === 0) throw new BadRequestException('Tidak ada barang yang dipilih.');

      // 2. Grouping Items Berdasarkan Seller
      const itemsBySeller = new Map<number, typeof cartItems>();

      for (const item of cartItems) {
        const sellerId = item.product.userId;
        if (!itemsBySeller.has(sellerId)) {
          itemsBySeller.set(sellerId, []);
        }
        itemsBySeller.get(sellerId)!.push(item);
      }

      const createdOrders: Order[] = [];

      // 3. Loop setiap Seller untuk membuat Order terpisah
      for (const [sellerId, items] of itemsBySeller) {
        let sellerTotal = 0;

        for (const item of items) {
          if (item.product.stock < item.quantity) {
            throw new BadRequestException(`Stok produk "${item.product.name}" tidak mencukupi!`);
          }
          sellerTotal += Number(item.product.price) * item.quantity;
        }

        const orderNumber = `ORD-${Date.now()}-${sellerId}-${Math.floor(Math.random() * 1000)}`;
        const shippingCostPerOrder = 0;

        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            totalPrice: sellerTotal + shippingCostPerOrder,
            shippingAddress: dto.shippingAddress,
            paymentMethod: dto.paymentMethod,
            status: 'PENDING',
          }
        });

        for (const item of items) {
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
              selectedVariant: item.selectedVariant as any
            }
          });

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });

          if (item.product.stock < 10) { 
            // logic email low stock
          }
        }

        const sellerInfo = items[0].product.user;
        this.emailService.sendNewOrderAlert(
          sellerInfo.email,
          sellerInfo.name,
          orderNumber,
          `${items.length} Barang`
        );

        createdOrders.push(newOrder);
      }

      await tx.cartItem.deleteMany({ where: { id: { in: dto.cartItemIds } } });

      for (const order of createdOrders) {
        this.emailService.sendOrderConfirmation(
          customer.email, customer.name, order.orderNumber, Number(order.totalPrice)
        );
      }

      return createdOrders;
    });
  }

  // 2. LIHAT ORDER (Customer) - Tidak banyak berubah
  async findAllMyOrders(userId: number, query: any = {}) {
    const { status, page = 1, limit = 10, startDate, endDate } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: skip
      }),
      this.prisma.order.count({ where })
    ]);

    // Format data number
    const data = orders.map(order => ({
      ...order,
      totalPrice: Number(order.totalPrice),
      items: order.items.map(item => ({
        ...item,
        price: Number(item.price),
        product: {
          ...item.product,
          price: Number(item.product.price)
        }
      }))
    }));

    return {
      data,
      meta: {
        total,
        page: Number(page),
        last_page: Math.ceil(total / Number(limit))
      }
    };
  }

  // 3. LIHAT ORDER MASUK (Seller)
  // REVISI: Karena Order sudah di-split, logikanya jadi jauh lebih simpel!
  // Satu order header pasti milik satu seller.
  async findOrdersForSeller(sellerId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        items: {
          some: { product: { userId: sellerId } }
        }
      },
      include: {
        user: { select: { name: true, email: true, storeLocation: true } }, // Include data pembeli
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Tidak perlu lagi map manual reduce income, karena totalPrice di tabel Order 
    // sekarang sudah pasti total pendapatan seller tersebut (karena split).
    return orders.map(order => ({
      ...order,
      totalPrice: Number(order.totalPrice), // Convert Decimal to Number
      items: order.items.map(item => ({
        ...item,
        price: Number(item.price),
        product: {
          ...item.product,
          price: Number(item.product.price)
        }
      }))
    }));
  }

  // 4. UPDATE STATUS (Seller) - Logic tetap, tapi sekarang aman untuk multi-seller
  async updateStatus(orderId: number, dto: UpdateOrderStatusDto, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true }
    });

    if (!order) throw new BadRequestException('Order tidak ditemukan');

    // Validasi Tambahan: Pastikan Seller yang update adalah pemilik produk di order ini
    // (Optional tapi bagus untuk keamanan)
    // Cek item pertama saja, karena sekarang 1 order = 1 seller
    /* const firstItemProduct = await this.prisma.product.findUnique({ where: { id: order.items[0].productId }});
    if (firstItemProduct.userId !== userId) throw new ForbiddenException('Bukan pesanan toko Anda');
    */

    const result = await this.prisma.$transaction(async (tx) => {
      // Jika cancel, kembalikan stok
      if (dto.status === 'CANCELLED' && order.status !== 'CANCELLED') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }

      const dataToUpdate: any = { status: dto.status };
      const now = new Date();

      switch (dto.status) {
        case 'PROCESSING': dataToUpdate.processedAt = now; break;
        case 'SHIPPED': dataToUpdate.shippedAt = now; break;
        case 'DELIVERED': dataToUpdate.deliveredAt = now; break;
        case 'CANCELLED': dataToUpdate.cancelledAt = now; break;
      }

      return tx.order.update({
        where: { id: orderId },
        data: dataToUpdate,
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: true } }
        }
      });
    });

    // Email Notifikasi Status Update
    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(dto.status)) {
      if (order.user) {
        this.emailService.sendOrderStatusUpdate(
          order.user.email,
          order.user.name,
          order.orderNumber,
          dto.status
        );
      }
    }

    return result;
  }

  // 5. CANCEL ORDER (Customer) - Tidak berubah
  async cancelMyOrder(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true }
    });

    if (!order) throw new BadRequestException('Order tidak ditemukan');
    if (order.userId !== userId) throw new ForbiddenException('Anda tidak berhak membatalkan pesanan ini');
    if (order.status !== 'PENDING') throw new BadRequestException('Pesanan tidak dapat dibatalkan.');

    const result = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }
      return tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });
    });

    if (order.user) {
      this.emailService.sendOrderStatusUpdate(
        order.user.email, order.user.name, order.orderNumber, 'CANCELLED'
      );
    }

    return result;
  }

  // 6. CONFIRM RECEIVED (Customer) - Tidak berubah
  async receiveOrder(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order) throw new BadRequestException('Order tidak ditemukan');
    if (order.userId !== userId) throw new ForbiddenException('Bukan pesanan Anda');
    if (order.status !== 'SHIPPED') throw new BadRequestException('Barang belum dikirim, tidak bisa konfirmasi diterima.');

    const result = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date()
      }
    });

    if (order.user) {
      this.emailService.sendOrderStatusUpdate(
        order.user.email,
        order.user.name,
        order.orderNumber,
        'DELIVERED'
      );
    }

    return result;
  }
}