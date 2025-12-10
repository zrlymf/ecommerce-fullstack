import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // Buat Review Baru
  async create(userId: number, dto: CreateReviewDto) {
    // 1. Cek apakah user pernah beli produk ini dan statusnya DELIVERED
    const hasPurchased = await this.prisma.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: {
          userId: userId,
          status: 'DELIVERED' 
        }
      }
    });

    if (!hasPurchased) {
      throw new BadRequestException('Anda belum membeli produk ini atau pesanan belum selesai.');
    }

    // 2. Cek apakah sudah pernah review (Mencegah spam review berkali-kali)
    const existingReview = await this.prisma.review.findFirst({
      where: { userId, productId: dto.productId }
    });

    if (existingReview) {
      throw new BadRequestException('Anda sudah mengulas produk ini.');
    }

    // 3. Simpan Review
    return this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        comment: dto.comment
      }
    });
  }

  // Ambil semua review untuk satu produk
  async findAllByProduct(productId: number) {
    return this.prisma.review.findMany({
      where: { productId },
      include: { 
        user: { select: { name: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}