import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryChangeType } from './entities/inventory-transaction.entity';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Inventory')
@ApiBearerAuth('Authorization')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('transactions')
  transactions() {
    return this.inventory.listTransactions();
  }

  @Get('transactions/:flavorId')
  transactionsFor(@Param('flavorId') flavorId: string) {
    return this.inventory.forFlavor(flavorId);
  }

  @Post('adjust')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiBody({ description: 'Adjust inventory for a flavor', type: AdjustInventoryDto, examples: { default: { value: { flavorId: 'b2d8f3a0-1c2b-4a7d-9f3e-8b9c0d1e2f3a', change: -5, reason: 'Sold 5 scoops' } } } })
  adjust(@Body() body: AdjustInventoryDto) {
    const type = body.type || InventoryChangeType.ADJUSTMENT;
    return this.inventory.adjust(body.flavorId, body.change, type, body.reason);
  }
}
