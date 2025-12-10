import {
  Controller, Post, Body, UseGuards, UseInterceptors, UploadedFiles,
  Request, Get, Param, Patch, Delete, Query,
  BadRequestException, PayloadTooLargeException
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  @UseInterceptors(FilesInterceptor('files', 5, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `product-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  create(
    @Body() createProductDto: CreateProductDto,
    @Request() req,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {

    // 1. Validasi File
    if (!files || files.length === 0) {
      throw new BadRequestException('Minimal upload 1 gambar!');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB

    files.forEach(file => {
      if (file.size > maxSize) {
        throw new PayloadTooLargeException(`File ${file.originalname} terlalu besar!`);
      }
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException(`File ${file.originalname} bukan gambar!`);
      }
    });

    // 2. Siapkan Data URL Gambar & User ID
    const imageUrls = files.map(file => `/uploads/${file.filename}`).join(',');
    const userId = req.user['userId'];

    // 3. Mengubah String dari FormData kembali ke JSON Object
    let finalVariants = {}; 
    let finalSpecs = {};

    // Parsing Varian
    if (createProductDto.variants) {
      if (typeof createProductDto.variants === 'string') {
        try {
          finalVariants = JSON.parse(createProductDto.variants);
        } catch (e) {
          console.error("Gagal parse variants:", e);
          finalVariants = {}; 
        }
      } else {
        finalVariants = createProductDto.variants;
      }
    }

    // Parsing Spesifikasi
    if (createProductDto.specifications) {
      if (typeof createProductDto.specifications === 'string') {
        try {
          finalSpecs = JSON.parse(createProductDto.specifications);
        } catch (e) {
          console.error("Gagal parse specifications:", e);
          finalSpecs = {};
        }
      } else {
        finalSpecs = createProductDto.specifications;
      }
    }

    // 4. Bungkus ulang data yang sudah bersih
    const cleanedData = {
      ...createProductDto,
      price: Number(createProductDto.price),
      stock: Number(createProductDto.stock),
      variants: finalVariants,       
      specifications: finalSpecs     
    };

    // 5. Panggil Service dengan data yang sudah bersih
    return this.productsService.create(cleanedData, userId, imageUrls);
  }

  // lihat semua produk
  @Get()
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  // lihat satu produk
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  // update produk
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req
  ) {
    const userId = req.user['userId'];
    return this.productsService.update(+id, updateProductDto, userId);
  }

  // hapus produk
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user['userId'];
    return this.productsService.remove(+id, userId);
  }
}