import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Patch,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { FlavorsService } from './flavors.service';
import { CreateFlavorDto } from './dto/create-flavor.dto';
import { UpdateFlavorDto } from './dto/update-flavor.dto';
import { BulkUpdateFlavorsDto } from './dto/bulk-update-flavors.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('flavors')
@ApiTags('Flavors')
@ApiBearerAuth('Authorization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FlavorsController {
  constructor(private readonly flavorsService: FlavorsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiBody({
    description: 'Create flavor payload',
    type: CreateFlavorDto,
    examples: {
      default: {
        summary: 'Sample flavor',
        value: {
          name: 'Mango Sorbet',
          category: 'Sorbet',
          description: 'Refreshing mango sorbet',
          price: 120,
          stock: 50,
          minStock: 10,
          image: 'https://example.com/images/mango.png',
          isActive: true,
          isSeasonal: false,
        },
      },
    },
  })
  create(@Body() body: CreateFlavorDto) {
    return this.flavorsService.create(body);
  }

  @Get()
  findAll() {
    return this.flavorsService.findAll();
  }

  @Get('available')
  available() {
    return this.flavorsService.getAvailable();
  }

  @Get('active')
  active() {
    return this.flavorsService.getActive();
  }

  @Get('low-stock')
  lowStock() {
    return this.flavorsService.getLowStock();
  }

  @Get('meta/years')
  getAvailableYears() {
    return this.flavorsService.getAvailableYears();
  }

  @Get('meta/months/:year')
  getMonthsByYear(@Param('year') year: string) {
    return this.flavorsService.getMonthsByYear(Number(year));
  }

  @Get('procurement/total')
  getProcurementTotal() {
    return this.flavorsService.getProcurementTotalAllTime();
  }

  @Get('procurement/:year/:month')
  getProcurementForMonth(
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.flavorsService.getProcurementTotalForPeriod(
      Number(year),
      Number(month),
    );
  }

  @Get('procurement/:year')
  getProcurementForYear(@Param('year') year: string) {
    return this.flavorsService.getProcurementTotalForPeriod(Number(year));
  }

  @Get('monthly/:year/:month')
  getMonthlyByYearMonth(@Param('year') year: string, @Param('month') month: string) {
    return this.flavorsService.getMonthlyStats(Number(year), Number(month));
  }

  @Put('bulk-update')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiBody({
    description: 'Bulk update flavor payloads',
    type: BulkUpdateFlavorsDto,
    examples: {
      default: {
        summary: 'Update multiple flavors',
        value: {
          items: [
            { id: 1, name: 'Mango Delight', category: 'Popsicles', price: 130, stock: 20 },
          ],
        },
      },
    },
  })
  bulkUpdate(@Body() body: BulkUpdateFlavorsDto) {
    return this.flavorsService.bulkUpdate(body.items);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flavorsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiBody({
    description: 'Update flavor payload (partial allowed)',
    type: UpdateFlavorDto,
    examples: {
      default: {
        summary: 'Update name/price',
        value: { name: 'Mango Delight', price: 130 },
      },
    },
  })
  update(@Param('id') id: string, @Body() body: UpdateFlavorDto) {
    return this.flavorsService.update(id, body);
  }

  @Patch(':id/stock')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiBody({
    description: 'Adjust stock change (positive to add, negative to remove)',
    schema: {
      example: { change: 5 },
      properties: {
        change: { type: 'number' },
        stock: { type: 'number' },
      },
    },
  })
  adjustStock(
    @Param('id') id: string,
    @Body() body: { change?: number; stock?: number },
  ) {
    if (typeof body.change === 'number') {
      return this.flavorsService.adjustStock(id, body.change);
    }

    if (typeof body.stock === 'number') {
      return this.flavorsService.update(id, { stock: body.stock });
    }

    throw new BadRequestException('Missing stock change');
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.flavorsService.remove(id);
  }
}
