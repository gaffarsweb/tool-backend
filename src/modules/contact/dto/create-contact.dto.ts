import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  subject?: string;

  @IsString()
  @MinLength(10, { message: 'Message is too short' })
  @MaxLength(5000)
  @Transform(({ value }: { value: string }) => value?.trim())
  message!: string;

  // Honeypot — if filled, treated as spam
  @IsOptional()
  @IsString()
  @MaxLength(0, { message: 'Invalid submission' })
  website?: string;
}
