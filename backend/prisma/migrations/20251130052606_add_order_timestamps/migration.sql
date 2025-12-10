-- AlterTable
ALTER TABLE `orders` ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `deliveredAt` DATETIME(3) NULL,
    ADD COLUMN `processedAt` DATETIME(3) NULL,
    ADD COLUMN `shippedAt` DATETIME(3) NULL;
