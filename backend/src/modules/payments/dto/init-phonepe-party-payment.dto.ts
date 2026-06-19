import { IsInt, IsPositive } from 'class-validator';

export class InitPhonePePartyPaymentDto {
  @IsInt()
  @IsPositive()
  partyOrderId!: number;
}
