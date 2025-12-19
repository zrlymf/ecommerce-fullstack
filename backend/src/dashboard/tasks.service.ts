import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // JADWAL: Setiap Hari Senin jam 09:00 Pagi
  // Detik ke-0, Menit ke-0, Jam 9, Setiap Tanggal, Setiap Bulan, Hari Senin (1)
  @Cron('0 0 9 * * 1')
  async handleWeeklyReport() {
    this.logger.log('🔄 Memulai proses laporan mingguan...');

    // 1. Ambil semua Seller
    const sellers = await this.prisma.user.findMany({
      where: { role: 'SELLER' },
      select: { id: true, name: true, email: true }
    });

    // 2. Tentukan Rentang Waktu (7 Hari Terakhir)
    const now = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(now.getDate() - 7);

    // 3. Loop setiap Seller & Hitung Penjualan
    for (const seller of sellers) {
      // Ambil item yang terjual minggu ini
      const orderItems = await this.prisma.orderItem.findMany({
        where: {
          product: { userId: seller.id },
          order: { 
            createdAt: { gte: lastWeek },
            status: { not: 'CANCELLED' } // Jangan hitung yang batal
          }
        }
      });

      // Hitung Total Pendapatan
      const weeklyRevenue = orderItems.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
      
      // Hitung Jumlah Order Unik
      const uniqueOrderIds = new Set(orderItems.map(item => item.orderId));
      const totalOrders = uniqueOrderIds.size;

      // 4. Kirim Email (Hanya jika ada penjualan)
      if (weeklyRevenue > 0) {
        await this.emailService.sendWeeklyReport(seller.email, seller.name, weeklyRevenue, totalOrders);
        this.logger.log(`✅ Laporan Mingguan terkirim ke: ${seller.email}`);
      }
    }
    
    this.logger.log('🏁 Selesai mengirim semua laporan mingguan.');
  }
}