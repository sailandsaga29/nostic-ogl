import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryTransaction, InventoryChangeType } from './entities/inventory-transaction.entity';
import { Flavor } from '../flavors/entities/flavor.entity';
import { parseId } from '../../common/utils/parse-id';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryTransaction) private invRepo: Repository<InventoryTransaction>,
    @InjectRepository(Flavor) private flavorsRepo: Repository<Flavor>,
  ) {}

  async listTransactions() {
    return this.invRepo.find({ relations: { flavor: true }, order: { createdAt: 'DESC' } as any });
  }

  async adjust(flavorId: number | string, change: number, type: InventoryChangeType, reason?: string) {
    const parsedId = parseId(flavorId);
    const f = await this.flavorsRepo.findOne({ where: { id: parsedId } });
    if (!f) throw new NotFoundException('Flavor not found');
    f.stock = Number(f.stock) + Number(change);
    await this.flavorsRepo.save(f);

    const tx = this.invRepo.create({ flavor: f, flavorId: parsedId, change, type, reason });
    return this.invRepo.save(tx);
  }

  async forFlavor(flavorId: number | string) {
    const parsedId = parseId(flavorId);
    return this.invRepo.find({ where: { flavorId: parsedId }, relations: { flavor: true }, order: { createdAt: 'DESC' } as any });
  }
}
