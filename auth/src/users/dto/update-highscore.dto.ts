import { IsInt, IsOptional, IsString, IsStrongPassword, Matches, MaxLength, Min, MinLength } from "class-validator";

export class UpdateHighscoreDto {
    @Min(0)
    @IsInt()
    score!: number;
}
