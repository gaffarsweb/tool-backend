import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResendVerificationDto {
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email!: string;
}
