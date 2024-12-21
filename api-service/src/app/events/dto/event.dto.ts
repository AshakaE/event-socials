import { EventCategory } from '@event-socials/database';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsDateString,
  MinLength,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class PaginationArgs {
  @IsNumber()
  @ApiProperty({ type: 'number' })
  offset = 0;

  @IsNumber()
  @Min(1)
  @Max(50)
  @ApiProperty({ type: 'number' })
  limit = 20;
}

export class CreateEventDto {
  @IsString()
  @MinLength(3)
  @ApiProperty()
  title: string;

  @IsString()
  @MinLength(10)
  @ApiProperty()
  description: string;

  @IsDateString()
  @ApiProperty()
  date: string;

  @IsEnum(EventCategory)
  @ApiProperty({
    enum: [
      EventCategory.CYBERSECURITY,
      EventCategory.SOFTWARE_ENGINEERING,
      EventCategory.DEVOPS,
    ],
  })
  category: EventCategory;
}

export class EventFilterDto extends PaginationArgs {
  @IsDateString()
  @ApiProperty()
  startDate?: string;

  @IsDateString()
  @ApiProperty()
  endDate?: string;

  @IsEnum(EventCategory)
  @ApiProperty({
    enum: [
      EventCategory.CYBERSECURITY,
      EventCategory.SOFTWARE_ENGINEERING,
      EventCategory.DEVOPS,
    ],
  })
  category?: EventCategory;
}
