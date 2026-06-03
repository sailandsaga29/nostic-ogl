import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Flavor } from '../../flavors/entities/flavor.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column()
  orderId!: number;

  @ManyToOne(() => Flavor)
  @JoinColumn({ name: 'flavorId' })
  flavor!: Flavor;

  @Column()
  flavorId!: number;

  @Column({ type: 'double precision', default: 0 })
  quantity!: number;

  @Column({ type: 'double precision', default: 0 })
  unitPrice!: number;

  @Column({ type: 'double precision', default: 0 })
  totalPrice!: number;
}
