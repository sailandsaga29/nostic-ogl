import { IsInt, IsPositive } from 'class-validator';

export class InitPhonePePaymentDto {
  @IsInt()
  @IsPositive()
  orderId!: number;
}
