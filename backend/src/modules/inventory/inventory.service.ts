import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryTransaction, InventoryChangeType } from './entities/inventory-transaction.entity';
import { Flavor } from '../flavors/entities/flavor.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryTransaction) private invRepo: Repository<InventoryTransaction>,
    @InjectRepository(Flavor) private flavorsRepo: Repository<Flavor>,
  ) {}

  async listTransactions() {
    return this.invRepo.find({ relations: { flavor: true }, order: { createdAt: 'DESC' } as any });
  }

  async adjust(flavorId: string, change: number, type: InventoryChangeType, reason?: string) {
    const f = await this.flavorsRepo.findOne({ where: { id: flavorId } });
    if (!f) throw new NotFoundException('Flavor not found');
    f.stock = Number(f.stock) + Number(change);
    await this.flavorsRepo.save(f);

    const tx = this.invRepo.create({ flavor: f, change, type, reason });
    return this.invRepo.save(tx);
  }

  async forFlavor(flavorId: string) {
    return this.invRepo.find({ where: { flavor: { id: flavorId } }, relations: { flavor: true }, order: { createdAt: 'DESC' } as any });
  }
}
