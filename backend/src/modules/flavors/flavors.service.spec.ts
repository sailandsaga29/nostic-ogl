import { Repository } from 'typeorm';
import { Flavor } from './entities/flavor.entity';
import { FlavorMonthly } from './entities/flavor-monthly.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { FlavorsService } from './flavors.service';

describe('FlavorsService stock adjustments', () => {
  let service: FlavorsService;
  let flavorsRepo: jest.Mocked<Pick<Repository<Flavor>, 'findOne' | 'update' | 'createQueryBuilder'>>;
  let monthlyRepo: jest.Mocked<Pick<Repository<FlavorMonthly>, 'findOne' | 'save' | 'create'>>;
  let monthlyRecord: FlavorMonthly;
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

    flavorsRepo = {
      findOne: jest.fn().mockResolvedValue(flavor),
      update: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as typeof flavorsRepo;

    monthlyRepo = {
      findOne: jest.fn().mockResolvedValue(monthlyRecord),
      save: jest.fn(async (record) => record),
      create: jest.fn((record) => record as FlavorMonthly),
    } as unknown as typeof monthlyRepo;

    service = new FlavorsService(
      flavorsRepo as unknown as Repository<Flavor>,
      monthlyRepo as unknown as Repository<FlavorMonthly>,
      {} as Repository<OrderItem>,
    );
  });

  it('decreases monthly restocked quantity and invested cost when bulk stock is reduced', async () => {
    await service.bulkUpdate([{ id: 1, name: 'Mint', stock: 0 }]);

    expect(monthlyRecord.quantity).toBe(0);
    expect(monthlyRecord.cost).toBe(0);
    expect(monthlyRecord.rate).toBe(90);
    expect(monthlyRepo.save).toHaveBeenCalledWith(monthlyRecord);
    const stockUpdate = queryBuilder.set.mock.calls[0][0] as {
      stock: () => string;
    };
    expect(stockUpdate.stock()).toBe('COALESCE(stock, 0) + -10');
  });

  it('updates monthly procurement when stock is edited through the single-flavor endpoint', async () => {
    monthlyRecord.quantity = 4;
    monthlyRecord.cost = 360;

    await service.update(1, { stock: 12 });

    expect(monthlyRecord.quantity).toBe(6);
    expect(monthlyRecord.cost).toBe(540);
    expect(monthlyRepo.save).toHaveBeenCalledWith(monthlyRecord);
  });
});
