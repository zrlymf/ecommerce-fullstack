import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TasksService } from '../src/dashboard/tasks.service';
import { EmailService } from '../src/email/email.service'; // Pastikan import ini ada

describe('Dashboard E2E (Fase 7: Seller Analytics)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let tasksService: TasksService;

    let tokenSeller: string;
    let sellerId: number;
    let productId: number;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
        // Mock EmailService agar tidak mengirim email sungguhan saat test
        .overrideProvider(EmailService)
        .useValue({
            sendWelcomeEmail: jest.fn(),       
            sendOrderConfirmation: jest.fn(),
            sendNewOrderAlert: jest.fn(),
            sendOrderStatusUpdate: jest.fn(),
            sendLowStockAlert: jest.fn(),
            sendWeeklyReport: jest.fn(),
        })
        .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

        prisma = app.get<PrismaService>(PrismaService);
        tasksService = app.get<TasksService>(TasksService);

        await app.init();

        // 1. BERSIHKAN DB 
        await prisma.review.deleteMany();    
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.cartItem.deleteMany();
        await prisma.cart.deleteMany();
        await prisma.product.deleteMany();
        await prisma.user.deleteMany();

        // 2. SETUP SELLER
        const regRes = await request(app.getHttpServer()).post('/auth/register').send({
            name: 'Seller Dashboard', email: 'dash_seller@test.com', password: 'password123', role: 'SELLER'
        });
        const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
            email: 'dash_seller@test.com', password: 'password123'
        });
        tokenSeller = loginRes.body.access_token;
        const seller = await prisma.user.findUnique({ where: { email: 'dash_seller@test.com' } });
        sellerId = seller!.id;

        // 3. SETUP PRODUK (Harga 100.000)
        const product = await prisma.product.create({
            data: {
                name: 'Produk Analitik', description: 'Untuk tes', price: 100000, stock: 50,
                category: 'Test', sku: 'DASH-001', userId: sellerId, imageUrl: 'test.jpg',
                variants: { Warna: ['Standard'] } 
            }
        });
        productId = product.id;

        // 4. SETUP CUSTOMER
        const cust = await prisma.user.create({ data: { name: 'Buyer', email: 'buyer@test.com', password: 'xxx' } });

        // SEEDING DATA TRANSAKSI (MANIPULASI WAKTU) 
        const now = new Date();
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        const lastMonth = new Date(now); lastMonth.setMonth(now.getMonth() - 1);

        // ORDER A: HARI INI (Qty: 1)
        await prisma.order.create({
            data: {
                orderNumber: 'ORD-TODAY', userId: cust.id, totalPrice: 100000, status: 'PENDING', shippingAddress: 'x', paymentMethod: 'TF',
                createdAt: now,
                items: { 
                    create: { 
                        productId, 
                        quantity: 1, 
                        price: 100000,
                        selectedVariant: { Warna: 'Standard' } 
                    } 
                }
            }
        });

        // ORDER B: KEMARIN (Qty: 2)
        await prisma.order.create({
            data: {
                orderNumber: 'ORD-YESTERDAY', userId: cust.id, totalPrice: 200000, status: 'SHIPPED', shippingAddress: 'x', paymentMethod: 'TF',
                createdAt: yesterday,
                items: { 
                    create: { 
                        productId, 
                        quantity: 2, 
                        price: 100000,
                        selectedVariant: { Warna: 'Standard' }
                    } 
                }
            }
        });

        // ORDER C: BULAN LALU (Qty: 1) 
        await prisma.order.create({
            data: {
                orderNumber: 'ORD-LAST-MONTH', userId: cust.id, totalPrice: 100000, status: 'DELIVERED', shippingAddress: 'x', paymentMethod: 'TF',
                createdAt: lastMonth,
                items: { 
                    create: { 
                        productId, 
                        quantity: 1, 
                        price: 100000,
                        selectedVariant: { Warna: 'Standard' }
                    } 
                }
            }
        });

        // ORDER D: CANCELLED (Qty: 5) 
        await prisma.order.create({
            data: {
                orderNumber: 'ORD-CANCEL', userId: cust.id, totalPrice: 500000, status: 'CANCELLED', shippingAddress: 'x', paymentMethod: 'TF',
                createdAt: now,
                items: { 
                    create: { 
                        productId, 
                        quantity: 5, 
                        price: 100000,
                        selectedVariant: { Warna: 'Standard' }
                    } 
                }
            }
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    // TEST CASES 

    // POINT 1: Revenue & Order Count (Daily, Weekly, Monthly)
    it('1. Cek Total Revenue & Order Count (Harian, Mingguan, Bulanan)', async () => {
        return request(app.getHttpServer())
            .get('/dashboard/seller')
            .set('Authorization', `Bearer ${tokenSeller}`)
            .expect(200)
            .expect((res) => {
                const data = res.body;

                // CEK REVENUE (UANG) 
                expect(Number(data.revenueToday)).toBe(100000);
                expect(Number(data.revenueThisWeek)).toBeGreaterThanOrEqual(100000);
                expect(Number(data.revenueAllTime)).toBe(400000);

                // CEK ORDER COUNT (JUMLAH TRANSAKSI)
                expect(data.ordersToday).toBe(1);
                expect(data.ordersThisWeek).toBeGreaterThanOrEqual(1);
                expect(data.totalOrders).toBe(3);
            });
    });

    // POINT 2: Sales Trends (Charts/Graphs)
    it('2. Cek Sales Trends (Data Grafik)', async () => {
        return request(app.getHttpServer())
            .get('/dashboard/seller')
            .set('Authorization', `Bearer ${tokenSeller}`)
            .expect(200)
            .expect((res) => {
                const trends = res.body.salesTrend;
                expect(Array.isArray(trends)).toBe(true);
                expect(trends.length).toBeGreaterThanOrEqual(7);

                // Cek struktur data 
                expect(trends[0]).toHaveProperty('date');
                expect(trends[0]).toHaveProperty('amount');

                const todayStr = new Date().toISOString().split('T')[0];
                const todayData = trends.find((t: any) => t.date === todayStr);
                expect(todayData).toBeDefined();
            });
    });

    // POINT 3: Top-Selling Products
    it('3. Cek Top Selling Products', async () => {
        return request(app.getHttpServer())
            .get('/dashboard/seller')
            .set('Authorization', `Bearer ${tokenSeller}`)
            .expect(200)
            .expect((res) => {
                const top = res.body.topProducts;

                // Harus ada array
                expect(Array.isArray(top)).toBe(true);
                expect(top.length).toBeGreaterThan(0);

                expect(top[0].name).toBe('Produk Analitik');

                expect(top[0].sold).toBe(4);
                expect(Number(top[0].revenue)).toBe(400000);
            });
    });

    // POINT 4: Inventory Alerts
    it('4. Cek Inventory Alerts (Stok Menipis)', async () => {
        await prisma.product.create({
            data: {
                name: 'Produk Sekarat', description: 'x', price: 1000, stock: 3,
                category: 'x', sku: 'LOW-001', userId: sellerId,
                variants: { Warna: ['Hitam'] } 
            }
        });

        return request(app.getHttpServer())
            .get('/dashboard/seller')
            .set('Authorization', `Bearer ${tokenSeller}`)
            .expect(200)
            .expect((res) => {
                const lowStock = res.body.lowStockProducts;
                const names = lowStock.map((p: any) => p.name);

                expect(names).toContain('Produk Sekarat');
                expect(names).not.toContain('Produk Analitik');
            });
    });

    // POINT 5: Order Status Breakdown
    it('5. Cek Order Status Breakdown', async () => {
        return request(app.getHttpServer())
            .get('/dashboard/seller')
            .set('Authorization', `Bearer ${tokenSeller}`)
            .expect(200)
            .expect((res) => {
                const status = res.body.statusBreakdown;

                // Sesuai data seeding awal
                expect(status.PENDING).toBe(1);
                expect(status.SHIPPED).toBe(1);
                expect(status.DELIVERED).toBe(1);

                // Pastikan angka valid (tidak undefined)
                expect(typeof status.PROCESSING).toBe('number');
            });
    });

    // POINT 5: Weekly Sales Report Email Trigger
    it('6. Trigger Weekly Sales Report (Email Mingguan)', async () => {
        await expect(tasksService.handleWeeklyReport()).resolves.not.toThrow();
    }, 30000);
});