import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  description!: string;

  @Column({ type: 'double precision' })
  amount!: number;

  @Column({ type: 'varchar' })
  spoc!: string;

  @Column({ type: 'date' })
  expenseDate!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
