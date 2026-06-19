import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartyOrder } from './entities/party-order.entity';
import { PartyOrdersService } from './party-orders.service';
import { PartyOrdersController } from './party-orders.controller';
import { Flavor } from '../flavors/entities/flavor.entity';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PartyOrder, Flavor, InventoryTransaction])],
  providers: [PartyOrdersService],
  controllers: [PartyOrdersController],
  exports: [PartyOrdersService],
})
export class PartyOrdersModule {}
