import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email wajib diisi' })
  @IsEmail({}, { message: 'Format email salah' })
  email: string;

  @IsNotEmpty({ message: 'Password wajib diisi' })
  @IsString()
  password: string;
}