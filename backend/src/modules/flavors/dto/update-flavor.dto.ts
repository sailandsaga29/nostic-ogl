import { PartialType } from '@nestjs/mapped-types';
import { CreateFlavorDto } from './create-flavor.dto';

export class UpdateFlavorDto extends PartialType(CreateFlavorDto) {}
