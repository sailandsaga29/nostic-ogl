import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Flavor } from './flavor.entity';

@Entity('flavor_monthly')
export class FlavorMonthly {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Flavor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flavorId' })
  flavor: Flavor;

  @Column()
  flavorId: string;

  @Column({ type: 'int' })
  month: number; // 1-12

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'float', default: 0 })
  quantity: number;

  @Column({ type: 'float', default: 0 })
  rate: number;

  @Column({ type: 'float', default: 0 })
  cost: number;

  @Column({ nullable: true })
  category?: string;

  @CreateDateColumn()
  createdAt: Date;
}
