import { IsInt, IsNotEmpty, Min, IsOptional } from 'class-validator';

export class CreateCartDto {
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  selectedVariant?: any;
}