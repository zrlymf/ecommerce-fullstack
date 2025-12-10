import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSellerStats(sellerId: number) {
    const now = new Date();
    
    // 1. Awal Hari Ini (00:00:00)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 2. Awal Minggu Ini (Hari Minggu terakhir)
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());

    // 3. Awal Bulan Ini (Tanggal 1)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Ambil data
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        product: { userId: sellerId }, 
        order: { status: { not: 'CANCELLED' } } 
      },
      include: { order: true, product: true }
    });

    // A. Variabel Pendapatan 
    let revenueAllTime = 0;
    let revenueToday = 0;
    let revenueThisWeek = 0;
    let revenueThisMonth = 0;

    // B. Variabel Jumlah Order 
    let ordersToday = 0;     
    let ordersThisWeek = 0;   
    let ordersThisMonth = 0;  

    // Set untuk mencegah double count orderID yang sama 
    const processedOrderIdsToday = new Set(); 
    const processedOrderIdsWeek = new Set();
    const processedOrderIdsMonth = new Set();

    // LOOPING UTAMA
    orderItems.forEach(item => {
      const income = Number(item.price) * item.quantity;
      const orderDate = new Date(item.order.createdAt);
      const oid = item.orderId; // Alias untuk Order ID

      // 1. Hitung Pendapatan 
      revenueAllTime += income;

      if (orderDate >= startOfDay) {
        revenueToday += income;
      }
      if (orderDate >= startOfWeek) {
        revenueThisWeek += income;
      }
      if (orderDate >= startOfMonth) {
        revenueThisMonth += income;
      }

      // 2. Hitung Jumlah Order
      if (orderDate >= startOfDay) {
         if (!processedOrderIdsToday.has(oid)) {
            ordersToday++;
            processedOrderIdsToday.add(oid);
         }
      }
      if (orderDate >= startOfWeek) {
         if (!processedOrderIdsWeek.has(oid)) {
            ordersThisWeek++;
            processedOrderIdsWeek.add(oid);
         }
      }
      if (orderDate >= startOfMonth) {
         if (!processedOrderIdsMonth.has(oid)) {
            ordersThisMonth++;
            processedOrderIdsMonth.add(oid);
         }
      }
    });

    // Hitung Jumlah Order Keseluruhan
    const uniqueOrderIds = new Set(orderItems.map(item => item.orderId));
    const totalOrders = uniqueOrderIds.size;

    // Produk Terlaris
    const productSales: Record<string, any> = {};
    
    orderItems.forEach(item => {
      const pid = item.productId;
      if (!productSales[pid]) {
        productSales[pid] = { 
            id: pid,
            name: item.product.name, 
            sold: 0, 
            revenue: 0 
        };
      }
      productSales[pid].sold += item.quantity;
      productSales[pid].revenue += Number(item.price) * item.quantity;
    });

    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.sold - a.sold)
      .slice(0, 5);

    // Status breakdown
    const sellerOrders = await this.prisma.order.findMany({
      where: {
        items: { some: { product: { userId: sellerId } } }
      },
      select: { status: true }
    });

    const statusBreakdown: any = {
      PENDING: 0, PROCESSING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0
    };
    
    sellerOrders.forEach(o => {
      if (statusBreakdown[o.status] !== undefined) {
        statusBreakdown[o.status]++;
      }
    });

    // Stok menipis
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        userId: sellerId,
        stock: { lt: 10 }
      },
      select: { id: true, name: true, stock: true, imageUrl: true },
      take: 5 
    });

    // Tren penjualan harian
    const salesTrend = this.calculateSalesTrend(orderItems);

    return {
      revenueAllTime, 
      revenueToday,     
      revenueThisWeek, 
      revenueThisMonth,
      
      ordersToday,     
      ordersThisWeek,   
      ordersThisMonth,  
      
      totalOrders,
      topProducts,
      statusBreakdown,
      lowStockProducts,
      salesTrend
    };
  }

  // Helper: Hitung Tren Harian
  private calculateSalesTrend(items: any[]) {
    const last7Days: Record<string, number> = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; 
      last7Days[dateStr] = 0;
    }

    items.forEach(item => {
      const dateStr = item.order.createdAt.toISOString().split('T')[0];
      if (last7Days[dateStr] !== undefined) {
        last7Days[dateStr] += Number(item.price) * item.quantity;
      }
    });

    return Object.keys(last7Days).map(date => ({
      date, 
      amount: last7Days[date] 
    }));
  }
}