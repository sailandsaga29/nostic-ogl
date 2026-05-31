import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
@ApiTags('Orders')
@ApiBearerAuth('Authorization')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiBody({
    description: 'Create order payload',
    type: CreateOrderDto,
    examples: {
      default: {
        summary: 'Sample order',
        value: {
          userId: 'u123',
          note: 'No nuts',
          items: [
            { flavorId: 'b2d8f3a0-1c2b-4a7d-9f3e-8b9c0d1e2f3a', quantity: 2 },
            { flavorId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', quantity: 1 },
          ],
        },
      },
    },
  })
  create(@Body() body: CreateOrderDto) {
    return this.ordersService.create(body);
  }

  @Get()
  list() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiBody({
    description: 'Update order status',
    type: UpdateOrderStatusDto,
    examples: { default: { value: { status: 'CANCELLED' } } },
  })
  updateStatus(@Param('id') id: string, @Body() body: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, body.status);
  }
}
