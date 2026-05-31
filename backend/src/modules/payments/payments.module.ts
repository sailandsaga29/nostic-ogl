import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PhonePeService } from './phonepe.service';
import { PhonePeMockStore } from './phonepe-mock.store';
import { PaymentsController } from './payments.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    forwardRef(() => OrdersModule),
  ],
  providers: [PaymentsService, PhonePeService, PhonePeMockStore],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
