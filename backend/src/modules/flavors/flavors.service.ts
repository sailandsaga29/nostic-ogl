/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Flavor } from './entities/flavor.entity';
import { FlavorMonthly } from './entities/flavor-monthly.entity';
import { OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Injectable()
export class FlavorsService {
  constructor(
    @InjectRepository(Flavor)
    private flavorsRepo: Repository<Flavor>,
    @InjectRepository(FlavorMonthly)
    private flavorMonthlyRepo: Repository<FlavorMonthly>,
    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,
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

  private previousMonth(year: number, month: number) {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }

  private currentCalendar() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  private isFutureMonth(year: number, month: number): boolean {
    const { year: cy, month: cm } = this.currentCalendar();
    return year > cy || (year === cy && month > cm);
  }

  private isCurrentMonth(year: number, month: number): boolean {
    const { year: cy, month: cm } = this.currentCalendar();
    return year === cy && month === cm;
  }

  private monthHadActivity(record: FlavorMonthly, unitsSold: number): boolean {
    return (
      Number(record.carryForwarded ?? 0) > 0 ||
      Number(record.quantity ?? 0) > 0 ||
      unitsSold > 0
    );
  }

  private async getUnitsSoldInMonth(
    flavorId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const result = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.flavor', 'f')
      .where('f.id = :flavorId', { flavorId })
      .andWhere('o.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('o.createdAt >= :start', { start })
      .andWhere('o.createdAt < :end', { end })
      .select('COALESCE(SUM(oi.quantity), 0)', 'total')
      .getRawOne<{ total: string }>();

    return Number(result?.total ?? 0);
  }

  private async monthHasActivityInDb(
    year: number,
    month: number,
  ): Promise<boolean> {
    const records = await this.flavorMonthlyRepo.find({
      where: { year, month },
    });

    if (records.length === 0) {
      return false;
    }

    const checks = await Promise.all(
      records.map(async (record) => {
        const sold = await this.getUnitsSoldInMonth(
          record.flavorId,
          year,
          month,
        );
        return this.monthHadActivity(record, sold);
      }),
    );

    return checks.some(Boolean);
  }

  private async resolveCarryForwarded(
    flavorId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const { year: prevYear, month: prevMonth } = this.previousMonth(year, month);
    const prev = await this.flavorMonthlyRepo.findOne({
      where: { flavorId, year: prevYear, month: prevMonth },
    });

    if (!prev) {
      return 0;
    }

    return Math.max(
      0,
      Number(prev.carryForwarded ?? 0) + Number(prev.quantity ?? 0),
    );
  }

  private async ensureMonthlyRecord(flavor: Flavor, year: number, month: number) {
    const existing = await this.flavorMonthlyRepo.findOne({
      where: { flavorId: flavor.id, year, month },
    });

    if (existing) {
      return existing;
    }

    const carryForwarded = await this.resolveCarryForwarded(
      flavor.id,
      year,
      month,
    );

    return this.flavorMonthlyRepo.save(
      this.flavorMonthlyRepo.create({
        flavor,
        flavorId: flavor.id,
        year,
        month,
        carryForwarded,
        quantity: 0,
        rate: Number(flavor.price ?? 0),
        cost: 0,
        category: flavor.category,
      }),
    );
  }

  async adjustStock(id: string, change: number) {
    await this.flavorsRepo
      .createQueryBuilder()
      .update(Flavor)
      .set({
        stock: () => `COALESCE(stock, 0) + ${Number(change)}`,
      })
      .where('id = :id', { id })
      .execute();

    const flavor = await this.findOne(id);

    if (Number(change) > 0) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const monthly = await this.ensureMonthlyRecord(flavor, year, month);

      monthly.quantity = Number(monthly.quantity ?? 0) + Number(change);
      monthly.rate = Number(flavor.price ?? monthly.rate ?? 0);
      monthly.cost = monthly.quantity * monthly.rate;
      monthly.category = flavor.category;
      await this.flavorMonthlyRepo.save(monthly);
    }

    return flavor;
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
    if (this.isFutureMonth(year, month)) {
      return [];
    }

    if (!this.isCurrentMonth(year, month)) {
      const hasData = await this.monthHasActivityInDb(year, month);
      if (!hasData) {
        return [];
      }
    } else {
      const flavors = await this.flavorsRepo.find();
      await Promise.all(
        flavors.map((flavor) =>
          this.ensureMonthlyRecord(flavor, year, month),
        ),
      );
    }

    const items = await this.flavorMonthlyRepo.find({
      where: { year, month },
      relations: { flavor: true },
    });

    return Promise.all(
      items.map(async (it) => {
        const rate = Number(it.rate || it.flavor.price || 0);
        const quantity = Number(it.quantity || 0);
        const carryForwarded = await this.resolveCarryForwarded(
          it.flavorId,
          year,
          month,
        );

        if (Number(it.carryForwarded ?? 0) !== carryForwarded) {
          it.carryForwarded = carryForwarded;
          await this.flavorMonthlyRepo.save(it);
        }

        return {
          id: it.flavor.id,
          name: it.flavor.name,
          category: it.category ?? it.flavor.category,
          description: it.flavor.description,
          carryForwarded,
          quantity,
          stock: it.flavor.stock,
          minStock: it.flavor.minStock,
          price: rate,
          revenue: quantity * rate,
          image: it.flavor.image,
          isActive: it.flavor.isActive,
          isSeasonal: it.flavor.isSeasonal,
          month: it.month,
          year: it.year,
        };
      }),
    );
  }
}
