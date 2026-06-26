import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  PartyOrder,
  PartyOrderLineItem,
} from './entities/party-order.entity';
import { CreatePartyOrderDto } from './dto/create-party-order.dto';
import { OrderStatus, PaymentMethod } from '../orders/entities/order.entity';
import { Flavor } from '../flavors/entities/flavor.entity';
import {
  InventoryChangeType,
  InventoryTransaction,
} from '../inventory/entities/inventory-transaction.entity';
import { parseId } from '../../common/utils/parse-id';

export function calculatePartyOrderAmounts(
  totalAmount: number,
  discountPercent: number,
  totalEarningsOverride?: number,
) {
  const safeTotal = Math.max(0, Number(totalAmount) || 0);
  const safeDiscount = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountAmount = safeTotal * (safeDiscount / 100);
  const amountAfterDiscount =
    Math.round((safeTotal - discountAmount) * 100) / 100;
  const totalEarnings =
    totalEarningsOverride !== undefined && totalEarningsOverride !== null
      ? Math.round(Number(totalEarningsOverride) * 100) / 100
      : amountAfterDiscount;

  return {
    totalAmount: safeTotal,
    discountPercent: safeDiscount,
    discountAmount: Math.round(discountAmount * 100) / 100,
    amountAfterDiscount,
    totalEarnings,
  };
}

@Injectable()
export class PartyOrdersService {
  constructor(
    @InjectRepository(PartyOrder)
    private readonly partyOrdersRepo: Repository<PartyOrder>,
    @InjectRepository(Flavor)
    private readonly flavorsRepo: Repository<Flavor>,
    @InjectRepository(InventoryTransaction)
    private readonly invRepo: Repository<InventoryTransaction>,
  ) {}

  private async resolveLineItems(
    items: CreatePartyOrderDto['items'],
  ): Promise<PartyOrderLineItem[]> {
    if (!items || items.length === 0) {
      return [];
    }

    const uniqueItems = items.reduce((acc, item) => {
      const previous = acc.get(item.flavorId);
      acc.set(item.flavorId, {
        flavorId: item.flavorId,
        quantity: previous ? previous.quantity + item.quantity : item.quantity,
      });
      return acc;
    }, new Map<number, { flavorId: number; quantity: number }>());

    const flavorIds = Array.from(uniqueItems.keys());
    const flavors = await this.flavorsRepo.findBy({ id: In(flavorIds) });
    const lineItems: PartyOrderLineItem[] = [];

    for (const item of uniqueItems.values()) {
      const flavor = flavors.find((row) => row.id === item.flavorId);
      if (!flavor) {
        throw new NotFoundException(`Flavor ${item.flavorId} not found`);
      }

      const availableStock = Number(flavor.stock ?? 0);
      if (availableStock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${flavor.name}`);
      }

      lineItems.push({
        flavorId: flavor.id,
        quantity: item.quantity,
        flavorName: flavor.name,
        unitPrice: Number(flavor.price ?? 0),
      });
    }

    return lineItems;
  }

  private async deductInventory(
    partyOrderId: number,
    lineItems: PartyOrderLineItem[],
  ) {
    for (const item of lineItems) {
      const flavor = await this.flavorsRepo.findOne({
        where: { id: item.flavorId },
      });
      if (!flavor) {
        throw new NotFoundException(`Flavor ${item.flavorId} not found`);
      }

      const availableStock = Number(flavor.stock ?? 0);
      if (availableStock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${flavor.name}`);
      }

      flavor.stock = availableStock - item.quantity;
      await this.flavorsRepo.save(flavor);

      const tx = this.invRepo.create({
        flavor,
        flavorId: flavor.id,
        change: -item.quantity,
        type: InventoryChangeType.SALE,
        reason: `Party order ${partyOrderId} completed`,
      });
      await this.invRepo.save(tx);
    }
  }

  async create(dto: CreatePartyOrderDto) {
    const lineItems = await this.resolveLineItems(dto.items);
    const calculatedTotal = lineItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const baseTotal =
      lineItems.length > 0 ? calculatedTotal : dto.totalAmount;

    if (lineItems.length > 0 && Math.abs(baseTotal - dto.totalAmount) > 0.01) {
      throw new BadRequestException(
        'Bulk order total does not match cart item prices',
      );
    }

    const amounts = calculatePartyOrderAmounts(
      baseTotal,
      dto.discountPercent,
      dto.totalEarnings,
    );

    const paymentMethod = dto.paymentMethod ?? PaymentMethod.CASH;
    const isOnline = paymentMethod === PaymentMethod.ONLINE;

    const record = this.partyOrdersRepo.create({
      partyName: dto.partyName.trim(),
      totalAmount: amounts.totalAmount,
      discountPercent: amounts.discountPercent,
      amountAfterDiscount: amounts.amountAfterDiscount,
      totalEarnings: amounts.totalEarnings,
      paymentMethod,
      status: isOnline ? OrderStatus.PENDING : OrderStatus.COMPLETED,
      userId: dto.userId,
      note: dto.note?.trim() || undefined,
      lineItems: lineItems.length > 0 ? lineItems : undefined,
    });

    const saved = await this.partyOrdersRepo.save(record);

    if (lineItems.length > 0 && !isOnline) {
      await this.deductInventory(saved.id, lineItems);
    }

    return saved;
  }

  async fulfillPartyOrder(partyOrderId: number | string) {
    const order = await this.findOne(partyOrderId);

    if (order.status === OrderStatus.COMPLETED) {
      return order;
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.FAILED
    ) {
      throw new BadRequestException(
        'Cannot fulfill a cancelled or failed party order',
      );
    }

    const lineItems = order.lineItems ?? [];
    if (lineItems.length > 0) {
      await this.deductInventory(order.id, lineItems);
    }

    order.status = OrderStatus.COMPLETED;
    return this.partyOrdersRepo.save(order);
  }

  async markPaymentFailed(partyOrderId: number | string) {
    const order = await this.findOne(partyOrderId);

    if (order.status === OrderStatus.COMPLETED) {
      return order;
    }

    order.status = OrderStatus.FAILED;
    return this.partyOrdersRepo.save(order);
  }

  async findAll(filters: { from?: string; to?: string } = {}) {
    const qb = this.partyOrdersRepo
      .createQueryBuilder('partyOrder')
      .orderBy('partyOrder.createdAt', 'DESC');

    if (filters.from) {
      qb.andWhere('partyOrder.createdAt >= :from', {
        from: new Date(filters.from),
      });
    }
    if (filters.to) {
      qb.andWhere('partyOrder.createdAt <= :to', {
        to: new Date(filters.to),
      });
    }

    return qb.getMany();
  }

  async findOne(id: number | string) {
    const parsedId = parseId(id);
    const row = await this.partyOrdersRepo.findOne({
      where: { id: parsedId },
      relations: { user: true },
    });
    if (!row) {
      throw new NotFoundException('Party order not found');
    }
    return row;
  }
}
