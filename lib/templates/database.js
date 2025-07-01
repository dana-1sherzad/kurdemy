const fs = require('fs-extra');
const path = require('path');

async function generateDatabaseFiles(projectPath, config) {
  if (config.orm === 'prisma') {
    await generatePrismaFiles(projectPath, config);
  } else {
    await generateDrizzleFiles(projectPath, config);
  }
}

async function generatePrismaFiles(projectPath, config) {
  // Generate Prisma schema
  await generatePrismaSchema(projectPath, config);
  
  // Generate seed file
  await generatePrismaSeed(projectPath, config);
  
  // Generate database service for backend
  await generatePrismaService(projectPath, config);
}

async function generatePrismaSchema(projectPath, config) {
  const schemaContent = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${getDatabaseProvider(config.database)}"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  posts     Post[]
  
  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String

  @@map("posts")
}

${config.auth ? `
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verificationtokens")
}
` : ''}

${generateDatabaseSpecificSchema(config.database)}
`;

  await fs.writeFile(path.join(projectPath, 'prisma/schema.prisma'), schemaContent);

  // Generate .env schema validation
  const envSchemaContent = `# Database
DATABASE_URL="${getDatabaseConnectionString(config.database)}"

# Add your environment variables here
# They will be loaded by the app at build time and runtime
`;

  await fs.writeFile(path.join(projectPath, 'prisma/.env'), envSchemaContent);
}

async function generatePrismaSeed(projectPath, config) {
  const seedContent = `import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const user1 = await prisma.user.upsert({
    where: { email: 'admin@kurdemy.com' },
    update: {},
    create: {
      email: 'admin@kurdemy.com',
      name: 'Admin User',
      password: hashedPassword,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user@kurdemy.com' },
    update: {},
    create: {
      email: 'user@kurdemy.com',
      name: 'Test User',
      password: hashedPassword,
    },
  });

  console.log('✅ Users created:', { user1: user1.email, user2: user2.email });

  // Create sample posts
  const post1 = await prisma.post.upsert({
    where: { id: 'sample-post-1' },
    update: {},
    create: {
      id: 'sample-post-1',
      title: 'Welcome to Kurdemy',
      content: 'This is a sample post created during database seeding. You can edit or delete this post.',
      published: true,
      authorId: user1.id,
    },
  });

  const post2 = await prisma.post.upsert({
    where: { id: 'sample-post-2' },
    update: {},
    create: {
      id: 'sample-post-2',
      title: 'Getting Started Guide',
      content: 'Here are some tips to get started with your new Kurdemy application...',
      published: false,
      authorId: user2.id,
    },
  });

  console.log('✅ Posts created:', { post1: post1.title, post2: post2.title });

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

  await fs.writeFile(path.join(projectPath, 'prisma/seed.ts'), seedContent);

  // Add seed script to package.json
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  
  packageJson.prisma = {
    seed: "ts-node prisma/seed.ts"
  };

  packageJson.scripts["db:seed"] = "prisma db seed";
  packageJson.scripts["db:reset"] = "prisma migrate reset --force";

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

async function generatePrismaService(projectPath, config) {
  const serviceContent = `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Database disconnected');
  }

  async healthCheck() {
    try {
      await this.$queryRaw\`SELECT 1\`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }

  async clearDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Database clearing is only allowed in test environment');
    }

    const tablenames = await this.$queryRaw<Array<{ tablename: string }>>\`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    \`;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.$executeRawUnsafe(\`TRUNCATE TABLE "\${tablename}" CASCADE;\`);
        } catch (error) {
          console.log({ error });
        }
      }
    }
  }
}
`;

  await fs.writeFile(
    path.join(projectPath, 'src/backend/src/config/prisma.service.ts'),
    serviceContent
  );
}

async function generateDrizzleFiles(projectPath, config) {
  // Generate Drizzle schema
  await generateDrizzleSchema(projectPath, config);
  
  // Generate migrations
  await generateDrizzleConfig(projectPath, config);
  
  // Generate seed file
  await generateDrizzleSeed(projectPath, config);
  
  // Generate database service for backend
  await generateDrizzleService(projectPath, config);
}

async function generateDrizzleSchema(projectPath, config) {
  const schemaContent = `import { ${getDrizzleImports(config.database)} } from 'drizzle-orm/${getDrizzleDialect(config.database)}';
import { relations } from 'drizzle-orm';

// Users table
export const users = ${getDrizzleTableFunction(config.database)}('users', {
  id: ${getDrizzlePrimaryKey(config.database)},
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Posts table
export const posts = ${getDrizzleTableFunction(config.database)}('posts', {
  id: ${getDrizzlePrimaryKey(config.database)},
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  published: boolean('published').default(false).notNull(),
  authorId: varchar('author_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

${config.auth ? `
// Auth tables for NextAuth.js compatibility
export const accounts = ${getDrizzleTableFunction(config.database)}('accounts', {
  id: ${getDrizzlePrimaryKey(config.database)},
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  idToken: text('id_token'),
  sessionState: varchar('session_state', { length: 255 }),
});

export const sessions = ${getDrizzleTableFunction(config.database)}('sessions', {
  id: ${getDrizzlePrimaryKey(config.database)},
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = ${getDrizzleTableFunction(config.database)}('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires').notNull(),
});
` : ''}

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  ${config.auth ? 'accounts: many(accounts),\n  sessions: many(sessions),' : ''}
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));

${config.auth ? `
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
` : ''}

// Export all tables
export const schema = {
  users,
  posts,
  ${config.auth ? 'accounts,\n  sessions,\n  verificationTokens,' : ''}
  usersRelations,
  postsRelations,
  ${config.auth ? 'accountsRelations,\n  sessionsRelations,' : ''}
};
`;

  await fs.writeFile(
    path.join(projectPath, 'src/shared/database/schema.ts'),
    schemaContent
  );

  // Generate types
  const typesContent = `import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { users, posts${config.auth ? ', accounts, sessions, verificationTokens' : ''} } from './schema';

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Post types
export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;

${config.auth ? `
// Auth types
export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export type VerificationToken = InferSelectModel<typeof verificationTokens>;
export type NewVerificationToken = InferInsertModel<typeof verificationTokens>;
` : ''}

// API Response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
`;

  await fs.writeFile(
    path.join(projectPath, 'src/shared/types/database.ts'),
    typesContent
  );
}

async function generateDrizzleConfig(projectPath, config) {
  const configContent = `import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/shared/database/schema.ts',
  out: './migrations',
  driver: '${getDrizzleKitDriver(config.database)}',
  dbCredentials: ${getDrizzleCredentials(config.database)},
  verbose: true,
  strict: true,
} satisfies Config;
`;

  await fs.writeFile(path.join(projectPath, 'drizzle.config.ts'), configContent);

  // Generate migration script
  const migrationScript = `#!/bin/bash

echo "🔄 Running database migrations..."

# Generate migration files
npx drizzle-kit generate:${getDrizzleKitDriver(config.database)}

# Apply migrations
npx drizzle-kit push:${getDrizzleKitDriver(config.database)}

echo "✅ Migrations completed!"
`;

  await fs.writeFile(path.join(projectPath, 'scripts/migrate.sh'), migrationScript);
  
  // Make script executable
  await fs.chmod(path.join(projectPath, 'scripts/migrate.sh'), '755');
}

async function generateDrizzleSeed(projectPath, config) {
  const seedContent = `import { drizzle } from 'drizzle-orm/${getDrizzleDialect(config.database)}';
import ${getDrizzleClientImport(config.database)} from '${getDrizzleClientPackage(config.database)}';
import * as bcrypt from 'bcrypt';
import { users, posts } from '../src/shared/database/schema';
import * as dotenv from 'dotenv';

dotenv.config();

const client = ${getDrizzleClientConnection(config.database)};
const db = drizzle(client);

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const insertedUsers = await db.insert(users).values([
      {
        id: 'user-1',
        email: 'admin@kurdemy.com',
        name: 'Admin User',
        password: hashedPassword,
      },
      {
        id: 'user-2',
        email: 'user@kurdemy.com',
        name: 'Test User',
        password: hashedPassword,
      },
    ]).returning();

    console.log('✅ Users created:', insertedUsers.map(u => u.email));

    // Create sample posts
    const insertedPosts = await db.insert(posts).values([
      {
        id: 'post-1',
        title: 'Welcome to Kurdemy',
        content: 'This is a sample post created during database seeding. You can edit or delete this post.',
        published: true,
        authorId: insertedUsers[0].id,
      },
      {
        id: 'post-2',
        title: 'Getting Started Guide',
        content: 'Here are some tips to get started with your new Kurdemy application...',
        published: false,
        authorId: insertedUsers[1].id,
      },
    ]).returning();

    console.log('✅ Posts created:', insertedPosts.map(p => p.title));

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    ${getDrizzleClientDisconnect(config.database)}
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;

  await fs.writeFile(path.join(projectPath, 'scripts/seed.ts'), seedContent);

  // Add seed script to package.json
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  
  packageJson.scripts["db:seed"] = "ts-node scripts/seed.ts";
  packageJson.scripts["db:migrate"] = "./scripts/migrate.sh";
  packageJson.scripts["db:studio"] = "drizzle-kit studio";

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

async function generateDrizzleService(projectPath, config) {
  const serviceContent = `import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/${getDrizzleDialect(config.database)}';
import ${getDrizzleClientImport(config.database)} from '${getDrizzleClientPackage(config.database)}';
import { schema } from '../../shared/database/schema';

@Injectable()
export class DrizzleService implements OnModuleInit {
  public db: ReturnType<typeof drizzle>;
  private client: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    try {
      ${getDrizzleServiceConnection(config.database)}
      
      this.db = drizzle(this.client, { schema });
      
      // Test connection
      await this.healthCheck();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      // Perform a simple query to test the connection
      const result = await this.db.query.users.findFirst({
        columns: { id: true }
      });
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      ${getDrizzleServiceDisconnect(config.database)}
      console.log('🔌 Database disconnected');
    }
  }
}
`;

  await fs.writeFile(
    path.join(projectPath, 'src/backend/src/config/drizzle.service.ts'),
    serviceContent
  );
}

// Helper functions for database-specific configurations

function getDatabaseProvider(database) {
  const providers = {
    postgresql: 'postgresql',
    mysql: 'mysql',
    sqlite: 'sqlite',
    sqlserver: 'sqlserver'
  };
  return providers[database] || 'postgresql';
}

function getDatabaseConnectionString(database) {
  const connections = {
    postgresql: 'postgresql://username:password@localhost:5432/kurdemy_db',
    mysql: 'mysql://username:password@localhost:3306/kurdemy_db',
    sqlite: 'file:./dev.db',
    sqlserver: 'sqlserver://localhost:1433;database=kurdemy_db;username=sa;password=YourPassword123;trustServerCertificate=true'
  };
  return connections[database] || connections.postgresql;
}

function generateDatabaseSpecificSchema(database) {
  if (database === 'mysql') {
    return `
// MySQL specific configurations
// Add any MySQL-specific configurations here
`;
  } else if (database === 'sqlite') {
    return `
// SQLite specific configurations
// Add any SQLite-specific configurations here
`;
  } else if (database === 'sqlserver') {
    return `
// SQL Server specific configurations
// Add any SQL Server-specific configurations here
`;
  }
  return `
// PostgreSQL specific configurations
// Add any PostgreSQL-specific configurations here
`;
}

function getDrizzleImports(database) {
  const imports = {
    postgresql: 'pgTable, varchar, text, boolean, timestamp, uuid',
    mysql: 'mysqlTable, varchar, text, boolean, timestamp, int',
    sqlite: 'sqliteTable, text, integer, blob',
    sqlserver: 'sqlServerTable, varchar, text, bit, datetime, uniqueidentifier'
  };
  return imports[database] || imports.postgresql;
}

function getDrizzleDialect(database) {
  const dialects = {
    postgresql: 'postgres-js',
    mysql: 'mysql2',
    sqlite: 'better-sqlite3',
    sqlserver: 'node-postgres'
  };
  return dialects[database] || dialects.postgresql;
}

function getDrizzleTableFunction(database) {
  const functions = {
    postgresql: 'pgTable',
    mysql: 'mysqlTable',
    sqlite: 'sqliteTable',
    sqlserver: 'sqlServerTable'
  };
  return functions[database] || functions.postgresql;
}

function getDrizzlePrimaryKey(database) {
  const keys = {
    postgresql: "uuid('id').primaryKey().defaultRandom()",
    mysql: "int('id').primaryKey().autoincrement()",
    sqlite: "text('id').primaryKey().$defaultFn(() => crypto.randomUUID())",
    sqlserver: "uniqueidentifier('id').primaryKey().defaultRandom()"
  };
  return keys[database] || keys.postgresql;
}

function getDrizzleKitDriver(database) {
  const drivers = {
    postgresql: 'pg',
    mysql: 'mysql2',
    sqlite: 'better-sqlite',
    sqlserver: 'azure-sql'
  };
  return drivers[database] || drivers.postgresql;
}

function getDrizzleCredentials(database) {
  const credentials = {
    postgresql: `{
    connectionString: process.env.DATABASE_URL!,
  }`,
    mysql: `{
    connectionString: process.env.DATABASE_URL!,
  }`,
    sqlite: `{
    url: process.env.DATABASE_URL!,
  }`,
    sqlserver: `{
    connectionString: process.env.DATABASE_URL!,
  }`
  };
  return credentials[database] || credentials.postgresql;
}

function getDrizzleClientImport(database) {
  const imports = {
    postgresql: 'postgres',
    mysql: 'mysql',
    sqlite: 'Database',
    sqlserver: '{ Pool }'
  };
  return imports[database] || imports.postgresql;
}

function getDrizzleClientPackage(database) {
  const packages = {
    postgresql: 'postgres',
    mysql: 'mysql2/promise',
    sqlite: 'better-sqlite3',
    sqlserver: 'pg'
  };
  return packages[database] || packages.postgresql;
}

function getDrizzleClientConnection(database) {
  const connections = {
    postgresql: 'postgres(process.env.DATABASE_URL!)',
    mysql: 'mysql.createConnection(process.env.DATABASE_URL!)',
    sqlite: 'new Database(process.env.DATABASE_URL!.replace("file:", ""))',
    sqlserver: 'new Pool({ connectionString: process.env.DATABASE_URL! })'
  };
  return connections[database] || connections.postgresql;
}

function getDrizzleClientDisconnect(database) {
  const disconnects = {
    postgresql: 'await client.end();',
    mysql: 'await client.end();',
    sqlite: 'client.close();',
    sqlserver: 'await client.end();'
  };
  return disconnects[database] || disconnects.postgresql;
}

function getDrizzleServiceConnection(database) {
  const connections = {
    postgresql: `this.client = postgres(databaseUrl);`,
    mysql: `this.client = await mysql.createConnection(databaseUrl);`,
    sqlite: `this.client = new Database(databaseUrl.replace('file:', ''));`,
    sqlserver: `this.client = new Pool({ connectionString: databaseUrl });`
  };
  return connections[database] || connections.postgresql;
}

function getDrizzleServiceDisconnect(database) {
  const disconnects = {
    postgresql: 'await this.client.end();',
    mysql: 'await this.client.end();',
    sqlite: 'this.client.close();',
    sqlserver: 'await this.client.end();'
  };
  return disconnects[database] || disconnects.postgresql;
}

module.exports = {
  generateDatabaseFiles,
  generatePrismaFiles,
  generateDrizzleFiles
};