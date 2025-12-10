import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service'; 

describe('Inventory Management E2E (Fase 8)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let tokenSeller: string;
    let sellerId: number;
    let productId: number;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
        .overrideProvider(EmailService)
        .useValue({
            sendWelcomeEmail: jest.fn(),
            sendLowStockAlert: jest.fn(), // Dipanggil saat stok < 10
            sendNewOrderAlert: jest.fn(),
            sendOrderConfirmation: jest.fn(),
            sendOrderStatusUpdate: jest.fn(),
            sendWeeklyReport: jest.fn(),
        })
        .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        prisma = app.get<PrismaService>(PrismaService);
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
            name: 'Inventory Seller', email: 'inv_seller@test.com', password: 'password123', role: 'SELLER'
        });
        const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
            email: 'inv_seller@test.com', password: 'password123'
        });
        tokenSeller = loginRes.body.access_token;

        // Ambil ID Seller
        const seller = await prisma.user.findUnique({ where: { email: 'inv_seller@test.com' } });
        sellerId = seller!.id;

        // 3. SETUP PRODUK AWAL (Stok 50)
        const product = await prisma.product.create({
            data: {
                name: 'Produk Inventaris', description: 'Cek Stok', price: 100000,
                stock: 50,
                category: 'Test', sku: 'INV-001', userId: sellerId, imageUrl: 'test.jpg',
                variants: { Warna: ['Putih'] }
            }
        });
        productId = product.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    it('1. Update Stock Quantities (Restock)', async () => {
        // Seller menambah stok dari 50 menjadi 100
        return request(app.getHttpServer())
            .patch(`/products/${productId}`)
            .set('Authorization', `Bearer ${tokenSeller}`)
            .send({ stock: 100 })
            .expect(200)
            .expect((res) => {
                expect(res.body.stock).toBe(100);
                // Pastikan data lain tidak berubah
                expect(res.body.name).toBe('Produk Inventaris');
            });
    });

    it('2. Mark Products as Out of Stock', async () => {
        // Seller menekan tombol "Habiskan" (Set stok 0)
        return request(app.getHttpServer())
            .patch(`/products/${productId}`)
            .set('Authorization', `Bearer ${tokenSeller}`)
            .send({ stock: 0 })
            .expect(200)
            .expect((res) => {
                expect(res.body.stock).toBe(0);
            });
    });

    it('3. Receive Alerts When Stock is Low (Integration Test)', async () => {

        // Set Stok 5 -> Seharusnya men-trigger sendLowStockAlert (Mocked)
        await request(app.getHttpServer())
            .patch(`/products/${productId}`)
            .set('Authorization', `Bearer ${tokenSeller}`)
            .send({ stock: 5 })
            .expect(200);

        // Cek Dashboard
        return request(app.getHttpServer())
            .get('/dashboard/seller')
            .set('Authorization', `Bearer ${tokenSeller}`)
            .expect(200)
            .expect((res) => {
                const lowStockList = res.body.lowStockProducts;

                // Pastikan list ada isinya
                expect(Array.isArray(lowStockList)).toBe(true);
                expect(lowStockList.length).toBeGreaterThan(0);

                const myProduct = lowStockList.find((p: any) => p.id === productId);
                expect(myProduct).toBeDefined();
                expect(myProduct.name).toBe('Produk Inventaris');
                expect(myProduct.stock).toBe(5);
            });
    });

    it('4. Alert Hilang Jika Stok Aman', async () => {

        // Restock jadi 20
        await request(app.getHttpServer())
            .patch(`/products/${productId}`)
            .set('Authorization', `Bearer ${tokenSeller}`)
            .send({ stock: 20 })
            .expect(200);

        // Cek Dashboard lagi
        return request(app.getHttpServer())
            .get('/dashboard/seller')
            .set('Authorization', `Bearer ${tokenSeller}`)
            .expect(200)
            .expect((res) => {
                const lowStockList = res.body.lowStockProducts;
                const myProduct = lowStockList.find((p: any) => p.id === productId);
                expect(myProduct).toBeUndefined();
            });
    });

    // Update entity as non-owner 
    it('5. Gagal Update Stok Punya Orang Lain (403)', async () => {
        // 1. Buat Email Unik
        const uniqueEmail = `maling_${Date.now()}@test.com`;

        // 2. Register Seller Maling 
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'Maling',
                email: uniqueEmail,
                password: 'password123' 
            })
            .expect(201); 

        // 3. Login Seller Maling
        const loginMaling = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: uniqueEmail,
                password: 'password123'
            })
            .expect(200); 

        const tokenMaling = loginMaling.body.access_token;

        // 4. Coba update produk milik Seller Asli (productId)
        return request(app.getHttpServer())
            .patch(`/products/${productId}`)
            .set('Authorization', `Bearer ${tokenMaling}`)
            .send({ stock: 0 })
            .expect(403); // Harusnya Forbidden
    });

    // Get/Update entity by ID that doesn’t exist
    it('6. Gagal Update Produk Tidak Ada (404)', async () => {
        return request(app.getHttpServer())
            .patch(`/products/999999`) // ID asal
            .set('Authorization', `Bearer ${tokenSeller}`)
            .send({ stock: 10 })
            .expect(404); // Expect Not Found
    });

    // Invalid Input (Stok Negatif) 
    it('7. Gagal Update Stok Negatif (Logic Check)', async () => {
        return request(app.getHttpServer())
            .patch(`/products/${productId}`)
            .set('Authorization', `Bearer ${tokenSeller}`)
            .send({ stock: "Banyak Banget" }) 
            .expect(400); // Expect Bad Request
    });
});