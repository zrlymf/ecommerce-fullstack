import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';

describe('Orders E2E (Checkout, Split Order, Isolation, Status, History, Email)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let tokenCustomer: string;
    let tokenSellerA: string;
    let tokenSellerB: string;

    let productA_Id: number;
    let productB_Id: number;
    let userIdCustomer: number;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
        .overrideProvider(EmailService)
        .useValue({
            sendWelcomeEmail: jest.fn(),
            sendNewOrderAlert: jest.fn(),
            sendOrderConfirmation: jest.fn(),
            sendOrderStatusUpdate: jest.fn(),
            sendLowStockAlert: jest.fn(),
            sendWeeklyReport: jest.fn(),
        })
        .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        prisma = app.get<PrismaService>(PrismaService);
        await app.init();

        // BERSIHKAN DB
        await prisma.review.deleteMany(); 
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.cartItem.deleteMany();
        await prisma.cart.deleteMany();
        await prisma.product.deleteMany();
        await prisma.user.deleteMany();

        // SETUP USER
        await request(app.getHttpServer()).post('/auth/register').send({ name: 'Customer Order', email: 'cust_ord@test.com', password: 'password123' });
        const custRes = await request(app.getHttpServer()).post('/auth/login').send({ email: 'cust_ord@test.com', password: 'password123' });
        tokenCustomer = custRes.body.access_token;
        const user = await prisma.user.findUnique({ where: { email: 'cust_ord@test.com' } });
        userIdCustomer = user!.id;

        // SELLER A 
        await request(app.getHttpServer()).post('/auth/register').send({ name: 'Seller A', email: 'sellerA@test.com', password: 'password123', role: 'SELLER' });
        tokenSellerA = (await request(app.getHttpServer()).post('/auth/login').send({ email: 'sellerA@test.com', password: 'password123' })).body.access_token;
        
        // Upload Produk A (10.000)
        const resA = await request(app.getHttpServer()).post('/products').set('Authorization', `Bearer ${tokenSellerA}`)
            .field('name', 'Sepatu A')
            .field('description', 'x').field('price', 10000).field('stock', 100).field('category', 'x')
            .field('variants', JSON.stringify({ Ukuran: ['40', '41'] })) 
            .attach('files', Buffer.from('fake'), 'test.jpg');
        productA_Id = resA.body.id;

        // SELLER B
        await request(app.getHttpServer()).post('/auth/register').send({ name: 'Seller B', email: 'sellerB@test.com', password: 'password123', role: 'SELLER' });
        tokenSellerB = (await request(app.getHttpServer()).post('/auth/login').send({ email: 'sellerB@test.com', password: 'password123' })).body.access_token;
        
        // Upload Produk B (50.000)
        const resB = await request(app.getHttpServer()).post('/products').set('Authorization', `Bearer ${tokenSellerB}`)
            .field('name', 'Tas B')
            .field('description', 'x').field('price', 50000).field('stock', 100).field('category', 'x')
            .field('variants', JSON.stringify({ Warna: ['Hitam'] })) 
            .attach('files', Buffer.from('fake'), 'test.jpg');
        productB_Id = resB.body.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    // TEST CASES

    it('1. Checkout Split Order (Multi Seller) & Cek Total', async () => {
        // Add to Cart Produk A (Seller A)
        await request(app.getHttpServer()).post('/cart').set('Authorization', `Bearer ${tokenCustomer}`)
            .send({ 
                productId: productA_Id, 
                quantity: 1,
                selectedVariant: { Ukuran: '40' } 
            }).expect(201);
            
        // Add to Cart Produk B (Seller B)
        await request(app.getHttpServer()).post('/cart').set('Authorization', `Bearer ${tokenCustomer}`)
            .send({ 
                productId: productB_Id, 
                quantity: 1,
                selectedVariant: { Warna: 'Hitam' } 
            }).expect(201);

        const cartRes = await request(app.getHttpServer()).get('/cart').set('Authorization', `Bearer ${tokenCustomer}`);
        const cartItemIds = cartRes.body.items.map((i: any) => i.id);

        const orderRes = await request(app.getHttpServer()).post('/orders').set('Authorization', `Bearer ${tokenCustomer}`)
            .send({
                shippingAddress: 'Jl. Mawar No 1, Surabaya',
                cartItemIds: cartItemIds,
                shippingCost: 0,
                paymentMethod: 'COD'
            })
            .expect(201);

        const orders = orderRes.body;
        
        expect(Array.isArray(orders)).toBe(true);
        expect(orders.length).toBe(2);

        const totalPrices = orders.map((o: any) => Number(o.totalPrice));
        expect(totalPrices).toContain(10000);
        expect(totalPrices).toContain(50000);

        orders.forEach((o: any) => {
            expect(o.status).toBe('PENDING');
            expect(o.orderNumber).toBeDefined();
        });
    });

    it('2. Seller A Melihat Pesanan (Isolasi Data)', async () => {
        await request(app.getHttpServer()).get('/orders/manage').set('Authorization', `Bearer ${tokenSellerA}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.length).toBeGreaterThanOrEqual(1);
                
                const myOrder = res.body[0];
                expect(myOrder.items[0].product.name).toBe('Sepatu A');
                const hasProductB = res.body.some((o: any) => o.items.some((i: any) => i.product.name === 'Tas B'));
                expect(hasProductB).toBe(false);
            });
    });

    it('3. Update Status & Cek Timestamp', async () => {
        // Ambil order milik Seller A
        const listRes = await request(app.getHttpServer()).get('/orders/manage').set('Authorization', `Bearer ${tokenSellerA}`);
        const orderId = listRes.body[0].id;

        await request(app.getHttpServer()).patch(`/orders/${orderId}/status`)
            .set('Authorization', `Bearer ${tokenSellerA}`)
            .send({ status: 'SHIPPED' })
            .expect(200)
            .expect((res) => {
                expect(res.body.status).toBe('SHIPPED');
                expect(res.body.shippedAt).not.toBeNull();
            });
    });

    it('4. Customer History: Filter Status & Pagination', async () => {
        // Buat dummy order CANCELLED manual
        await prisma.order.create({
            data: { 
                userId: userIdCustomer, 
                orderNumber: `DUMMY-CANCEL-${Date.now()}`, 
                totalPrice: 50000, 
                shippingAddress: 'x', 
                status: 'CANCELLED', 
                paymentMethod: 'TRANSFER' 
            }
        });

        const res = await request(app.getHttpServer())
            .get('/orders/my-orders?status=CANCELLED&page=1')
            .set('Authorization', `Bearer ${tokenCustomer}`)
            .expect(200);

        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].status).toBe('CANCELLED');
        expect(res.body.meta).toBeDefined();
    });

    it('5. Customer History: Filter Tanggal (Date Range)', async () => {
        await prisma.order.create({
            data: {
                userId: userIdCustomer,
                orderNumber: 'OLD-ORDER',
                totalPrice: 10000,
                shippingAddress: 'x',
                status: 'DELIVERED',
                createdAt: new Date('2020-01-01')
            }
        });

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const startDateStr = today.toISOString().split('T')[0];
        const endDateStr = tomorrow.toISOString().split('T')[0];

        const res = await request(app.getHttpServer())
            .get(`/orders/my-orders?startDate=${startDateStr}&endDate=${endDateStr}`)
            .set('Authorization', `Bearer ${tokenCustomer}`)
            .expect(200);

        const orderNumbers = res.body.data.map((o: any) => o.orderNumber);

        expect(orderNumbers).not.toContain('OLD-ORDER'); 
    });

    it('6. Customer Cancel Order (Restock Check)', async () => {
        // Add to Cart baru untuk cancel
        await request(app.getHttpServer()).post('/cart').set('Authorization', `Bearer ${tokenCustomer}`)
            .send({ 
                productId: productA_Id, 
                quantity: 1, 
                selectedVariant: { Ukuran: '41' } 
            });
            
        const cartRes = await request(app.getHttpServer()).get('/cart').set('Authorization', `Bearer ${tokenCustomer}`);
        const cartItemIds = cartRes.body.items.map((i: any) => i.id);

        const orderRes = await request(app.getHttpServer()).post('/orders').set('Authorization', `Bearer ${tokenCustomer}`)
            .send({ shippingAddress: 'x', cartItemIds, paymentMethod: 'COD' });
        
        const orderId = orderRes.body[0].id;

        await request(app.getHttpServer())
            .patch(`/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${tokenCustomer}`)
            .expect(200);

        const checkOrder = await prisma.order.findUnique({ where: { id: orderId } });
        expect(checkOrder?.status).toBe('CANCELLED');

        const productCheck = await prisma.product.findUnique({ where: { id: productA_Id } });
        expect(productCheck?.stock).toBe(99);
    });

    it('7. Create Order Gagal (Data Tidak Lengkap)', async () => {
        return request(app.getHttpServer())
            .post('/orders')
            .set('Authorization', `Bearer ${tokenCustomer}`)
            .send({ cartItemIds: [] })
            .expect(400);
    });

    it('8. Customer Terima Barang (DELIVERED) & Trigger Email', async () => {
        const myOrdersRes = await request(app.getHttpServer())
            .get('/orders/my-orders')
            .set('Authorization', `Bearer ${tokenCustomer}`);

        // Cari order yang statusnya SHIPPED 
        const shippedOrder = myOrdersRes.body.data.find((o: any) => o.status === 'SHIPPED');

        expect(shippedOrder).toBeDefined();
        const orderId = shippedOrder.id;

        await request(app.getHttpServer())
            .patch(`/orders/${orderId}/receive`)
            .set('Authorization', `Bearer ${tokenCustomer}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.status).toBe('DELIVERED');
                expect(res.body.deliveredAt).not.toBeNull();
            });
    });
});