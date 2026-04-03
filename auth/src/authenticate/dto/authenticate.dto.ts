import { IsString, MaxLength, MinLength } from "class-validator";

export class AuthenticateDto {
    @IsString()
    username!: string;

    @IsString()
    password!: string;
}
