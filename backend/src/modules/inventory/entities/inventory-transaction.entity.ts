import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Flavor } from '../../flavors/entities/flavor.entity';

export enum InventoryChangeType {
  SALE = 'SALE',
  RESTOCK = 'RESTOCK',
  ADJUSTMENT = 'ADJUSTMENT',
  RESERVATION = 'RESERVATION',
  RELEASE = 'RELEASE',
}

@Entity('inventory_transactions')
export class InventoryTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Flavor)
  @JoinColumn({ name: 'flavorId' })
  flavor!: Flavor;

  @Column()
  flavorId!: number;

  @Column({ type: 'double precision' })
  change!: number;

  @Column({ type: 'enum', enum: InventoryChangeType })
  type!: InventoryChangeType;

  @Column({ nullable: true, type: 'text' })
  reason?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
