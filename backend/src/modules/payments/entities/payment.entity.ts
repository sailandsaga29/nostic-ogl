import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { PartyOrder } from '../../party-orders/entities/party-order.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ nullable: true })
  orderId?: number;

  @ManyToOne(() => PartyOrder, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'partyOrderId' })
  partyOrder?: PartyOrder;

  @Column({ nullable: true })
  partyOrderId?: number;

  @Column({ unique: true })
  merchantTransactionId!: string;

  @Column({ nullable: true })
  phonepeReferenceId?: string;

  @Column({ type: 'double precision' })
  amountPaise!: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ nullable: true, type: 'text' })
  qrString?: string;

  @Column({ nullable: true, type: 'timestamptz' })
  expiresAt?: Date;

  @Column({ nullable: true })
  phonepeCode?: string;

  @Column({ nullable: true, type: 'text' })
  phonepeMessage?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
