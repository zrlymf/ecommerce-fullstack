import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.initTransporter();
  }

  initTransporter() {
    // Menggunakan konfigurasi dari .env
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false, 
      auth: {
        user: process.env.MAIL_USER, 
        pass: process.env.MAIL_PASS, 
      },
    });

    if (process.env.NODE_ENV !== 'test') {
      console.log(`📧 Email Service Siap! Mengirim sebagai: ${process.env.MAIL_FROM}`);
    }
  }

  private logSending(to: string, subject: string) {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`📨 [EMAIL SENT] Ke: ${to} | Subjek: ${subject}`);
    }
  }

  // 1. WELCOME EMAIL
  async sendWelcomeEmail(to: string, name: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: to,
      subject: 'Selamat Datang di Belanjain! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #ee4d2d;">Halo ${name}! 👋</h1>
            <p>Terima kasih telah mendaftar di <b>Belanjain</b>.</p>
            <p>Selamat berbelanja kebutuhanmu dengan mudah dan cepat!</p>
        </div>
      `,
    });
    this.logSending(to, 'Welcome Email');
  }

  // 2. ORDER CONFIRMATION (Ke Customer)
  async sendOrderConfirmation(to: string, name: string, orderNumber: string, total: number) {
    const formattedTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(total);

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: to,
      subject: `✅ Pesanan Diterima #${orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Halo ${name},</h2>
            <p>Pesanan Anda telah kami terima dan sedang menunggu diproses oleh Seller.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                <p style="margin: 5px 0;"><strong>No. Order:</strong> ${orderNumber}</p>
                <p style="margin: 5px 0;"><strong>Total Pembayaran:</strong> <span style="color: #28a745; font-weight: bold; font-size: 16px;">${formattedTotal}</span></p>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="background: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: bold;">PENDING</span></p>
            </div>
            
            <p>Kami akan mengirimkan notifikasi lagi saat barang dikirim.</p>
            <p style="color: #888; font-size: 12px;">Terima kasih telah berbelanja di Belanjain.</p>
        </div>
      `,
    });
    this.logSending(to, 'Order Confirmation');
  }

  // 3. NEW ORDER ALERT (Ke Seller)
  async sendNewOrderAlert(to: string, sellerName: string, orderNumber: string, productName: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: to,
      subject: `🔔 Pesanan Baru Masuk! (#${orderNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #007bff;">Halo Seller ${sellerName},</h2>
            <p>Kabar gembira! Ada pesanan baru masuk ke toko Anda.</p>
            
            <div style="border-left: 4px solid #007bff; padding-left: 10px; margin: 15px 0;">
                <p><strong>Item:</strong> ${productName} (dan lainnya...)</p>
                <p><strong>No. Order:</strong> ${orderNumber}</p>
            </div>

            <p>Segera proses pesanan ini di dashboard Anda agar pembeli senang!</p>
            <a href="http://localhost:5173/manage-orders" style="display: inline-block; background: #ee4d2d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Buka Dashboard Seller</a>
        </div>
      `,
    });
    this.logSending(to, 'New Order Alert');
  }

  // 4. ORDER STATUS UPDATE (Ke Customer)
  async sendOrderStatusUpdate(to: string, customerName: string, orderNumber: string, status: string) {
    let message = '';
    let color = '#333';

    if (status === 'SHIPPED') {
        message = 'Paket Anda sudah diserahkan ke kurir dan sedang dalam perjalanan! 🚚';
        color = '#007bff'; 
    } else if (status === 'DELIVERED') {
        message = 'Paket telah sampai di alamat tujuan! Terima kasih sudah berbelanja. 🎉';
        color = '#28a745'; 
    } else if (status === 'CANCELLED') {
        message = 'Pesanan ini telah dibatalkan. Dana akan dikembalikan sesuai kebijakan.';
        color = '#dc3545'; 
    }

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: to,
      subject: `📦 Update Status Pesanan #${orderNumber}: ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
            <h2>Halo ${customerName},</h2>
            <p>Ada update terbaru mengenai pesanan <strong>#${orderNumber}</strong>:</p>
            
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
                <h1 style="color: ${color}; margin: 0;">${status}</h1>
                <p style="font-size: 16px; margin-top: 10px;">${message}</p>
            </div>

            <p style="color: #888; font-size: 12px;">Cek detail selengkapnya di aplikasi Belanjain.</p>
        </div>
      `,
    });
    this.logSending(to, `Status Update: ${status}`);
  }

  // 5. LOW STOCK ALERT (Ke Seller)
  async sendLowStockAlert(to: string, sellerName: string, productName: string, currentStock: number) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: to,
      subject: `⚠️ Stok Menipis: ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; border: 1px solid #dc3545; padding: 20px; border-radius: 8px;">
            <h2 style="color: #dc3545; margin-top: 0;">⚠️ Peringatan Stok</h2>
            <p>Halo <strong>${sellerName}</strong>,</p>
            <p>Stok produk berikut sudah menipis dan perlu segera di-restock:</p>
            
            <ul style="font-size: 16px;">
                <li>Produk: <strong>${productName}</strong></li>
                <li>Sisa Stok: <span style="color: red; font-weight: bold; font-size: 18px;">${currentStock}</span></li>
            </ul>
            
            <p>Segera lakukan update stok di menu Inventaris agar penjualan tidak terhenti.</p>
            <a href="http://localhost:5173/inventory" style="color: #dc3545; font-weight: bold;">Ke Menu Inventaris &rarr;</a>
        </div>
      `,
    });
    this.logSending(to, 'Low Stock Alert');
  }

  // 6. WEEKLY SALES REPORT (Laporan Mingguan)
  async sendWeeklyReport(to: string, sellerName: string, weekRevenue: number, totalOrders: number) {
    const formattedRevenue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(weekRevenue);

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: to,
      subject: `📊 Laporan Penjualan Mingguan Toko Anda`,
      html: `
        <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h2 style="color: #6f42c1;">Laporan Mingguan Belanjain</h2>
            <p>Halo <strong>${sellerName}</strong>,</p>
            <p>Berikut adalah ringkasan performa toko Anda dalam 7 hari terakhir:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; display: flex; gap: 20px;">
                <div>
                    <p style="margin: 0; color: #666; font-size: 12px;">Total Pendapatan</p>
                    <h3 style="margin: 5px 0; color: #28a745;">${formattedRevenue}</h3>
                </div>
                <div>
                    <p style="margin: 0; color: #666; font-size: 12px;">Total Pesanan</p>
                    <h3 style="margin: 5px 0; color: #007bff;">${totalOrders} Transaksi</h3>
                </div>
            </div>
            
            <p style="margin-top: 20px;">Terus tingkatkan penjualan Anda!</p>
            <a href="http://localhost:5173/seller-dashboard" style="text-decoration: none; color: #6f42c1; font-weight: bold;">Lihat Analitik Lengkap &rarr;</a>
        </div>
      `,
    });
    this.logSending(to, 'Weekly Report');
  }
}