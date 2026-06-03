import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartyOrder } from './entities/party-order.entity';
import { CreatePartyOrderDto } from './dto/create-party-order.dto';
import { PaymentMethod } from '../orders/entities/order.entity';
import { parseId } from '../../common/utils/parse-id';

export function calculatePartyOrderAmounts(
  totalAmount: number,
  discountPercent: number,
  totalEarningsOverride?: number,
) {
  const safeTotal = Math.max(0, Number(totalAmount) || 0);
  const safeDiscount = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountAmount = safeTotal * (safeDiscount / 100);
  const amountAfterDiscount = Math.round((safeTotal - discountAmount) * 100) / 100;
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
  ) {}

  async create(dto: CreatePartyOrderDto) {
    const amounts = calculatePartyOrderAmounts(
      dto.totalAmount,
      dto.discountPercent,
      dto.totalEarnings,
    );

    const record = this.partyOrdersRepo.create({
      partyName: dto.partyName.trim(),
      totalAmount: amounts.totalAmount,
      discountPercent: amounts.discountPercent,
      amountAfterDiscount: amounts.amountAfterDiscount,
      totalEarnings: amounts.totalEarnings,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
      userId: dto.userId,
      note: dto.note?.trim() || undefined,
    });

    return this.partyOrdersRepo.save(record);
  }

  async findAll() {
    return this.partyOrdersRepo.find({
      order: { createdAt: 'DESC' },
      relations: { user: true },
    });
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
