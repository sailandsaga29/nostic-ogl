import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MockPaymentRecord = {
  transactionId: string;
  amountPaise: number;
  merchantOrderId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  createdAt: number;
  expiresAt: number;
  autoPayAt?: number;
};

@Injectable()
export class PhonePeMockStore {
  private readonly payments = new Map<string, MockPaymentRecord>();

  constructor(private readonly config: ConfigService) {}

  get autoPaySeconds(): number {
    return Number(this.config.get<string>('PHONEPE_MOCK_AUTO_PAY_SECONDS', '0'));
  }

  create(input: {
    transactionId: string;
    amountPaise: number;
    merchantOrderId: string;
    expiresIn: number;
  }) {
    const autoPay = this.autoPaySeconds;
    const record: MockPaymentRecord = {
      transactionId: input.transactionId,
      amountPaise: input.amountPaise,
      merchantOrderId: input.merchantOrderId,
      status: 'PENDING',
      createdAt: Date.now(),
      expiresAt: Date.now() + input.expiresIn * 1000,
      autoPayAt: autoPay > 0 ? Date.now() + autoPay * 1000 : undefined,
    };
    this.payments.set(input.transactionId, record);
  }

  buildQrString(input: {
    transactionId: string;
    amountPaise: number;
    merchantOrderId: string;
  }) {
    const amount = (input.amountPaise / 100).toFixed(2);
    return `upi://pay?pa=mock@phonepe&pn=Nistic+Ice+Cream&am=${amount}&tn=Order+${input.merchantOrderId}&tr=${input.transactionId}`;
  }

  resolveStatus(transactionId: string) {
    const record = this.payments.get(transactionId);
    if (!record) {
      return { success: false, code: 'PAYMENT_ERROR', message: 'Transaction not found' };
    }

    if (record.expiresAt <= Date.now() && record.status === 'PENDING') {
      record.status = 'EXPIRED';
      this.payments.set(transactionId, record);
    }

    if (
      record.status === 'PENDING' &&
      record.autoPayAt &&
      Date.now() >= record.autoPayAt
    ) {
      record.status = 'SUCCESS';
      this.payments.set(transactionId, record);
    }

    const codeMap = {
      PENDING: 'PAYMENT_PENDING',
      SUCCESS: 'PAYMENT_SUCCESS',
      FAILED: 'PAYMENT_ERROR',
      EXPIRED: 'TRANSACTION_EXPIRED',
    } as const;

    return {
      success: record.status === 'SUCCESS',
      code: codeMap[record.status],
      message: `Mock payment ${record.status.toLowerCase()}`,
      data: {
        transactionId: record.transactionId,
        providerReferenceId: `MOCK-${record.transactionId}`,
      },
    };
  }

  markSuccess(transactionId: string) {
    const record = this.payments.get(transactionId);
    if (record) {
      record.status = 'SUCCESS';
      this.payments.set(transactionId, record);
    }
  }

  markFailed(transactionId: string) {
    const record = this.payments.get(transactionId);
    if (record) {
      record.status = 'FAILED';
      this.payments.set(transactionId, record);
    }
  }
}
