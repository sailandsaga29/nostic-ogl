import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
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
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Flavor)
  flavor!: Flavor;

  @Column({ type: 'double precision' })
  change!: number;

  @Column({ type: 'enum', enum: InventoryChangeType })
  type!: InventoryChangeType;

  @Column({ nullable: true, type: 'text' })
  reason?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
