/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { Flavor } from './entities/flavor.entity';
import { FlavorMonthly } from './entities/flavor-monthly.entity';
import { OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { parseId } from '../../common/utils/parse-id';
import { getMemberPrice } from '../../common/utils/member-price';

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
    const image =
      typeof data.image === 'string' && data.image.trim()
        ? data.image.trim()
        : undefined;

    const f = this.flavorsRepo.create({
      ...data,
      image,
      minStock: data.minStock ?? 15,
    });
    return this.flavorsRepo.save(f);
  }

  async findAll() {
    return this.flavorsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findByName(name: string) {
    return this.flavorsRepo.findOne({ where: { name } });
  }

  async findOne(id: number | string) {
    const parsedId = parseId(id);
    const f = await this.flavorsRepo.findOne({ where: { id: parsedId } });
    if (!f) throw new NotFoundException('Flavor not found');
    return f;
  }

  async update(id: number | string, data: Partial<Flavor>) {
    await this.findOne(id);
    await this.flavorsRepo.update(parseId(id), data);
    return this.findOne(id);
  }

  async bulkUpdate(
    items: Array<
      Omit<Partial<Flavor>, 'id'> & {
        id: number | string;
      }
    >,
  ) {
    const updated = await Promise.all(
      items.map(async (item) => {
        const parsedId = parseId(item.id);
        const image =
          typeof item.image === 'string'
            ? item.image.trim() || null
            : item.image;
        const { id: _id, stock, ...rest } = item;

        const payload: Partial<Flavor> = {
          ...rest,
          image: image ?? undefined,
        };

        // Update non-stock fields first so stock adjust uses the latest price.
        if (
          Object.keys(payload).some(
            (key) => payload[key as keyof Flavor] !== undefined,
          )
        ) {
          await this.flavorsRepo.update(parsedId, payload);
        }

        // Stock changes use the same path as Add (monthly qty + member rate).
        if (typeof stock === 'number') {
          const current = await this.findOne(parsedId);
          const delta = Number(stock) - Number(current.stock ?? 0);
          if (delta !== 0) {
            return this.adjustStock(parsedId, delta);
          }
        }

        return this.findOne(parsedId);
      }),
    );

    return updated;
  }

  async remove(id: number | string) {
    await this.findOne(id);
    return this.flavorsRepo.delete(parseId(id));
  }

  async getAvailable() {
    return this.flavorsRepo.find({
      where: { isActive: true, stock: MoreThan(0) },
    });
  }

  async getActive() {
    return this.flavorsRepo
      .createQueryBuilder('flavor')
      .select([
        'flavor.id',
        'flavor.name',
        'flavor.category',
        'flavor.description',
        'flavor.price',
        'flavor.stock',
        'flavor.image',
        'flavor.isActive',
        'flavor.updatedAt',
      ])
      .where('flavor.isActive = :isActive', { isActive: true })
      .orderBy('flavor.name', 'ASC')
      .getMany();
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

  private async getUnitsSoldByFlavorInMonth(
    year: number,
    month: number,
  ): Promise<Map<number, number>> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const rows = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .select('oi.flavorId', 'flavorId')
      .addSelect('COALESCE(SUM(oi.quantity), 0)', 'total')
      .where('o.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('o.createdAt >= :start', { start })
      .andWhere('o.createdAt < :end', { end })
      .groupBy('oi.flavorId')
      .getRawMany<{ flavorId: string; total: string }>();

    const soldByFlavor = new Map<number, number>();
    for (const row of rows) {
      soldByFlavor.set(Number(row.flavorId), Number(row.total ?? 0));
    }
    return soldByFlavor;
  }

  private async getUnitsSoldInMonth(
    flavorId: number,
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

    const soldByFlavor = await this.getUnitsSoldByFlavorInMonth(year, month);
    return records.some((record) =>
      this.monthHadActivity(record, soldByFlavor.get(record.flavorId) ?? 0),
    );
  }

  private buildCarryForwardMap(
    flavorIds: number[],
    prevRecords: FlavorMonthly[],
  ): Map<number, number> {
    const prevMap = new Map(
      prevRecords.map((record) => [record.flavorId, record]),
    );
    const carryMap = new Map<number, number>();

    for (const flavorId of flavorIds) {
      const prev = prevMap.get(flavorId);
      carryMap.set(
        flavorId,
        prev
          ? Math.max(
              0,
              Number(prev.carryForwarded ?? 0) + Number(prev.quantity ?? 0),
            )
          : 0,
      );
    }

    return carryMap;
  }

  private async resolveCarryForwarded(
    flavorId: number,
    year: number,
    month: number,
  ): Promise<number> {
    const { year: prevYear, month: prevMonth } = this.previousMonth(
      year,
      month,
    );
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

  private async ensureMonthlyRecord(
    flavor: Flavor,
    year: number,
    month: number,
  ) {
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
        rate: getMemberPrice(Number(flavor.price ?? 0)),
        cost: 0,
        category: flavor.category,
      }),
    );
  }

  async adjustStock(id: number | string, change: number) {
    const parsedId = parseId(id);
    await this.flavorsRepo
      .createQueryBuilder()
      .update(Flavor)
      .set({
        stock: () => `COALESCE(stock, 0) + ${Number(change)}`,
      })
      .where('id = :id', { id: parsedId })
      .execute();

    const flavor = await this.findOne(parsedId);

    if (Number(change) > 0) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const monthly = await this.ensureMonthlyRecord(flavor, year, month);

      monthly.quantity = Number(monthly.quantity ?? 0) + Number(change);
      const memberRate = getMemberPrice(Number(flavor.price ?? 0));
      monthly.rate = memberRate;
      monthly.cost = monthly.quantity * memberRate;
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

  async getProcurementTotalAllTime() {
    const records = await this.flavorMonthlyRepo.find({
      relations: { flavor: true },
    });

    return {
      total: records.reduce(
        (sum, record) =>
          sum +
          Number(record.quantity ?? 0) *
            getMemberPrice(Number(record.flavor?.price ?? record.rate ?? 0)),
        0,
      ),
      units: records.reduce(
        (sum, record) => sum + Number(record.quantity ?? 0),
        0,
      ),
    };
  }

  async getProcurementTotalForPeriod(year: number, month?: number) {
    const records = await this.flavorMonthlyRepo.find({
      where: month !== undefined ? { year, month } : { year },
      relations: { flavor: true },
    });

    return {
      total: records.reduce(
        (sum, record) =>
          sum +
          Number(record.quantity ?? 0) *
            getMemberPrice(Number(record.flavor?.price ?? record.rate ?? 0)),
        0,
      ),
      units: records.reduce(
        (sum, record) => sum + Number(record.quantity ?? 0),
        0,
      ),
    };
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
        flavors.map((flavor) => this.ensureMonthlyRecord(flavor, year, month)),
      );
    }

    const items = await this.flavorMonthlyRepo.find({
      where: { year, month },
      relations: { flavor: true },
    });

    if (items.length === 0) {
      return [];
    }

    const { year: prevYear, month: prevMonth } = this.previousMonth(
      year,
      month,
    );
    const flavorIds = items.map((item) => item.flavorId);
    const prevRecords = await this.flavorMonthlyRepo.find({
      where: { year: prevYear, month: prevMonth, flavorId: In(flavorIds) },
    });
    const carryForwardMap = this.buildCarryForwardMap(flavorIds, prevRecords);

    return items.map((it) => {
      const staffPrice = Number(it.flavor.price ?? 0);
      const memberRate = getMemberPrice(staffPrice);
      const quantity = Number(it.quantity || 0);
      const carryForwarded = carryForwardMap.get(it.flavorId) ?? 0;

      return {
        id: it.flavor.id,
        name: it.flavor.name,
        category: it.category ?? it.flavor.category,
        description: it.flavor.description,
        carryForwarded,
        quantity,
        stock: it.flavor.stock,
        minStock: it.flavor.minStock,
        price: staffPrice,
        revenue: quantity * memberRate,
        image: it.flavor.image,
        isActive: it.flavor.isActive,
        isSeasonal: it.flavor.isSeasonal,
        month: it.month,
        year: it.year,
      };
    });
  }
}
