import { IsNotEmpty, IsString, IsArray, IsNumber, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  shippingAddress: string;

  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @IsArray()
  @IsNumber({}, { each: true })
  cartItemIds: number[];

  @IsOptional() 
  @IsNumber()
  shippingCost?: number;
}