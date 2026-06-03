import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('flavors')
export class Flavor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, nullable: true })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  category!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'double precision', default: 0 })
  price!: number;

  @Column({ type: 'double precision', default: 0 })
  stock!: number;

  @Column({ type: 'double precision', default: 10 })
  minStock!: number;

  @Column({ nullable: true })
  image?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isSeasonal!: boolean;

  @Column({ default: 0 })
  popularity!: number;

  @Column({ type: 'double precision', default: 0 })
  reservedQty!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
