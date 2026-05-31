/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Flavor } from './entities/flavor.entity';
import { FlavorMonthly } from './entities/flavor-monthly.entity';

@Injectable()
export class FlavorsService {
  constructor(
    @InjectRepository(Flavor)
    private flavorsRepo: Repository<Flavor>,
    @InjectRepository(FlavorMonthly)
    private flavorMonthlyRepo: Repository<FlavorMonthly>,
  ) {}

  async create(data: Partial<Flavor>) {
    const f = this.flavorsRepo.create(data);
    return this.flavorsRepo.save(f);
  }

  async findAll() {
    return this.flavorsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findByName(name: string) {
    return this.flavorsRepo.findOne({ where: { name } });
  }

  async findOne(id: string) {
    const f = await this.flavorsRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Flavor not found');
    return f;
  }

  async update(id: string, data: Partial<Flavor>) {
    await this.findOne(id);
    await this.flavorsRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.flavorsRepo.delete(id);
  }

  async getAvailable() {
    return this.flavorsRepo.find({
      where: { isActive: true, stock: MoreThan(0) },
    });
  }

  async getActive() {
    return this.flavorsRepo.find({ where: { isActive: true } });
  }

  async getLowStock() {
    return this.flavorsRepo
      .createQueryBuilder('flavor')
      .where('flavor.stock <= flavor.minStock')
      .getMany();
  }

  async adjustStock(id: string, change: number) {
    const f = await this.findOne(id);
    f.stock = Number(f.stock) + Number(change);
    return this.flavorsRepo.save(f);
  }

  async getAvailableYears() {
    const years = await this.flavorMonthlyRepo
      .createQueryBuilder('fm')
      .select('DISTINCT fm.year', 'year')
      .orderBy('fm.year', 'ASC')
      .getRawMany();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return years.map((y) => y.year);
  }

  async getMonthsByYear(year: number) {
    const months = await this.flavorMonthlyRepo
      .createQueryBuilder('fm')
      .select('DISTINCT fm.month', 'month')
      .where('fm.year = :year', { year })
      .orderBy('fm.month', 'ASC')
      .getRawMany();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return months.map((m) => m.month);
  }

  async getMonthlyStats(year: number, month: number) {
    const items = await this.flavorMonthlyRepo.find({
      where: { year, month },
      relations: { flavor: true },
    });

    // Map to a friendly shape combining flavor base info with monthly metrics
    return items.map((it) => ({
      id: it.flavor.id,
      name: it.flavor.name,
      category: it.category ?? it.flavor.category,
      description: it.flavor.description,
      quantity: it.quantity,
      stock: it.flavor.stock,
      minStock: it.flavor.minStock,
      price: it.rate || it.flavor.price,
      revenue: (it.rate || it.flavor.price) * (it.quantity || 0),
      image: it.flavor.image,
      isActive: it.flavor.isActive,
      isSeasonal: it.flavor.isSeasonal,
      month: it.month,
      year: it.year,
    }));
  }
}
