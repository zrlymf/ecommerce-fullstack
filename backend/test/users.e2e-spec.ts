import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service'; // <--- JANGAN LUPA IMPORT INI
import * as bcrypt from 'bcrypt';

describe('Users E2E (Profile Management)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: number;
  
  const uniqueEmail = `user_profile_${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(EmailService)
    .useValue({
        sendWelcomeEmail: jest.fn(),
        // Mock fungsi lain jika dipanggil
        sendOrderConfirmation: jest.fn(),
        sendNewOrderAlert: jest.fn(),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // 1. BERSIHKAN DB 
    try {
        await prisma.review.deleteMany();
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.cartItem.deleteMany();
        await prisma.cart.deleteMany();
        await prisma.product.deleteMany();
        await prisma.user.deleteMany();
    } catch (e) {
        console.log("Cleanup warning: Sisa data test lain mungkin masih ada, tapi aman karena kita pakai email unik.");
    }

    // 2. Buat User Dummy dengan Email Unik
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        name: 'User Awal',
        email: uniqueEmail, 
        password: passwordHash,
        role: 'SELLER',
        storeName: 'Toko Lama',
        storeLocation: 'Jakarta'
      }
    });
    userId = user.id;

    // 3. Login
    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: uniqueEmail, 
      password: 'password123'
    });
    token = loginRes.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // TEST CASES

  it('1. GET /users/profile - Sukses Ambil Data Diri', async () => {
    return request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe(uniqueEmail); 
        expect(res.body.name).toBe('User Awal');
        expect(res.body.password).toBeUndefined();
      });
  });

  it('2. PATCH /users/profile - Sukses Ganti Nama & Toko', async () => {
    return request(app.getHttpServer())
      .patch('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Sultan Baru',
        storeName: 'Toko Sultan',
        storeLocation: 'Surabaya'
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe('Sultan Baru');
        expect(res.body.storeName).toBe('Toko Sultan');
        expect(res.body.storeLocation).toBe('Surabaya');
      });
  });

  it('3. PATCH /users/profile - Sukses Ganti Password', async () => {
    // 1. Ganti Password
    await request(app.getHttpServer())
      .patch('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'newpassword456' })
      .expect(200);

    // 2. Coba Login pakai password LAMA (Harus Gagal)
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: uniqueEmail, password: 'password123' })
      .expect(401);

    // 3. Coba Login pakai password BARU (Harus Sukses)
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: uniqueEmail, password: 'newpassword456' })
      .expect(200);
  });
});