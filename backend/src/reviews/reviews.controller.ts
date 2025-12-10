import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // POST /reviews -> Kirim Review 
  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(req.user.userId, createReviewDto);
  }

  // GET /reviews/product/:id -> Lihat Review Produk 
  @Get('product/:productId')
  findAll(@Param('productId') productId: string) {
    return this.reviewsService.findAllByProduct(+productId);
  }
}