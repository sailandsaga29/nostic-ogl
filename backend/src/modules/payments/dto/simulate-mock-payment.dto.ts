import { IsIn, IsString } from 'class-validator';

export class SimulateMockPaymentDto {
  @IsString()
  merchantTransactionId!: string;

  @IsIn(['success', 'failed'])
  outcome!: 'success' | 'failed';
}
