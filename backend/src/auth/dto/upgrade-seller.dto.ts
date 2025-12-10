import { IsNotEmpty, IsString } from 'class-validator';

export class UpgradeSellerDto {
  @IsNotEmpty()
  @IsString()
  storeName: string;

  @IsNotEmpty()
  @IsString()
  storeLocation: string;
}