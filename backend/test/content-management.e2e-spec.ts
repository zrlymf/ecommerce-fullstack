import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';
import { join } from 'path';
import * as fs from 'fs';

describe('Phase 9: User Content Management', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let tokenSeller: string;
    let tokenCustomer: string;
    let productId: number;
    let orderId: number;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
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
        await app.init();

        // 1. BERSIHKAN DB
        await prisma.review.deleteMany();
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.cartItem.deleteMany();
        await prisma.cart.deleteMany();
        await prisma.product.deleteMany();
        await prisma.user.deleteMany();

        // 2. SETUP USER 
        // Seller
        await request(app.getHttpServer()).post('/auth/register').send({ name: 'Seller Content', email: 'seller_content@test.com', password: 'password123', role: 'SELLER' });
        const loginSeller = await request(app.getHttpServer()).post('/auth/login').send({ email: 'seller_content@test.com', password: 'password123' });
        tokenSeller = loginSeller.body.access_token;

        // Customer
        await request(app.getHttpServer()).post('/auth/register').send({ name: 'Customer Content', email: 'cust_content@test.com', password: 'password123' });
        const loginCust = await request(app.getHttpServer()).post('/auth/login').send({ email: 'cust_content@test.com', password: 'password123' });
        tokenCustomer = loginCust.body.access_token;
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    // Seller membuat produk baru
    it('1. Seller Create Product (Persiapan)', async () => {
        const imagePath = join(__dirname, 'test-image.jpg');
        if (!fs.existsSync(imagePath)) fs.writeFileSync(imagePath, 'img');

        const res = await request(app.getHttpServer())
            .post('/products')
            .set('Authorization', `Bearer ${tokenSeller}`)
            .field('name', 'Barang Awal')
            .field('description', 'Deskripsi Awal')
            .field('price', 50000)
            .field('stock', 10)
            .field('category', 'Umum')
            // Tambahkan Varian
            .field('variants', JSON.stringify({ Warna: ['Putih'] }))
            .attach('files', imagePath)
            .expect(201);

        productId = res.body.id;
        expect(res.body.name).toBe('Barang Awal');
    });

    // Seller mengedit produk yang sudah dibuat
    it('2. Seller Edit Product (UPDATE)', async () => {
        // Seller mengubah nama dan harga produk
        return request(app.getHttpServer())
            .patch(`/products/${productId}`)
            .set('Authorization', `Bearer ${tokenSeller}`)
            .send({
                name: 'Barang Revisi',
                price: 75000
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.name).toBe('Barang Revisi'); 
                expect(Number(res.body.price)).toBe(75000); 
                expect(res.body.stock).toBe(10); 
            });
    });

    // Customer membuat order terlebih dahulu
    it('3. Customer Create Order (Persiapan)', async () => {
        // Masukkan keranjang (Dengan Varian)
        await request(app.getHttpServer())
            .post('/cart')
            .set('Authorization', `Bearer ${tokenCustomer}`)
            .send({ 
                productId, 
                quantity: 1,
                selectedVariant: { Warna: 'Putih' } 
            });

        // Ambil ID Item Keranjang
        const cartRes = await request(app.getHttpServer()).get('/cart').set('Authorization', `Bearer ${tokenCustomer}`);
        const cartItemIds = cartRes.body.items.map((i: any) => i.id);

        // Checkout
        const orderRes = await request(app.getHttpServer())
            .post('/orders')
            .set('Authorization', `Bearer ${tokenCustomer}`)
            .send({ shippingAddress: 'Alamat', cartItemIds, paymentMethod: 'COD' })
            .expect(201);

        const createdOrders = orderRes.body;
        
        // Pastikan response berupa Array (karena fitur Split Order)
        expect(Array.isArray(createdOrders)).toBe(true);
        expect(createdOrders.length).toBeGreaterThanOrEqual(1);

        // Ambil order pertama dari array
        const firstOrder = createdOrders[0];
        orderId = firstOrder.id; 
        
        expect(firstOrder.status).toBe('PENDING');
    });

    // Customer membatalkan order yang masih PENDING
    it('4. Customer Cancel Pending Order (DELETE/UPDATE)', async () => {
        await request(app.getHttpServer())
            .patch(`/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${tokenCustomer}`)
            .expect(200);

        // Verifikasi Status Berubah
        const checkOrder = await prisma.order.findUnique({ where: { id: orderId } });
        expect(checkOrder?.status).toBe('CANCELLED');
    });

    // Pastikan produk yang dihapus tidak bisa diakses lagi
    it('5. Seller Delete Product (DELETE)', async () => {
        const imagePath = join(__dirname, 'test-image.jpg');
        if (!fs.existsSync(imagePath)) fs.writeFileSync(imagePath, 'img');

        const createRes = await request(app.getHttpServer())
            .post('/products')
            .set('Authorization', `Bearer ${tokenSeller}`)
            .field('name', 'Produk Salah Upload')
            .field('description', 'Mau dihapus')
            .field('price', 1000)
            .field('stock', 1)
            .field('category', 'Sampah')
            .field('variants', JSON.stringify({ Warna: ['Hitam'] }))
            .attach('files', imagePath)
            .expect(201);

        const productToDeleteId = createRes.body.id;

        // Lakukan Penghapusan
        await request(app.getHttpServer())
            .delete(`/products/${productToDeleteId}`)
            .set('Authorization', `Bearer ${tokenSeller}`)
            .expect(200);

        // Verifikasi Produk Terhapus
        await request(app.getHttpServer())
            .get(`/products/${productToDeleteId}`)
            .expect(404); // Not Found
    });

    it('6. Customer Gagal Cancel Order yang Sudah Dikirim (Logic Check)', async () => {
        // 1. Buat Order Baru Manual via Prisma
        const shippedOrder = await prisma.order.create({
            data: {
                orderNumber: 'ORD-SHIPPED-TEST',
                userId: (await prisma.user.findFirst({ where: { email: 'cust_content@test.com' } }))!.id,
                totalPrice: 50000,
                status: 'SHIPPED',
                shippingAddress: 'x'
            }
        });

        // 2. Customer mencoba cancel order yang SHIPPEP
        await request(app.getHttpServer())
            .patch(`/orders/${shippedOrder.id}/cancel`)
            .set('Authorization', `Bearer ${tokenCustomer}`)
            .expect(400); // Bad Request 
    });
});