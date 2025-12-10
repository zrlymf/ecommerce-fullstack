import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Ambil Data Profil Sendiri
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        storeName: true, 
        storeLocation: true 
      }
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  // Update Profil
  async updateProfile(userId: number, dto: UpdateUserDto) {
    const dataToUpdate: any = { ...dto };

    // 1. Jika password diisi, hash dulu
    if (dto.password) {
      dataToUpdate.password = await bcrypt.hash(dto.password, 10);
    } else {
      delete dataToUpdate.password; 
    }

    // 2. Bersihkan field undefined agar tidak menimpa data lama dengan null
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

    // 3. Update ke Database
    return this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: { id: true, name: true, email: true, role: true, storeName: true, storeLocation: true }
    });
  }
}