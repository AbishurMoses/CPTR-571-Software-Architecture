import { CreateUserDto } from './dto/create-user.dto';
import { EntityManager } from '@mikro-orm/postgresql';
export declare class UsersService {
    private readonly em;
    constructor(em: EntityManager);
    create(createUserDto: CreateUserDto): Promise<{
        username: string;
        role: number;
    }>;
}
