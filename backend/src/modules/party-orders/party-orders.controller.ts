import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PartyOrdersService } from './party-orders.service';
import { CreatePartyOrderDto } from './dto/create-party-order.dto';
import { ListPartyOrdersQueryDto } from './dto/list-party-orders-query.dto';

@ApiTags('Party Orders')
@ApiBearerAuth('Authorization')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('party-orders')
export class PartyOrdersController {
  constructor(private readonly partyOrdersService: PartyOrdersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiBody({ type: CreatePartyOrderDto })
  create(@Body() body: CreatePartyOrderDto) {
    return this.partyOrdersService.create(body);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.STAFF)
  list(@Query() query: ListPartyOrdersQueryDto) {
    return this.partyOrdersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.STAFF)
  get(@Param('id') id: string) {
    return this.partyOrdersService.findOne(id);
  }
}
