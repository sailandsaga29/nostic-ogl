import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { FlavorsModule } from './modules/flavors/flavors.module';
import { Flavor } from './modules/flavors/entities/flavor.entity';
import { FlavorMonthly } from './modules/flavors/entities/flavor-monthly.entity';
import { OrdersModule } from './modules/orders/orders.module';
import { Order } from './modules/orders/entities/order.entity';
import { OrderItem } from './modules/orders/entities/order-item.entity';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InventoryTransaction } from './modules/inventory/entities/inventory-transaction.entity';
import { PaymentsModule } from './modules/payments/payments.module';
import { Payment } from './modules/payments/entities/payment.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [User, Flavor, FlavorMonthly, Order, OrderItem, InventoryTransaction, Payment],
        synchronize: true, // Set to false in production!
      }),
    }),
    AuthModule,
    UsersModule,
    FlavorsModule,
    OrdersModule,
    InventoryModule,
    PaymentsModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
