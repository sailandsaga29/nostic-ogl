import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartyOrder } from './entities/party-order.entity';
import { PartyOrdersService } from './party-orders.service';
import { PartyOrdersController } from './party-orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PartyOrder])],
  providers: [PartyOrdersService],
  controllers: [PartyOrdersController],
  exports: [PartyOrdersService],
})
export class PartyOrdersModule {}
