import { Repository } from 'typeorm';
import { Flavor } from './entities/flavor.entity';
import { FlavorMonthly } from './entities/flavor-monthly.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { FlavorsService } from './flavors.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('FlavorsService stock adjustments', () => {
  let service: FlavorsService;
  let flavorsRepo: jest.Mocked<
    Pick<
      Repository<Flavor>,
      'findOne' | 'update' | 'createQueryBuilder' | 'create' | 'save'
    >
  >;
  let monthlyRepo: jest.Mocked<
    Pick<
      Repository<FlavorMonthly>,
      'findOne' | 'save' | 'create' | 'createQueryBuilder'
    >
  >;
  let monthlyRecord: FlavorMonthly;
  let monthlyInsertBuilder: {
    insert: jest.Mock;
    into: jest.Mock;
    values: jest.Mock;
    orIgnore: jest.Mock;
    execute: jest.Mock;
  };
  let queryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };

  beforeEach(() => {
    const flavor = {
      id: 1,
      name: 'Mint',
      category: 'Popsicles',
      price: 100,
      stock: 10,
      minStock: 15,
      isActive: true,
      isSeasonal: false,
      popularity: 0,
      reservedQty: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Flavor;

    monthlyRecord = {
      id: 1,
      flavor,
      flavorId: 1,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      carryForwarded: 0,
      quantity: 10,
      rate: 90,
      cost: 900,
      category: flavor.category,
      createdAt: new Date(),
    };

    queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    monthlyInsertBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    flavorsRepo = {
      findOne: jest.fn().mockResolvedValue(flavor),
      update: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      create: jest.fn((record) => record as Flavor),
      save: jest.fn(async (record) => record as Flavor),
    } as unknown as typeof flavorsRepo;

    monthlyRepo = {
      findOne: jest.fn().mockResolvedValue(monthlyRecord),
      save: jest.fn(async (record) => record),
      create: jest.fn((record) => record as FlavorMonthly),
      createQueryBuilder: jest.fn().mockReturnValue(monthlyInsertBuilder),
    } as unknown as typeof monthlyRepo;

    service = new FlavorsService(
      flavorsRepo as unknown as Repository<Flavor>,
      monthlyRepo as unknown as Repository<FlavorMonthly>,
      {} as Repository<OrderItem>,
    );
  });

  it('sets monthly quantity and investment to match explicitly edited stock', async () => {
    await service.bulkUpdate([{ id: 1, name: 'Mint', stock: 0 }]);

    expect(monthlyRecord.quantity).toBe(0);
    expect(monthlyRecord.cost).toBe(0);
    expect(monthlyRecord.rate).toBe(90);
    expect(monthlyRepo.save).toHaveBeenCalledWith(monthlyRecord);
    expect(flavorsRepo.update).toHaveBeenCalledWith(1, { stock: 0 });
  });

  it('updates monthly procurement when stock is edited through the single-flavor endpoint', async () => {
    monthlyRecord.quantity = 4;
    monthlyRecord.cost = 360;

    await service.update(1, { stock: 12 });

    expect(monthlyRecord.quantity).toBe(12);
    expect(monthlyRecord.cost).toBe(1080);
    expect(monthlyRepo.save).toHaveBeenCalledWith(monthlyRecord);
  });

  it('recalculates monthly procurement when stock is explicitly set to zero again', async () => {
    monthlyRecord.quantity = 2;
    monthlyRecord.cost = 180;
    const zeroStockFlavor = { ...monthlyRecord.flavor, stock: 0 } as Flavor;
    flavorsRepo.findOne.mockResolvedValue(zeroStockFlavor);

    await service.update(1, { stock: 0 });

    expect(monthlyRecord.quantity).toBe(0);
    expect(monthlyRecord.cost).toBe(0);
    expect(flavorsRepo.update).toHaveBeenCalledWith(1, { stock: 0 });
    expect(monthlyRepo.save).toHaveBeenCalledWith(monthlyRecord);
  });

  it('updates stock for every flavor in one bulk edit', async () => {
    const secondFlavor = {
      id: 2,
      name: 'Strawberry',
      category: 'Popsicles',
      price: 80,
      stock: 5,
    } as Flavor;
    const secondMonthlyRecord = {
      ...monthlyRecord,
      id: 2,
      flavor: secondFlavor,
      flavorId: 2,
      quantity: 5,
      rate: 72,
      cost: 360,
    } as FlavorMonthly;

    flavorsRepo.findOne.mockImplementation(async (options) => {
      const where = Array.isArray(options.where)
        ? options.where[0]
        : options.where;
      const id = where?.id;
      return (id === secondFlavor.id ? secondFlavor : monthlyRecord.flavor) as Flavor;
    });
    monthlyRepo.findOne.mockImplementation(async (options) => {
      const where = Array.isArray(options.where)
        ? options.where[0]
        : options.where;
      return where?.flavorId === secondFlavor.id
        ? secondMonthlyRecord
        : monthlyRecord;
    });

    await service.bulkUpdate([
      { id: 1, name: 'Mint', stock: 12 },
      { id: 2, name: 'Strawberry', stock: 9 },
    ]);

    expect(flavorsRepo.update).toHaveBeenCalledWith(1, { stock: 12 });
    expect(flavorsRepo.update).toHaveBeenCalledWith(2, { stock: 9 });
    expect(monthlyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ flavorId: 1, quantity: 12, cost: 1080 }),
    );
    expect(monthlyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ flavorId: 2, quantity: 9, cost: 648 }),
    );
  });

  it('reports failed flavor names and continues processing the remaining rows', async () => {
    const strawberry = {
      ...monthlyRecord.flavor,
      id: 2,
      name: 'Strawberry',
      stock: 5,
    } as Flavor;
    const coconut = {
      ...monthlyRecord.flavor,
      id: 3,
      name: 'Tinder Coco',
      stock: 2,
    } as Flavor;
    const monthlyRecords = new Map<number, FlavorMonthly>([
      [1, monthlyRecord],
      [
        2,
        {
          ...monthlyRecord,
          id: 2,
          flavor: strawberry,
          flavorId: 2,
          quantity: 5,
          cost: 450,
        },
      ],
      [
        3,
        {
          ...monthlyRecord,
          id: 3,
          flavor: coconut,
          flavorId: 3,
          quantity: 2,
          cost: 180,
        },
      ],
    ]);
    const flavors = new Map<number, Flavor>([
      [1, monthlyRecord.flavor],
      [2, strawberry],
      [3, coconut],
    ]);
    flavorsRepo.findOne.mockImplementation(async (options) => {
      const where = Array.isArray(options.where)
        ? options.where[0]
        : options.where;
      return flavors.get(Number(where?.id)) ?? null;
    });
    flavorsRepo.update.mockImplementation(async (id) => {
      if (Number(id) === strawberry.id) {
        throw new Error('Simulated update failure');
      }
      return { raw: [], generatedMaps: [] };
    });
    monthlyRepo.findOne.mockImplementation(async (options) => {
      const where = Array.isArray(options.where)
        ? options.where[0]
        : options.where;
      return monthlyRecords.get(Number(where?.flavorId)) ?? null;
    });

    let updateError: unknown;
    try {
      await service.bulkUpdate([
        { id: 1, name: 'Mint', stock: 12 },
        { id: 2, name: 'Strawberry', stock: 9 },
        { id: 3, name: 'Tinder Coco', stock: 7 },
      ]);
    } catch (error) {
      updateError = error;
    }

    expect(updateError).toBeInstanceOf(InternalServerErrorException);
    if (!(updateError instanceof Error)) {
      throw new Error('Expected bulk update to report a failed flavor');
    }
    expect(updateError.message).toContain('"Strawberry" (ID 2)');
    expect(flavorsRepo.update).toHaveBeenCalledTimes(5);
    expect(monthlyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ flavorId: 1, quantity: 12 }),
    );
    expect(monthlyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ flavorId: 3, quantity: 7 }),
    );
  });

  it('records opening stock as this month’s restock and investment', async () => {
    const flavor = {
      id: 2,
      name: 'Mango',
      category: 'Popsicles',
      price: 100,
      stock: 8,
    } as Flavor;
    const createdMonthlyRecord = {
      ...monthlyRecord,
      flavor,
      flavorId: 2,
      quantity: 0,
      cost: 0,
    };
    flavorsRepo.create.mockReturnValue(flavor);
    flavorsRepo.save.mockResolvedValue(flavor);
    monthlyRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdMonthlyRecord);

    await service.create(flavor);

    expect(monthlyRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        flavorId: 2,
        quantity: 8,
        rate: 90,
        cost: 720,
      }),
    );
    expect(monthlyInsertBuilder.orIgnore).toHaveBeenCalled();
  });
});
