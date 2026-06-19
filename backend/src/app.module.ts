import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { PartyOrdersModule } from './modules/party-orders/party-orders.module';
import { PartyOrder } from './modules/party-orders/entities/party-order.entity';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { Expense } from './modules/expenses/entities/expense.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { runStartupMigrations } from './config/runStartupMigrations';

const entities = [
  User,
  RefreshToken,
  Flavor,
  FlavorMonthly,
  Order,
  OrderItem,
  InventoryTransaction,
  Payment,
  PartyOrder,
  Expense,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 10,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const synchronize =
          configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true';
        const databaseUrl = configService.get<string>('DATABASE_URL');

        const buildConfig = () => {
          if (databaseUrl) {
            return {
              type: 'postgres' as const,
              url: databaseUrl,
              ssl:
                configService.get<string>('DB_SSL', 'true') === 'true'
                  ? { rejectUnauthorized: false }
                  : false,
              entities,
              synchronize,
            };
          }

          return {
            type: 'postgres' as const,
            host: configService.get<string>('DB_HOST'),
            port: Number(configService.get('DB_PORT') ?? 5432),
            username: configService.get<string>('DB_USERNAME'),
            password: configService.get<string>('DB_PASSWORD'),
            database: configService.get<string>('DB_NAME'),
            entities,
            synchronize,
          };
        };

        const config = buildConfig();

        try {
          await runStartupMigrations(config);
        } catch (error) {
          console.error('Startup migration failed:', error);
          throw error;
        }

        return config;
      },
    }),
    AuthModule,
    UsersModule,
    FlavorsModule,
    OrdersModule,
    InventoryModule,
    PaymentsModule,
    PartyOrdersModule,
    ExpensesModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
