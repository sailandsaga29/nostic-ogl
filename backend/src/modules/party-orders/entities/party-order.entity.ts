import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { PaymentMethod, OrderStatus } from '../../orders/entities/order.entity';

export type PartyOrderLineItem = {
  flavorId: number;
  quantity: number;
  flavorName: string;
  unitPrice: number;
};

@Entity('party_orders')
export class PartyOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  partyName!: string;

  @Column({ type: 'double precision' })
  totalAmount!: number;

  @Column({ type: 'double precision', default: 0 })
  discountPercent!: number;

  @Column({ type: 'double precision' })
  amountAfterDiscount!: number;

  @Column({ type: 'double precision' })
  totalEarnings!: number;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.COMPLETED })
  status!: OrderStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ nullable: true })
  userId?: number;

  @Column({ nullable: true, type: 'text' })
  note?: string;

  @Column({ type: 'jsonb', nullable: true })
  lineItems?: PartyOrderLineItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
