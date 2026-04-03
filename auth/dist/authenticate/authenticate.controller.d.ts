import { AuthenticateService } from './authenticate.service';
import { AuthenticateDto } from './dto/authenticate.dto';
export declare class AuthenticateController {
    private readonly authenticateService;
    constructor(authenticateService: AuthenticateService);
    authenticate(authenticateDto: AuthenticateDto): Promise<{
        token: string;
    }>;
}
