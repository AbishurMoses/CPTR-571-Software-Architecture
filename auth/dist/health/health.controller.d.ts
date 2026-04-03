import { MikroORM } from '@mikro-orm/postgresql';
export declare class HealthController {
    private readonly orm;
    constructor(orm: MikroORM);
    getHealth(): Promise<{
        status: string;
        database: string;
        timestamp: string;
    }>;
}
