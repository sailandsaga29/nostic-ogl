import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitPhonePePaymentDto } from './dto/init-phonepe-payment.dto';
import { SimulateMockPaymentDto } from './dto/simulate-mock-payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments/phonepe')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('init')
  @ApiBearerAuth('Authorization')
  @UseGuards(JwtAuthGuard)
  init(@Body() body: InitPhonePePaymentDto) {
    return this.paymentsService.initPhonePeQr(body.orderId);
  }

  @Get('status/:merchantTransactionId')
  @ApiBearerAuth('Authorization')
  @UseGuards(JwtAuthGuard)
  status(@Param('merchantTransactionId') merchantTransactionId: string) {
    return this.paymentsService.getPhonePeStatus(merchantTransactionId);
  }

  @Post('mock/simulate')
  @ApiBearerAuth('Authorization')
  @UseGuards(JwtAuthGuard)
  simulateMock(@Body() body: SimulateMockPaymentDto) {
    return this.paymentsService.simulateMockPayment(
      body.merchantTransactionId,
      body.outcome,
    );
  }

  @Post('callback')
  callback(
    @Body() body: { response?: string },
    @Headers('x-verify') xVerify?: string,
  ) {
    return this.paymentsService.handlePhonePeCallback(body, xVerify);
  }
}
