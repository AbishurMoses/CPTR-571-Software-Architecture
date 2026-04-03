import { AuthenticateDto } from './dto/authenticate.dto';
import { EntityManager } from '@mikro-orm/postgresql';
import { JwtService } from '@nestjs/jwt';
export declare class AuthenticateService {
    private readonly em;
    private readonly jwt;
    constructor(em: EntityManager, jwt: JwtService);
    authenticate(authenticateDto: AuthenticateDto): Promise<{
        token: string;
    }>;
}
