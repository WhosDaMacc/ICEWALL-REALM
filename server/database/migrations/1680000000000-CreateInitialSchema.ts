import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateInitialSchema1680000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Users table
        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "uuid_generate_v4()"
                },
                {
                    name: "email",
                    type: "varchar",
                    isUnique: true
                },
                {
                    name: "username",
                    type: "varchar",
                    isUnique: true
                },
                {
                    name: "wallet_address",
                    type: "varchar",
                    isUnique: true
                },
                {
                    name: "password_hash",
                    type: "varchar"
                },
                {
                    name: "account_status",
                    type: "varchar"
                },
                {
                    name: "verification_status",
                    type: "varchar"
                },
                {
                    name: "reputation",
                    type: "integer",
                    default: 0
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "last_login",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }));

        // Businesses table
        await queryRunner.createTable(new Table({
            name: "businesses",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "uuid_generate_v4()"
                },
                {
                    name: "name",
                    type: "varchar"
                },
                {
                    name: "description",
                    type: "text"
                },
                {
                    name: "owner_id",
                    type: "uuid"
                },
                {
                    name: "category",
                    type: "varchar"
                },
                {
                    name: "location",
                    type: "varchar"
                },
                {
                    name: "latitude",
                    type: "float"
                },
                {
                    name: "longitude",
                    type: "float"
                },
                {
                    name: "reputation",
                    type: "integer",
                    default: 0
                },
                {
                    name: "is_verified",
                    type: "boolean",
                    default: false
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                }
            ],
            foreignKeys: [
                {
                    columnNames: ["owner_id"],
                    referencedTableName: "users",
                    referencedColumnNames: ["id"],
                    onDelete: "CASCADE"
                }
            ]
        }));

        // Realms table
        await queryRunner.createTable(new Table({
            name: "realms",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "uuid_generate_v4()"
                },
                {
                    name: "name",
                    type: "varchar"
                },
                {
                    name: "creator_id",
                    type: "uuid"
                },
                {
                    name: "location",
                    type: "varchar"
                },
                {
                    name: "latitude",
                    type: "float"
                },
                {
                    name: "longitude",
                    type: "float"
                },
                {
                    name: "radius",
                    type: "float"
                },
                {
                    name: "is_active",
                    type: "boolean",
                    default: true
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                }
            ],
            foreignKeys: [
                {
                    columnNames: ["creator_id"],
                    referencedTableName: "users",
                    referencedColumnNames: ["id"],
                    onDelete: "CASCADE"
                }
            ]
        }));

        // Events table
        await queryRunner.createTable(new Table({
            name: "events",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "uuid_generate_v4()"
                },
                {
                    name: "title",
                    type: "varchar"
                },
                {
                    name: "description",
                    type: "text"
                },
                {
                    name: "business_id",
                    type: "uuid"
                },
                {
                    name: "realm_id",
                    type: "uuid"
                },
                {
                    name: "start_time",
                    type: "timestamp"
                },
                {
                    name: "end_time",
                    type: "timestamp"
                },
                {
                    name: "max_participants",
                    type: "integer"
                },
                {
                    name: "is_active",
                    type: "boolean",
                    default: true
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                }
            ],
            foreignKeys: [
                {
                    columnNames: ["business_id"],
                    referencedTableName: "businesses",
                    referencedColumnNames: ["id"],
                    onDelete: "CASCADE"
                },
                {
                    columnNames: ["realm_id"],
                    referencedTableName: "realms",
                    referencedColumnNames: ["id"],
                    onDelete: "CASCADE"
                }
            ]
        }));

        // User-Navitar relationship table
        await queryRunner.createTable(new Table({
            name: "user_navitars",
            columns: [
                {
                    name: "user_id",
                    type: "uuid"
                },
                {
                    name: "navitar_id",
                    type: "integer"
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                }
            ],
            foreignKeys: [
                {
                    columnNames: ["user_id"],
                    referencedTableName: "users",
                    referencedColumnNames: ["id"],
                    onDelete: "CASCADE"
                }
            ]
        }));

        // Event participants table
        await queryRunner.createTable(new Table({
            name: "event_participants",
            columns: [
                {
                    name: "event_id",
                    type: "uuid"
                },
                {
                    name: "user_id",
                    type: "uuid"
                },
                {
                    name: "joined_at",
                    type: "timestamp",
                    default: "now()"
                }
            ],
            foreignKeys: [
                {
                    columnNames: ["event_id"],
                    referencedTableName: "events",
                    referencedColumnNames: ["id"],
                    onDelete: "CASCADE"
                },
                {
                    columnNames: ["user_id"],
                    referencedTableName: "users",
                    referencedColumnNames: ["id"],
                    onDelete: "CASCADE"
                }
            ]
        }));

        // Realm interactions table
        await queryRunner.createTable(new Table({
            name: "realm_interactions",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "uuid_generate_v4()"
                },
                {
                    name: "realm_id",
                    type: "uuid"
                },
                {
                    name: "user_id",
                    type: "uuid"
                },
                {
                    name: "interaction_type",
                    type: "varchar"
                },
                {
                    name: "data",
                    type: "jsonb"
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                }
            ],
            foreignKeys: [
                {
                    columnNames: ["realm_id"],
                    referencedTableName: "realms",
                    referencedColumnNames: ["id"],
                    onDelete: "CASCADE"
                },
                {
                    columnNames: ["user_id"],
                    referencedTableName: "users",
                    referencedColumnNames: ["id"],
                    onDelete: "CASCADE"
                }
            ]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("realm_interactions");
        await queryRunner.dropTable("event_participants");
        await queryRunner.dropTable("user_navitars");
        await queryRunner.dropTable("events");
        await queryRunner.dropTable("realms");
        await queryRunner.dropTable("businesses");
        await queryRunner.dropTable("users");
    }
} 