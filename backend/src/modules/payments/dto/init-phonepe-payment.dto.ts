import { IsUUID } from 'class-validator';

export class InitPhonePePaymentDto {
  @IsUUID()
  orderId!: string;
}
