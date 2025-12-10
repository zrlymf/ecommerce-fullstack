import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';
import { join } from 'path';
import * as fs from 'fs';

describe('E-Commerce E2E (Auth & Products)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Mock EmailService
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
  });

  beforeEach(async () => {
    // URUTAN PEMBERSIHAN DATABASE 
    await prisma.review.deleteMany(); 
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany(); 
    await prisma.user.deleteMany();    
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // 1. AUTHENTICATION FLOW 
  describe('1. Authentication Flow', () => {
    it('/auth/register (POST) - Sukses', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
        });
    });

    it('/auth/login (POST) - Sukses & Simpan Token', async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Seller User',
        email: 'seller@example.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'seller@example.com',
          password: 'password123',
        })
        .expect(200);

      accessToken = response.body.access_token;
    });

    it('/auth/login (POST) - Gagal Password Salah', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'ngawur@example.com',
          password: 'salah',
        })
        .expect(401);
    });

    // Refresh Token
    it('/auth/refresh (POST) - Sukses Perpanjang Sesi', async () => {
      // Buat user & login
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Refresh User',
        email: 'refresh@test.com',
        password: 'password123',
      });
      const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'refresh@test.com',
        password: 'password123',
      });

      const refreshToken = loginRes.body.refresh_token;
      const user = await prisma.user.findUnique({ where: { email: 'refresh@test.com' } });

      // Coba refresh
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          userId: user!.id,
          refreshToken: refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token'); 
        });
    });

    // Test RBAC Gagal 
    it('/auth/test-seller (POST) - Gagal sebagai Customer (403)', async () => {
      // Register sebagai Customer Biasa
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Customer Biasa',
        email: 'customer@test.com',
        password: 'password123',
      });

      // Login sebagai user tersebut
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'customer@test.com', password: 'password123' });

      const customerToken = loginRes.body.access_token;

      // Coba akses Endpoint Khusus Seller
      return request(app.getHttpServer())
        .post('/auth/test-seller')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    // RBAC (Seller Only)
    it('/auth/test-seller (POST) - Sukses sebagai Seller', async () => {
      // Buat user
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Seller Asli',
        email: 'sellerasli@test.com',
        password: 'password123',
      });

      // Update jadi SELLER di DB
      await prisma.user.update({
        where: { email: 'sellerasli@test.com' },
        data: { role: 'SELLER' },
      });

      // Login ulang
      const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'sellerasli@test.com',
        password: 'password123',
      });

      const sellerToken = loginRes.body.access_token;

      // Akses Endpoint Seller
      return request(app.getHttpServer())
        .post('/auth/test-seller')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(201);
    });

    // Logout
    it('/auth/logout (POST) - Sukses Logout', async () => {
      // Login 
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Logout User',
        email: 'logout@test.com',
        password: 'password123',
      });
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'logout@test.com',
        password: 'password123',
      });
      const token = res.body.access_token;

      // Logout
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toEqual('Berhasil Logout');
        });
    });

  });

  // 2. PRODUCT MANAGEMENT FLOW 
  describe('2. Product Management Flow', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Seller',
        email: 'seller@test.com',
        password: 'password123',
      });
      await prisma.user.update({
        where: { email: 'seller@test.com' },
        data: { role: 'SELLER' }
      });

      const res = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'seller@test.com',
        password: 'password123',
      });
      accessToken = res.body.access_token;
    });

    it('/products (POST) - Upload Gambar & Varian Sukses', () => {
      const imagePath = join(__dirname, 'test-image.jpg');
      if (!fs.existsSync(imagePath)) fs.writeFileSync(imagePath, 'fake image buffer');

      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', 'Sepatu Keren')
        .field('description', 'Sepatu lari sangat cepat')
        .field('price', 150000)
        .field('stock', 20)
        .field('category', 'Olahraga')
        
        // TEST VARIAN
        .field('variants', JSON.stringify({ Warna: ['Merah', 'Hitam'], Ukuran: ['40', '42'] }))
        .field('specifications', JSON.stringify({ Merk: 'Nike', Bahan: 'Karet' }))
        
        .attach('files', imagePath)
        .expect(201)
        .expect((res) => {
          expect(typeof res.body.price).toBe('number');
          expect(res.body.imageUrl).toContain('product-');
          
          // Verifikasi Varian tersimpan sebagai Object
          expect(res.body.variants).toEqual({ Warna: ['Merah', 'Hitam'], Ukuran: ['40', '42'] });
        });
    });

    it('/products (GET) - Search & Pagination', async () => {
      const imagePath = join(__dirname, 'test-image.jpg');
      if (!fs.existsSync(imagePath)) fs.writeFileSync(imagePath, 'img');

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', 'Baju Renang')
        .field('description', 'Bahan licin')
        .field('price', 50000)
        .field('stock', 5)
        .field('category', 'Olahraga')
        .attach('files', imagePath);

      return request(app.getHttpServer())
        .get('/products?search=Renang&page=1')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toContain('Renang');
        });
    });

    // Test Upload File Bukan Gambar 
    it('/products (POST) - Gagal File Teks (400)', () => {
      const txtPath = join(__dirname, 'test.txt');
      fs.writeFileSync(txtPath, 'Ini bukan gambar');

      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', 'Produk Salah')
        .field('description', 'x')
        .field('price', 100)
        .field('stock', 1)
        .field('category', 'x')
        .attach('files', txtPath)
        .expect(400);
    });

    // Test Upload Tanpa Token (Security Check)
    it('/products (POST) - Gagal Tanpa Token (401)', () => {
      return request(app.getHttpServer())
        .post('/products')
        .expect(401);
    });

    // Tes Update Produk (PATCH)
    it('/products/:id (PATCH) - Update entitas & Varian sebagai pemilik', async () => {
      // Upload produk 
      const imagePath = join(__dirname, 'test-image.jpg');
      if (!fs.existsSync(imagePath)) fs.writeFileSync(imagePath, 'img');

      const createRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', 'Barang Lama')
        .field('description', 'Deskripsi Lama')
        .field('price', 100000)
        .field('stock', 10)
        .field('category', 'Olahraga')
        .attach('files', imagePath)
        .expect(201);

      const productId = createRes.body.id;

      // Lakukan Update 
      return request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          price: 250000,
          stock: 99,
          name: "Barang Baru",
          variants: { Warna: ['Putih'], Size: ['45'] }
        })
        .expect(200)
        .expect((res) => {
          // Verifikasi perubahan
          expect(res.body.price).toEqual(250000);
          expect(res.body.stock).toEqual(99);
          expect(res.body.name).toEqual("Barang Baru");
          
          // Verifikasi varian berubah
          expect(res.body.variants).toEqual({ Warna: ['Putih'], Size: ['45'] });
        });
    });

    // Tes Delete Produk (DELETE)
    it('/products/:id (DELETE) - Hapus entitas sebagai pemilik', async () => {
      // Upload produk 
      const imagePath = join(__dirname, 'test-image.jpg');
      if (!fs.existsSync(imagePath)) fs.writeFileSync(imagePath, 'img');

      const createRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', 'Barang Hapus')
        .field('description', 'Deskripsi')
        .field('price', 50000)
        .field('stock', 5)
        .field('category', 'Olahraga')
        .attach('files', imagePath)
        .expect(201);

      const productId = createRes.body.id;

      // Lakukan Hapus
      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Cek apakah benar-benar hilang
      return request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(404);
    });

    // Test Upload File Kebesaran (>5MB)
    it('/products (POST) - Gagal File > 5MB (413)', () => {
      const largeFile = Buffer.alloc(6 * 1024 * 1024, 'a');
      const largePath = join(__dirname, 'large.jpg');
      fs.writeFileSync(largePath, largeFile);

      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', 'File Besar')
        .field('description', 'x').field('price', 10).field('stock', 1).field('category', 'x')
        .attach('files', largePath) // Pakai 'files'
        .expect(413)
        .then(() => {
          fs.unlinkSync(largePath);
        });
    });

    // Test Data Tidak Lengkap (Missing Fields) 
    it('/products (POST) - Gagal Data Tidak Lengkap (400)', () => {
      const imagePath = join(__dirname, 'test-image.jpg');
      if (!fs.existsSync(imagePath)) fs.writeFileSync(imagePath, 'img');

      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', '')
        .attach('files', imagePath)
        .expect(400);
    });

    // ID Tidak Ada 
    it('/products/:id (GET) - Gagal ID Tidak Ada (404)', () => {
      return request(app.getHttpServer())
        .get('/products/999999')
        .expect(404);
    });

    // Gagal Update Bukan Pemilik 
    it('/products/:id (PATCH) - Gagal Update Bukan Pemilik (403)', async () => {
      // Seller A upload produk 
      const imagePath = join(__dirname, 'test-image.jpg');
      if (!fs.existsSync(imagePath)) fs.writeFileSync(imagePath, 'img');

      const createRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', 'Punya Si A').field('description', 'x').field('price', 1).field('stock', 1).field('category', 'x')
        .attach('files', imagePath)
        .expect(201);

      const productId = createRes.body.id;

      // Buat User B 
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Maling', email: 'maling@test.com', password: 'password123'
      });
      const loginMaling = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'maling@test.com', password: 'password123'
      });
      const tokenMaling = loginMaling.body.access_token;

      // User B mencoba edit produk User A
      return request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${tokenMaling}`)
        .send({ price: 9999999 })
        .expect(403);
    });

    // Get Entity by ID Success
    it('/products/:id (GET) - Sukses Ambil Detail Produk', async () => {
      // 1. Upload dulu biar ada ID-nya
      const imagePath = join(__dirname, 'test-image.jpg');
      if (!fs.existsSync(imagePath)) fs.writeFileSync(imagePath, 'img');

      const createRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', 'Cek ID').field('description', 'x').field('price', 1).field('stock', 1).field('category', 'x')
        .attach('files', imagePath);

      const id = createRes.body.id;

      // 2. Test GET ID
      return request(app.getHttpServer())
        .get(`/products/${id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(id);
          expect(res.body.name).toBe('Cek ID');
        });
    });
  });

  // 3. ADVANCED SEARCH & FILTERING 
  describe('3. Advanced Search & Filtering', () => {
    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Search Seller',
          email: 'searcher@test.com',
          password: 'password123',
          role: 'SELLER'
        }
      });

      await prisma.product.createMany({
        data: [
          { name: 'Produk Murah', description: 'Murah banget', price: 50000, stock: 10, category: 'Elektronik', sku: 'SKU-1', userId: user.id, imageUrl: 'uploads/dummy.jpg' },
          { name: 'Produk Sedang', description: 'Lumayan', price: 100000, stock: 5, category: 'Fashion', sku: 'SKU-2', userId: user.id, imageUrl: 'uploads/dummy.jpg' },
          { name: 'Produk Mahal', description: 'Sultan', price: 200000, stock: 0, category: 'Elektronik', sku: 'SKU-3', userId: user.id, imageUrl: 'uploads/dummy.jpg' }
        ]
      });
    });

    it('GET /products?minPrice=...&maxPrice=... (Filter Harga)', () => {
      return request(app.getHttpServer())
        .get('/products?minPrice=80000&maxPrice=120000')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBe(1);
          expect(res.body.data[0].name).toBe('Produk Sedang');
          expect(res.body.data[0].price).toBe(100000);
        });
    });

    it('GET /products?sort=price_asc (Urut Termurah)', () => {
      return request(app.getHttpServer())
        .get('/products?sort=price_asc')
        .expect(200)
        .expect((res) => {
          const data = res.body.data;
          expect(data.length).toBeGreaterThanOrEqual(3);
          expect(data[0].price).toBe(50000); // Murah
          expect(data[1].price).toBe(100000); // Sedang
          expect(data[2].price).toBe(200000); // Mahal
        });
    });

    it('GET /products?availability=in-stock', () => {
      return request(app.getHttpServer())
        .get('/products?availability=in-stock')
        .expect(200)
        .expect((res) => {
          const names = res.body.data.map((p: any) => p.name);
          expect(names).toContain('Produk Murah');
          expect(names).not.toContain('Produk Mahal'); // Stok 0 harus hilang
        });
    });

    it('GET /products?limit=1&page=2 (Pagination)', () => {
      return request(app.getHttpServer())
        .get('/products?limit=1&page=2&sort=price_desc')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBe(1);
          expect(res.body.meta.page).toBe(2);
          expect(res.body.data[0].name).toBe('Produk Sedang');
        });
    });

    it('GET /products?sellerId=... (Filter Toko Spesifik)', async () => {

      const seller = await prisma.user.findFirst({ where: { email: 'searcher@test.com' } });

      return request(app.getHttpServer())
        .get(`/products?sellerId=${seller!.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          res.body.data.forEach((p: any) => {
            expect(p.userId).toBe(seller!.id);
          });
        });
    });
  });
});