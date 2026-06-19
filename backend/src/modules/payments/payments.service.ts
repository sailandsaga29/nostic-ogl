import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PhonePeService } from './phonepe.service';
import { OrdersService } from '../orders/orders.service';
import { PartyOrdersService } from '../party-orders/party-orders.service';
import { OrderStatus } from '../orders/entities/order.entity';

const SUCCESS_CODES = new Set(['PAYMENT_SUCCESS', 'SUCCESS']);
const FAILED_CODES = new Set([
  'PAYMENT_ERROR',
  'PAYMENT_DECLINED',
  'REQUEST_EXPIRED',
  'TRANSACTION_EXPIRED',
]);
const PENDING_CODES = new Set(['PAYMENT_PENDING', 'PENDING']);

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    private readonly phonePeService: PhonePeService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => PartyOrdersService))
    private readonly partyOrdersService: PartyOrdersService,
  ) {}

  async initPhonePeQr(orderId: number | string) {
    const order = await this.ordersService.findOne(orderId);
    const parsedOrderId = order.id;

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not awaiting payment');
    }

    const existingPending = await this.paymentsRepo.findOne({
      where: { orderId: parsedOrderId, status: PaymentStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    if (
      existingPending?.qrString &&
      existingPending.expiresAt &&
      existingPending.expiresAt.getTime() > Date.now()
    ) {
      return this.toInitResponse(existingPending, this.phonePeService.isMockMode());
    }

    const amountPaise = Math.round(Number(order.total) * 100);
    if (amountPaise < 100) {
      throw new BadRequestException('Order amount must be at least ₹1');
    }

    const merchantTransactionId =
      this.phonePeService.buildTransactionId(parsedOrderId);
    const qr = await this.phonePeService.createDynamicQr({
      transactionId: merchantTransactionId,
      amountPaise,
      merchantOrderId: String(parsedOrderId),
      message: order.note || `Order ${parsedOrderId}`,
    });

    const expiresAt = new Date(Date.now() + qr.expiresIn * 1000);
    const payment = await this.paymentsRepo.save(
      this.paymentsRepo.create({
        orderId: parsedOrderId,
        order,
        merchantTransactionId,
        amountPaise,
        status: PaymentStatus.PENDING,
        qrString: qr.qrString,
        expiresAt,
      }),
    );

    return this.toInitResponse(payment, qr.mockMode);
  }

  async initPhonePeQrForPartyOrder(partyOrderId: number | string) {
    const partyOrder = await this.partyOrdersService.findOne(partyOrderId);
    const parsedPartyOrderId = partyOrder.id;

    if (partyOrder.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Party order is not awaiting payment');
    }

    const existingPending = await this.paymentsRepo.findOne({
      where: {
        partyOrderId: parsedPartyOrderId,
        status: PaymentStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (
      existingPending?.qrString &&
      existingPending.expiresAt &&
      existingPending.expiresAt.getTime() > Date.now()
    ) {
      return this.toInitResponse(existingPending, this.phonePeService.isMockMode());
    }

    const amountPaise = Math.round(
      Number(partyOrder.amountAfterDiscount) * 100,
    );
    if (amountPaise < 100) {
      throw new BadRequestException('Order amount must be at least ₹1');
    }

    const merchantTransactionId = this.phonePeService.buildTransactionId(
      `P${parsedPartyOrderId}`,
    );
    const qr = await this.phonePeService.createDynamicQr({
      transactionId: merchantTransactionId,
      amountPaise,
      merchantOrderId: `P${parsedPartyOrderId}`,
      message: partyOrder.note || `Bulk order ${parsedPartyOrderId}`,
    });

    const expiresAt = new Date(Date.now() + qr.expiresIn * 1000);
    const payment = await this.paymentsRepo.save(
      this.paymentsRepo.create({
        partyOrderId: parsedPartyOrderId,
        partyOrder,
        merchantTransactionId,
        amountPaise,
        status: PaymentStatus.PENDING,
        qrString: qr.qrString,
        expiresAt,
      }),
    );

    return this.toInitResponse(payment, qr.mockMode);
  }

  async simulateMockPayment(
    merchantTransactionId: string,
    outcome: 'success' | 'failed',
  ) {
    if (!this.phonePeService.isMockMode()) {
      throw new BadRequestException('Mock payments are disabled');
    }

    const payment = await this.findPaymentByTransactionId(merchantTransactionId);

    const remote = this.phonePeService.simulateMockPayment(
      merchantTransactionId,
      outcome,
    );

    if (!remote) {
      throw new BadRequestException('Unable to simulate mock payment');
    }

    return this.applyPhonePeResult(payment, remote.code, remote.message, remote.data);
  }

  async getPhonePeStatus(merchantTransactionId: string) {
    const payment = await this.findPaymentByTransactionId(merchantTransactionId);

    if (payment.status === PaymentStatus.SUCCESS) {
      return this.toStatusResponse(payment, 'SUCCESS');
    }

    if (
      payment.status === PaymentStatus.FAILED ||
      payment.status === PaymentStatus.EXPIRED
    ) {
      return this.toStatusResponse(payment, payment.status);
    }

    if (payment.expiresAt && payment.expiresAt.getTime() <= Date.now()) {
      payment.status = PaymentStatus.EXPIRED;
      await this.paymentsRepo.save(payment);
      await this.markLinkedOrderFailed(payment);
      return this.toStatusResponse(payment, 'EXPIRED');
    }

    const remote = await this.phonePeService.checkTransactionStatus(
      merchantTransactionId,
    );

    return this.applyPhonePeResult(payment, remote.code, remote.message, remote.data);
  }

  async handlePhonePeCallback(rawBody: { response?: string }, xVerify?: string) {
    if (!rawBody.response) {
      throw new BadRequestException('Missing callback response');
    }

    if (!this.phonePeService.verifyCallbackSignature(rawBody.response, xVerify)) {
      throw new BadRequestException('Invalid PhonePe callback signature');
    }

    const decoded = this.phonePeService.decodeCallbackResponse(rawBody.response);
    const transactionId = decoded.data?.transactionId;

    if (!transactionId) {
      throw new BadRequestException('Missing transaction id in callback');
    }

    const payment = await this.findPaymentByTransactionId(transactionId);

    await this.applyPhonePeResult(
      payment,
      decoded.code,
      decoded.message,
      decoded.data,
    );

    return { received: true };
  }

  private async findPaymentByTransactionId(merchantTransactionId: string) {
    const payment = await this.paymentsRepo.findOne({
      where: { merchantTransactionId },
      relations: { order: true, partyOrder: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  private async markLinkedOrderFailed(payment: Payment) {
    if (payment.partyOrderId) {
      await this.partyOrdersService.markPaymentFailed(payment.partyOrderId);
      return;
    }
    if (payment.orderId) {
      await this.ordersService.markPaymentFailed(payment.orderId);
    }
  }

  private async fulfillLinkedOrder(payment: Payment) {
    if (payment.partyOrderId) {
      await this.partyOrdersService.fulfillPartyOrder(payment.partyOrderId);
      return;
    }
    if (payment.orderId) {
      await this.ordersService.fulfillOrder(payment.orderId);
    }
  }

  private async applyPhonePeResult(
    payment: Payment,
    code?: string,
    message?: string,
    data?: Record<string, unknown>,
  ) {
    payment.phonepeCode = code;
    payment.phonepeMessage = message;

    if (typeof data?.providerReferenceId === 'string') {
      payment.phonepeReferenceId = data.providerReferenceId;
    }

    if (code && SUCCESS_CODES.has(code)) {
      payment.status = PaymentStatus.SUCCESS;
      await this.paymentsRepo.save(payment);
      await this.fulfillLinkedOrder(payment);
      return this.toStatusResponse(payment, 'SUCCESS');
    }

    if (code && FAILED_CODES.has(code)) {
      payment.status =
        code === 'REQUEST_EXPIRED' || code === 'TRANSACTION_EXPIRED'
          ? PaymentStatus.EXPIRED
          : PaymentStatus.FAILED;
      await this.paymentsRepo.save(payment);
      await this.markLinkedOrderFailed(payment);
      return this.toStatusResponse(
        payment,
        payment.status === PaymentStatus.EXPIRED ? 'EXPIRED' : 'FAILED',
      );
    }

    if (code && PENDING_CODES.has(code)) {
      await this.paymentsRepo.save(payment);
      return this.toStatusResponse(payment, 'PENDING');
    }

    await this.paymentsRepo.save(payment);
    return this.toStatusResponse(payment, 'PENDING');
  }

  private toInitResponse(payment: Payment, mockMode = false) {
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      partyOrderId: payment.partyOrderId,
      merchantTransactionId: payment.merchantTransactionId,
      qrString: payment.qrString,
      amount: Number(payment.amountPaise) / 100,
      amountPaise: Number(payment.amountPaise),
      expiresAt: payment.expiresAt,
      status: payment.status,
      mockMode,
    };
  }

  private toStatusResponse(payment: Payment, status: string) {
    const linkedStatus =
      payment.partyOrder?.status ?? payment.order?.status ?? undefined;

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      partyOrderId: payment.partyOrderId,
      merchantTransactionId: payment.merchantTransactionId,
      status,
      amount: Number(payment.amountPaise) / 100,
      phonepeCode: payment.phonepeCode,
      message: payment.phonepeMessage,
      orderStatus: linkedStatus,
    };
  }
}
