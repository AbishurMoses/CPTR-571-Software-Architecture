import { IsInt, IsOptional, IsString, IsStrongPassword, Matches, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {
    @MaxLength(50)
    @MinLength(2)
    @IsString()
    username!: string;

    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    @Matches(/\d/, { message: 'Password must contain at least one number' })
    @IsString()
    password!: string;

    @IsInt()
    @IsOptional()
    role?: number;
}
