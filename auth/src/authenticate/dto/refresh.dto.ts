import { IsString, MaxLength, MinLength } from "class-validator";

export class RefreshDto {
    @IsString()
    refreshToken!: string;
}
