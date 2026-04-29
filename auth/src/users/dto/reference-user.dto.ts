import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsStrongPassword, Matches, MaxLength, Min, MinLength } from "class-validator";

export class ReferenceUserDto {
    @Type(() => Number)
    @IsInt()
    id!: string;
}
