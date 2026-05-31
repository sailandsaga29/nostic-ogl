import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Flavor } from '../flavors/entities/flavor.entity';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Flavor, InventoryTransaction])],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
