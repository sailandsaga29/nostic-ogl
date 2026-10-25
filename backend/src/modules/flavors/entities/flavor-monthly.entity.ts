import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Flavor } from './flavor.entity';

@Entity('flavor_monthly')
@Index('uq_flavor_monthly_flavor_year_month', ['flavorId', 'year', 'month'], {
  unique: true,
})
export class FlavorMonthly {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Flavor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flavorId' })
  flavor!: Flavor;

  @Column()
  flavorId!: number;

  @Column({ type: 'int' })
  month!: number;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'float', default: 0 })
  carryForwarded!: number;

  @Column({ type: 'float', default: 0 })
  quantity!: number;

  @Column({ type: 'float', default: 0 })
  rate!: number;

  @Column({ type: 'float', default: 0 })
  cost!: number;

  @Column({ nullable: true })
  category?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
