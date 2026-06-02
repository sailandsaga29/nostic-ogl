import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flavor } from './entities/flavor.entity';
import { FlavorsService } from './flavors.service';
import { FlavorsController } from './flavors.controller';
import { FlavorMonthly } from './entities/flavor-monthly.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Flavor, FlavorMonthly, Order, OrderItem])],
  providers: [FlavorsService],
  controllers: [FlavorsController],
  exports: [FlavorsService],
})
export class FlavorsModule {}
