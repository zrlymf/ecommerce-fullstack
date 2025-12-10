import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  price: any;

  @IsNotEmpty()
  stock: any;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsOptional()
  specifications?: any;

  @IsOptional()
  variants?: any;
}