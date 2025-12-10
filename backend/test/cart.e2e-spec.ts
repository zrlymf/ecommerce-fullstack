import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service'; // <--- JANGAN LUPA IMPORT

describe('Cart E2E (Keranjang Belanja dengan Varian)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // Variabel Global untuk Token & ID
  let tokenCustomer: string;
  let productId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(EmailService)
    .useValue({
        sendWelcomeEmail: jest.fn(), 
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
    
    // 1. BERSIHKAN DB (Urutan Aman)
    await prisma.review.deleteMany();    
    await prisma.orderItem.deleteMany(); 
    await prisma.order.deleteMany();     
    await prisma.cartItem.deleteMany();  
    await prisma.cart.deleteMany();      
    await prisma.product.deleteMany();   
    await prisma.user.deleteMany();      

    // 2. SETUP CUSTOMER
    await request(app.getHttpServer()).post('/auth/register').send({ 
      name: 'Cart User', email: 'cart@test.com', password: 'password123' 
    });
    const custLogin = await request(app.getHttpServer()).post('/auth/login').send({ 
      email: 'cart@test.com', password: 'password123' 
    });
    tokenCustomer = custLogin.body.access_token;

    // 3. SETUP SELLER
    await request(app.getHttpServer()).post('/auth/register').send({ 
      name: 'Cart Seller', email: 'seller_cart@test.com', password: 'password123', role: 'SELLER' 
    });
    const sellerLogin = await request(app.getHttpServer()).post('/auth/login').send({ 
      email: 'seller_cart@test.com', password: 'password123' 
    });
    const tokenSeller = sellerLogin.body.access_token;

    // 4. UPLOAD PRODUK DUMMY (DENGAN VARIAN)
    const prodRes = await request(app.getHttpServer()).post('/products')
      .set('Authorization', `Bearer ${tokenSeller}`)
      .field('name', 'Sepatu Lari')
      .field('description', 'Sepatu lari keren')
      .field('price', 100000)
      .field('stock', 100)
      .field('category', 'Olahraga')
      .field('variants', JSON.stringify({ Warna: ['Merah', 'Biru'], Ukuran: ['40', '42'] }))
      .attach('files', Buffer.from('fake_image_content'), 'test.jpg'); 
    
    productId = prodRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect(); 
    await app.close();
  });

  // TEST CASE

  it('1. POST /cart - Sukses Tambah Barang dengan Varian (201)', () => {
    return request(app.getHttpServer())
      .post('/cart')
      .set('Authorization', `Bearer ${tokenCustomer}`) 
      .send({ 
        productId: productId, 
        quantity: 2,
        selectedVariant: { Warna: 'Merah', Ukuran: '40' } 
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.quantity).toBe(2);
        expect(res.body.selectedVariant).toEqual({ Warna: 'Merah', Ukuran: '40' });
      });
  });

  it('2. POST /cart - Tambah Barang Sama TAPI Varian Beda (Harus Buat Baris Baru)', async () => {
    await request(app.getHttpServer())
      .post('/cart')
      .set('Authorization', `Bearer ${tokenCustomer}`) 
      .send({ 
        productId: productId, 
        quantity: 1,
        selectedVariant: { Warna: 'Biru', Ukuran: '42' } 
      })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get('/cart')
      .set('Authorization', `Bearer ${tokenCustomer}`);
    
    expect(res.body.items.length).toBe(2);
  });

  it('3. POST /cart - Tambah Varian Sama (Harusnya Update Quantity)', async () => {
    await request(app.getHttpServer())
      .post('/cart')
      .set('Authorization', `Bearer ${tokenCustomer}`) 
      .send({ 
        productId: productId, 
        quantity: 1,
        selectedVariant: { Warna: 'Merah', Ukuran: '40' } 
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/cart')
      .set('Authorization', `Bearer ${tokenCustomer}`);
    
    const merahItem = res.body.items.find((i: any) => i.selectedVariant.Warna === 'Merah');
    expect(merahItem.quantity).toBe(3); // 2 + 1
    
    expect(res.body.items.length).toBe(2);
  });

  it('4. PATCH /cart/:id - Sukses Update Jumlah Barang (200)', async () => {
    const cartRes = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${tokenCustomer}`);
    
    const itemId = cartRes.body.items.find((i: any) => i.selectedVariant.Warna === 'Merah').id;

    return request(app.getHttpServer())
      .patch(`/cart/${itemId}`)
      .set('Authorization', `Bearer ${tokenCustomer}`)
      .send({ quantity: 10 })
      .expect(200)
      .expect((res) => {
        expect(res.body.quantity).toBe(10);
      });
  });

  it('5. DELETE /cart/:id - Sukses Hapus Barang (200)', async () => {
    const cartRes = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${tokenCustomer}`);
    
    const itemId = cartRes.body.items[0].id;

    await request(app.getHttpServer())
      .delete(`/cart/${itemId}`)
      .set('Authorization', `Bearer ${tokenCustomer}`)
      .expect(200);

    const finalCheck = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${tokenCustomer}`);
    
    expect(finalCheck.body.items.length).toBe(1);
  });

  it('6. POST /cart - Gagal Tambah Produk Tidak Ada (404)', async () => {
    return request(app.getHttpServer())
      .post('/cart')
      .set('Authorization', `Bearer ${tokenCustomer}`)
      .send({ 
          productId: 999999, 
          quantity: 1,
          selectedVariant: {} 
      })
      .expect(404); 
  });

  it('7. POST /cart - Gagal Quantity Tidak Valid (400)', async () => {
    return request(app.getHttpServer())
      .post('/cart')
      .set('Authorization', `Bearer ${tokenCustomer}`)
      .send({ 
          productId: productId,
          quantity: -5,
          selectedVariant: { Warna: 'Merah' }
      })
      .expect(400); 
  });
});