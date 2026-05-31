import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order, OrderStatus, PaymentMethod } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Flavor } from '../flavors/entities/flavor.entity';
import { InventoryTransaction, InventoryChangeType } from '../inventory/entities/inventory-transaction.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemsRepo: Repository<OrderItem>,
    @InjectRepository(Flavor) private flavorsRepo: Repository<Flavor>,
    @InjectRepository(InventoryTransaction) private invRepo: Repository<InventoryTransaction>,
  ) {}

  async create(orderData: { userId?: string; items: { flavorId: string; quantity: number }[]; note?: string; paymentMethod?: PaymentMethod }) {
    if (!orderData.items || orderData.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const uniqueItems = orderData.items.reduce((acc, item) => {
      const previous = acc.get(item.flavorId);
      acc.set(item.flavorId, {
        flavorId: item.flavorId,
        quantity: previous ? previous.quantity + item.quantity : item.quantity,
      });
      return acc;
    }, new Map<string, { flavorId: string; quantity: number }>());

    const flavorIds = Array.from(uniqueItems.keys());
    const flavors = await this.flavorsRepo.findBy({ id: In(flavorIds) });

    const itemsToSave: OrderItem[] = [];
    let total = 0;

    for (const item of uniqueItems.values()) {
      const f = flavors.find((x) => x.id === item.flavorId);
      if (!f) throw new NotFoundException(`Flavor ${item.flavorId} not found`);

      const availableStock = Number(f.stock ?? 0);
      if (availableStock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${f.name}`);
      }

      const unit = Number(f.price ?? 0);
      const lineTotal = unit * item.quantity;
      total += lineTotal;

      itemsToSave.push(
        this.itemsRepo.create({
          flavor: f,
          quantity: item.quantity,
          unitPrice: unit,
          totalPrice: lineTotal,
        }),
      );
    }

    const paymentMethod = orderData.paymentMethod ?? PaymentMethod.CASH;
    const isOnline = paymentMethod === PaymentMethod.ONLINE;

    const order = await this.ordersRepo.save(
      this.ordersRepo.create({
        total,
        note: orderData.note,
        status: isOnline ? OrderStatus.PENDING : OrderStatus.COMPLETED,
        paymentMethod,
      }),
    );

    for (const orderItem of itemsToSave) {
      orderItem.order = order;
    }
    await this.itemsRepo.save(itemsToSave);

    if (!isOnline) {
      await this.fulfillOrder(order.id);
    }

    return this.findOne(order.id);
  }

  async fulfillOrder(orderId: string) {
    const order = await this.findOne(orderId);

    if (order.status === OrderStatus.COMPLETED) {
      return order;
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.FAILED) {
      throw new BadRequestException('Cannot fulfill a cancelled or failed order');
    }

    for (const item of order.items ?? []) {
      const flavorId = item.flavor?.id;
      if (!flavorId) continue;

      const f = await this.flavorsRepo.findOne({ where: { id: flavorId } });
      if (!f) throw new NotFoundException(`Flavor ${flavorId} not found`);

      const availableStock = Number(f.stock ?? 0);
      if (availableStock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${f.name}`);
      }

      f.stock = availableStock - Number(item.quantity);
      await this.flavorsRepo.save(f);

      const tx = this.invRepo.create({
        flavor: f,
        change: -item.quantity,
        type: InventoryChangeType.SALE,
        reason: `Order ${order.id} completed`,
      });
      await this.invRepo.save(tx);
    }

    order.status = OrderStatus.COMPLETED;
    return this.ordersRepo.save(order);
  }

  async markPaymentFailed(orderId: string) {
    const order = await this.findOne(orderId);

    if (order.status === OrderStatus.COMPLETED) {
      return order;
    }

    order.status = OrderStatus.FAILED;
    return this.ordersRepo.save(order);
  }

  async findAll() {
    return this.ordersRepo.find({ relations: { items: { flavor: true } } });
  }

  async findOne(id: string) {
    const o = await this.ordersRepo.findOne({ where: { id }, relations: { items: { flavor: true } } });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.findOne(id);
    if (order.status === status) return order;

    if (status === OrderStatus.CANCELLED && order.items) {
      if (order.status === OrderStatus.COMPLETED) {
        for (const it of order.items) {
          const f = await this.flavorsRepo.findOne({ where: { id: (it as any).flavor.id } });
          if (f) {
            f.stock = Number(f.stock) + Number(it.quantity);
            await this.flavorsRepo.save(f);
            const tx = this.invRepo.create({ flavor: f, change: it.quantity, type: InventoryChangeType.RELEASE, reason: `Order ${order.id} cancelled` });
            await this.invRepo.save(tx);
          }
        }
      }
    }

    order.status = status;
    return this.ordersRepo.save(order);
  }
}
