import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseId } from '../../common/utils/parse-id';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

const DEFAULT_EXPENSE_SEED: CreateExpenseDto[] = [
  { description: 'Dustbin Covers', amount: 215, spoc: 'Sai', expenseDate: '2026-06-01' },
  { description: 'Dmart (Tissues,Book,Pens)', amount: 354, spoc: 'Sai', expenseDate: '2026-06-01' },
  { description: 'Garbage Covers via Amazon', amount: 583, spoc: 'Sai', expenseDate: '2026-06-01' },
  { description: 'Ice Cubes', amount: 245, spoc: 'Sai', expenseDate: '2026-06-01' },
  { description: 'Parcel Covers', amount: 180, spoc: 'Sai', expenseDate: '2026-06-01' },
  { description: 'Employee Salary for 2 Days', amount: 800, spoc: 'Sai', expenseDate: '2026-06-01' },
  { description: '1,2,5,10 Rupee Coins', amount: 1000, spoc: 'Sai', expenseDate: '2026-06-01' },
  { description: 'Dmart (Tissues,Lyzol,Pens)', amount: 902, spoc: 'Sai', expenseDate: '2026-06-01' },
  { description: 'Plastic Mat', amount: 260, spoc: 'Sai', expenseDate: '2026-06-01' },
  { description: 'Water Bottles', amount: 200, spoc: 'Sai', expenseDate: '2026-06-01' },
  { description: 'Nostic Sai March Salary', amount: 3200, spoc: 'Sai', expenseDate: '2026-03-01' },
  {
    description: 'Nostic Sai April Advance Salary',
    amount: 10000,
    spoc: 'Sai',
    expenseDate: '2026-04-01',
  },
];

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expensesRepo: Repository<Expense>,
  ) {}

  async create(data: CreateExpenseDto) {
    const expense = this.expensesRepo.create({
      description: data.description.trim(),
      amount: Number(data.amount),
      spoc: data.spoc.trim(),
      expenseDate: data.expenseDate
        ? new Date(data.expenseDate)
        : new Date(),
    });
    return this.expensesRepo.save(expense);
  }

  async findAll() {
    return this.expensesRepo.find({
      order: { expenseDate: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number | string) {
    const parsedId = parseId(id);
    const expense = await this.expensesRepo.findOne({
      where: { id: parsedId },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async update(id: number | string, data: UpdateExpenseDto) {
    const expense = await this.findOne(id);
    if (data.description != null) {
      expense.description = data.description.trim();
    }
    if (data.amount != null) {
      expense.amount = Number(data.amount);
    }
    if (data.spoc != null) {
      expense.spoc = data.spoc.trim();
    }
    if (data.expenseDate != null) {
      expense.expenseDate = new Date(data.expenseDate);
    }
    return this.expensesRepo.save(expense);
  }

  async remove(id: number | string) {
    const expense = await this.findOne(id);
    await this.expensesRepo.remove(expense);
    return { deleted: true };
  }

  async seedDefaults() {
    let inserted = 0;
    for (const row of DEFAULT_EXPENSE_SEED) {
      const exists = await this.expensesRepo.findOne({
        where: {
          description: row.description,
          amount: row.amount,
        },
      });
      if (!exists) {
        await this.create(row);
        inserted += 1;
      }
    }
    return { inserted, total: await this.expensesRepo.count() };
  }
}
