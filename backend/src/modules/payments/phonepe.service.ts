import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import axios from 'axios';
import { PhonePeMockStore } from './phonepe-mock.store';

type DqrInitPayload = {
  merchantId: string;
  storeId: string;
  transactionId: string;
  amount: number;
  expiresIn: number;
  merchantOrderId: string;
  terminalId?: string;
  message?: string;
};

type PhonePeApiResponse<T> = {
  success: boolean;
  code: string;
  message: string;
  data?: T;
};

@Injectable()
export class PhonePeService {
  constructor(
    private readonly config: ConfigService,
    private readonly mockStore: PhonePeMockStore,
  ) {}

  isMockMode(): boolean {
    const forced = this.config.get<string>('PHONEPE_MOCK_MODE', '').toLowerCase();
    if (forced === 'true' || forced === '1') return true;
    if (forced === 'false' || forced === '0') return false;

    return !this.merchantId || !this.saltKey;
  }

  private get baseUrl(): string {
    const env = this.config.get<string>('PHONEPE_ENV', 'sandbox');
    if (this.config.get<string>('PHONEPE_BASE_URL')) {
      return this.config.get<string>('PHONEPE_BASE_URL')!;
    }
    return env === 'production'
      ? 'https://mercury-t2.phonepe.com'
      : 'https://mercury-uat.phonepe.com/enterprise-sandbox';
  }

  private get merchantId(): string {
    return this.config.get<string>('PHONEPE_MERCHANT_ID', '');
  }

  private get saltKey(): string {
    return this.config.get<string>('PHONEPE_SALT_KEY', '');
  }

  private get saltIndex(): string {
    return this.config.get<string>('PHONEPE_SALT_INDEX', '1');
  }

  private get storeId(): string {
    return this.config.get<string>('PHONEPE_STORE_ID', 'STORE001');
  }

  private get terminalId(): string | undefined {
    return this.config.get<string>('PHONEPE_TERMINAL_ID');
  }

  private get providerId(): string | undefined {
    return this.config.get<string>('PHONEPE_PROVIDER_ID');
  }

  private get callbackUrl(): string | undefined {
    return this.config.get<string>('PHONEPE_CALLBACK_URL');
  }

  private get qrExpiresIn(): number {
    return Number(this.config.get<string>('PHONEPE_QR_EXPIRES_IN', '300'));
  }

  assertConfigured() {
    if (this.isMockMode()) return;

    if (!this.merchantId || !this.saltKey) {
      throw new InternalServerErrorException(
        'PhonePe credentials are not configured on the server',
      );
    }
  }

  buildTransactionId(orderId: number | string): string {
    const compact = String(orderId).replace(/-/g, '').slice(0, 8);
    const suffix = Date.now().toString(36);
    return `TX${compact}${suffix}`.slice(0, 34);
  }

  private buildVerify(path: string, payloadBase64?: string): string {
    const input = `${payloadBase64 ?? ''}${path}${this.saltKey}`;
    return `${createHash('sha256').update(input).digest('hex')}###${this.saltIndex}`;
  }

  verifyCallbackSignature(responseBody: string, xVerify?: string): boolean {
    if (this.isMockMode()) return true;
    if (!xVerify) return false;
    const expected = `${createHash('sha256').update(`${responseBody}${this.saltKey}`).digest('hex')}###${this.saltIndex}`;
    return expected === xVerify;
  }

  decodeCallbackResponse(responseBase64: string) {
    const decoded = Buffer.from(responseBase64, 'base64').toString('utf8');
    return JSON.parse(decoded) as {
      success?: boolean;
      code?: string;
      message?: string;
      data?: {
        transactionId?: string;
        merchantId?: string;
        amount?: number;
        providerReferenceId?: string;
        paymentState?: string;
      };
    };
  }

  async createDynamicQr(input: {
    transactionId: string;
    amountPaise: number;
    merchantOrderId: string;
    message?: string;
  }) {
    if (this.isMockMode()) {
      this.mockStore.create({
        transactionId: input.transactionId,
        amountPaise: input.amountPaise,
        merchantOrderId: input.merchantOrderId,
        expiresIn: this.qrExpiresIn,
      });

      return {
        qrString: this.mockStore.buildQrString(input),
        expiresIn: this.qrExpiresIn,
        mockMode: true,
      };
    }

    this.assertConfigured();

    const payload: DqrInitPayload = {
      merchantId: this.merchantId,
      storeId: this.storeId,
      transactionId: input.transactionId,
      amount: input.amountPaise,
      expiresIn: this.qrExpiresIn,
      merchantOrderId: input.merchantOrderId,
      message: input.message ?? `Payment for order ${input.merchantOrderId}`,
    };

    if (this.terminalId) {
      payload.terminalId = this.terminalId;
    }

    const path = '/v3/qr/init';
    const requestBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-VERIFY': this.buildVerify(path, requestBase64),
      'X-CALL-MODE': 'POST',
    };

    if (this.callbackUrl) {
      headers['X-CALLBACK-URL'] = this.callbackUrl;
    }
    if (this.providerId) {
      headers['X-PROVIDER-ID'] = this.providerId;
    }

    const response = await axios.post<PhonePeApiResponse<{ qrString: string }>>(
      `${this.baseUrl}${path}`,
      { request: requestBase64 },
      { headers },
    );

    const body = response.data;
    if (!body.success || !body.data?.qrString) {
      throw new InternalServerErrorException(
        body.message || 'PhonePe failed to generate QR code',
      );
    }

    return {
      qrString: body.data.qrString,
      expiresIn: this.qrExpiresIn,
      mockMode: false,
    };
  }

  async checkTransactionStatus(transactionId: string) {
    if (this.isMockMode()) {
      return this.mockStore.resolveStatus(transactionId);
    }

    this.assertConfigured();

    const path = `/v3/transaction/${this.merchantId}/${transactionId}/status`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-VERIFY': this.buildVerify(path),
    };

    if (this.providerId) {
      headers['X-PROVIDER-ID'] = this.providerId;
    }

    const response = await axios.get<PhonePeApiResponse<Record<string, unknown>>>(
      `${this.baseUrl}${path}`,
      { headers },
    );

    return response.data;
  }

  simulateMockPayment(
    transactionId: string,
    outcome: 'success' | 'failed',
  ) {
    if (!this.isMockMode()) {
      return null;
    }

    if (outcome === 'success') {
      this.mockStore.markSuccess(transactionId);
    } else {
      this.mockStore.markFailed(transactionId);
    }

    return this.mockStore.resolveStatus(transactionId);
  }
}
