import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service'; // <--- 1. IMPORT INI

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService // <--- 2. INJECT DI SINI
  ) {}

  private transformProduct(product: any) {
    return {
      ...product,
      price: Number(product.price),
    };
  }

  async create(createProductDto: any, userId: number, imagePath: string) {
    const sku = `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const product = await this.prisma.product.create({
      data: {
        ...createProductDto, 
        sku: sku,
        userId: userId,
        imageUrl: imagePath,
        stock: Number(createProductDto.stock),
        price: Number(createProductDto.price),
      },
    });
    
    return this.transformProduct(product);
  }

  async findAll(query: any) {
    // ... (Kode findAll tidak perlu diubah, biarkan seperti yang lama)
    const { 
      search, category, page = 1, limit = 10, sellerId, 
      minPrice, maxPrice, availability, sort 
    } = query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category) where.category = category;
    if (sellerId) where.userId = Number(sellerId);

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    if (availability === 'in-stock') {
      where.stock = { gt: 0 };
    } else if (availability === 'out-of-stock') {
      where.stock = 0;
    }

    let orderBy: any = [{ stock: 'desc' }, { createdAt: 'desc' }]; 
    if (sort === 'newest') orderBy = { createdAt: 'desc' }; 
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: Number(limit),
        skip: skip,
        include: { user: { select: { name: true, email: true, storeName: true, storeLocation: true } } },
        orderBy: orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    const transformedData = data.map(item => this.transformProduct(item));

    return {
      data: transformedData,
      meta: {
        total,
        page: Number(page),
        last_page: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(id: number) {
     // ... (Kode findOne biarkan saja)
    const product = await this.prisma.product.findUnique({ 
      where: { id },
      include: { 
        user: {
          select: { id: true, name: true, email: true, role: true, storeName: true, storeLocation: true }
        } 
      }
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
    }
    return this.transformProduct(product);
  }

  // --- PERBAIKAN DI SINI ---
  async update(id: number, updateProductDto: any, userId: number) {
    const existingProduct = await this.prisma.product.findUnique({ where: { id } });
    if (!existingProduct) throw new NotFoundException('Produk tidak ditemukan');

    if (existingProduct.userId !== userId) {
      throw new ForbiddenException('Anda tidak berhak mengedit produk ini!');
    }
    
    const dataToUpdate = { ...updateProductDto };

    if (dataToUpdate.price !== undefined) {
        const price = Number(dataToUpdate.price);
        if (isNaN(price) || price < 0) throw new BadRequestException('Harga harus angka valid');
        dataToUpdate.price = price;
    }

    if (dataToUpdate.stock !== undefined) {
        const stock = Number(dataToUpdate.stock);
        if (isNaN(stock) || stock < 0) throw new BadRequestException('Stok harus angka valid');
        dataToUpdate.stock = stock;
    }

    // 3. Update & Include User (Biar bisa kirim email)
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: { user: true } // <--- PENTING
    });

    // 4. Trigger Email Jika Stok < 10 (Manual Update)
    if (updatedProduct.stock <= 10 && updatedProduct.stock >= 0) {
       this.emailService.sendLowStockAlert(
         updatedProduct.user.email,
         updatedProduct.user.name,
         updatedProduct.name,
         updatedProduct.stock
       );
    }

    return this.transformProduct(updatedProduct);
  }

  async remove(id: number, userId: number) {
    // ... (Kode remove biarkan saja)
    const existingProduct = await this.prisma.product.findUnique({ where: { id } });
    if (!existingProduct) throw new NotFoundException('Produk tidak ditemukan');

    if (existingProduct.userId !== userId) {
      throw new ForbiddenException('Anda tidak berhak menghapus produk ini!');
    }

    const deletedProduct = await this.prisma.product.delete({
      where: { id },
    });
    
    return this.transformProduct(deletedProduct);
  }
}