import { IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(32, 256)
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[A-Z]/)
  @Matches(/[a-z]/)
  @Matches(/[0-9]/)
  password!: string;
}
