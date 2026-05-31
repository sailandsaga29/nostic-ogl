import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Order } from './order.entity';
import { Flavor } from '../../flavors/entities/flavor.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order!: Order;

  @ManyToOne(() => Flavor)
  flavor!: Flavor;

  @Column({ type: 'double precision', default: 0 })
  quantity!: number;

  @Column({ type: 'double precision', default: 0 })
  unitPrice!: number;

  @Column({ type: 'double precision', default: 0 })
  totalPrice!: number;
}
