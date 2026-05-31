import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { Flavor } from '../flavors/entities/flavor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryTransaction, Flavor])],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
