import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        // 1. Mock PrismaService 
        {
          provide: PrismaService,
          useValue: {
            order: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            product: {
              update: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((cb) => cb({
                cartItem: { findMany: jest.fn(), deleteMany: jest.fn() },
                order: { create: jest.fn(), update: jest.fn() },
                orderItem: { create: jest.fn() },
                product: { update: jest.fn() }
            })), 
          },
        },
        // 2. Mock EmailService
        {
          provide: EmailService,
          useValue: {
            sendOrderConfirmation: jest.fn(),
            sendNewOrderAlert: jest.fn(),
            sendLowStockAlert: jest.fn(),
            sendOrderStatusUpdate: jest.fn(),
            sendWeeklyReport: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});