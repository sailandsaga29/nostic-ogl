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
import { PaymentMethod } from '../../orders/entities/order.entity';

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

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ nullable: true })
  userId?: number;

  @Column({ nullable: true, type: 'text' })
  note?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
