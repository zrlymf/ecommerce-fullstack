import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service'; 
import * as bcrypt from 'bcrypt';

describe('Reviews E2E (Product Rating & Comment)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenCustomer: string;
  let productId: number;
  let customerId: number;

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

    // 1. Bersihkan DB 
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // 2. Setup Customer 
    const passwordHash = await bcrypt.hash('password123', 10);
    const customer = await prisma.user.create({
      data: { name: 'Reviewer', email: 'reviewer@test.com', password: passwordHash, role: 'CUSTOMER' }
    });
    customerId = customer.id;

    // Login Customer
    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'reviewer@test.com', password: 'password123'
    });
    tokenCustomer = loginRes.body.access_token;
    
    // 3. Setup Product 
    const seller = await prisma.user.create({ data: { name: 'Seller', email: 'seller@test.com', password: passwordHash, role: 'SELLER' } });
    
    const product = await prisma.product.create({
        data: { 
            name: 'Barang Bagus', 
            description: 'Deskripsi barang untuk testing review', 
            price: 1000, 
            stock: 10, 
            category: 'Test', 
            sku: 'REV-001', 
            userId: seller.id, 
            imageUrl: 'test.jpg',
            variants: { Warna: ['Merah'] } 
        }
    });
    productId = product.id;

    // 4. MOCK PEMBELIAN SUDAH 'DELIVERED'
    await prisma.order.create({
        data: {
            userId: customerId,
            orderNumber: 'DEL-E2E-1',
            totalPrice: 1000,
            shippingAddress: 'Rumah Reviewer',
            status: 'DELIVERED',
            deliveredAt: new Date(),
            items: {
                create: { 
                    productId: productId, 
                    quantity: 1, 
                    price: 1000,
                    selectedVariant: { Warna: 'Merah' }
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

  it('1. POST /reviews - Sukses memberi ulasan (Karena sudah beli)', async () => {
    return request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${tokenCustomer}`)
      .send({
        productId: productId,
        rating: 5,
        comment: 'Produk sangat mantap, pengiriman cepat!'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.rating).toBe(5);
        expect(res.body.comment).toContain('mantap');
        expect(res.body.userId).toBe(customerId);
      });
  });

  it('2. POST /reviews - Gagal review dua kali (Duplicate)', async () => {
    return request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${tokenCustomer}`)
      .send({
        productId: productId,
        rating: 1,
        comment: 'Spam review'
      })
      .expect(400);
  });

  it('3. GET /reviews/product/:id - Sukses melihat ulasan publik', async () => {
    return request(app.getHttpServer())
      .get(`/reviews/product/${productId}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        expect(res.body[0].user.name).toBe('Reviewer');
        expect(res.body[0].rating).toBe(5);
      });
  });
});