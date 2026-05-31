import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flavor } from './entities/flavor.entity';
import { FlavorsService } from './flavors.service';
import { FlavorsController } from './flavors.controller';
import { FlavorMonthly } from './entities/flavor-monthly.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Flavor, FlavorMonthly])],
  providers: [FlavorsService],
  controllers: [FlavorsController],
  exports: [FlavorsService],
})
export class FlavorsModule {}
