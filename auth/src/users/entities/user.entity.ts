import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity({ tableName: 'users' })
export class User {
    @PrimaryKey()
    id!: number;

    @Property({ unique: true })
    username!: string;

    @Property()
    password!: string;

    @Property({ default: 0 })
    highscore!: number;

    @Property({ nullable: true })
    role?: number;

    @Property({ onCreate: () => new Date() })
    createdAt?: Date;

    @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
    updatedAt?: Date;
}
