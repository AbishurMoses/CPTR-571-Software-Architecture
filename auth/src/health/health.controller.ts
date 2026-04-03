import { MikroORM } from '@mikro-orm/postgresql';
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
    constructor(private readonly orm: MikroORM) {}
    
    @Get()
    async getHealth() {
        const databaseStatus = await this.orm.isConnected();
        return {
            status: "ok",
            database: databaseStatus ? "connected" : "disconnected",
            timestamp: new Date().toISOString(),
        };
    }
}
