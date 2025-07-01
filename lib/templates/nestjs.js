const fs = require('fs-extra');
const path = require('path');

async function generateNestJSFiles(projectPath, config) {
  const backendPath = path.join(projectPath, 'src/backend');

  // Create main application files
  await generateMainFiles(backendPath, config);
  
  // Create configuration
  await generateConfigFiles(backendPath, config);
  
  // Create common utilities
  await generateCommonFiles(backendPath, config);
  
  // Create feature modules
  await generateModules(backendPath, config);
  
  // Create configuration files
  await generateNestConfigFiles(backendPath, config);
}

async function generateMainFiles(backendPath, config) {
  // main.ts
  const mainContent = `import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger configuration
  if (configService.get('SWAGGER_ENABLED', true)) {
    const config = new DocumentBuilder()
      .setTitle('Kurdemy API')
      .setDescription('The Kurdemy API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('BACKEND_PORT', 4000);
  await app.listen(port);
  console.log(\`🚀 Backend server running on http://localhost:\${port}\`);
  console.log(\`📚 API Documentation available at http://localhost:\${port}/api/docs\`);
}

bootstrap();
`;

  await fs.writeFile(path.join(backendPath, 'src/main.ts'), mainContent);

  // app.module.ts
  const appModuleContent = `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './config/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
${config.trpc ? "import { TrpcModule } from './trpc/trpc.module';" : ''}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,${config.trpc ? '\n    TrpcModule,' : ''}
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;

  await fs.writeFile(path.join(backendPath, 'src/app.module.ts'), appModuleContent);

  // app.controller.ts
  const appControllerContent = `import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Application health status' })
  getHealth() {
    return this.appService.getHealthStatus();
  }
}
`;

  await fs.writeFile(path.join(backendPath, 'src/app.controller.ts'), appControllerContent);

  // app.service.ts
  const appServiceContent = `import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to Kurdemy API! 🚀';
  }

  getHealthStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }
}
`;

  await fs.writeFile(path.join(backendPath, 'src/app.service.ts'), appServiceContent);
}

async function generateConfigFiles(backendPath, config) {
  // database.module.ts
  const databaseModuleContent = generateDatabaseModule(config);
  await fs.writeFile(
    path.join(backendPath, 'src/config/database.module.ts'),
    databaseModuleContent
  );

  // database.config.ts
  const databaseConfigContent = generateDatabaseConfig(config);
  await fs.writeFile(
    path.join(backendPath, 'src/config/database.config.ts'),
    databaseConfigContent
  );
}

function generateDatabaseModule(config) {
  if (config.orm === 'prisma') {
    return `import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
`;
  } else {
    return `import { Global, Module } from '@nestjs/common';
import { DrizzleService } from './drizzle.service';

@Global()
@Module({
  providers: [DrizzleService],
  exports: [DrizzleService],
})
export class DatabaseModule {}
`;
  }
}

function generateDatabaseConfig(config) {
  if (config.orm === 'prisma') {
    return `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
`;
  } else {
    const dbImports = {
      postgresql: "import { drizzle } from 'drizzle-orm/postgres-js';\nimport postgres from 'postgres';",
      mysql: "import { drizzle } from 'drizzle-orm/mysql2';\nimport mysql from 'mysql2/promise';",
      sqlite: "import { drizzle } from 'drizzle-orm/better-sqlite3';\nimport Database from 'better-sqlite3';",
      sqlserver: "import { drizzle } from 'drizzle-orm/node-postgres';\nimport { Pool } from 'pg';"
    };

    return `import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
${dbImports[config.database]}

@Injectable()
export class DrizzleService implements OnModuleInit {
  public db: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    
    ${this.generateDrizzleConnection(config.database)}
    
    console.log('✅ Database connected successfully');
  }
}
`;
  }
}

function generateDrizzleConnection(database) {
  switch (database) {
    case 'postgresql':
      return `const client = postgres(databaseUrl);\n    this.db = drizzle(client);`;
    case 'mysql':
      return `const connection = await mysql.createConnection(databaseUrl);\n    this.db = drizzle(connection);`;
    case 'sqlite':
      return `const sqlite = new Database(databaseUrl.replace('file:', ''));\n    this.db = drizzle(sqlite);`;
    case 'sqlserver':
      return `const pool = new Pool({ connectionString: databaseUrl });\n    this.db = drizzle(pool);`;
    default:
      return '';
  }
}

async function generateCommonFiles(backendPath, config) {
  // Common decorators
  const getCurrentUserDecoratorContent = `import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
`;

  await fs.writeFile(
    path.join(backendPath, 'src/common/decorators/get-current-user.decorator.ts'),
    getCurrentUserDecoratorContent
  );

  // Response interceptor
  const responseInterceptorContent = `import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  message?: string;
  statusCode: number;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => ({
        data,
        statusCode: response.statusCode,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
`;

  await fs.writeFile(
    path.join(backendPath, 'src/common/interceptors/response.interceptor.ts'),
    responseInterceptorContent
  );

  // Exception filter
  const exceptionFilterContent = `import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    response.status(status).json(errorResponse);
  }
}
`;

  await fs.writeFile(
    path.join(backendPath, 'src/common/filters/all-exceptions.filter.ts'),
    exceptionFilterContent
  );
}

async function generateModules(backendPath, config) {
  // Generate Auth Module
  await generateAuthModule(backendPath, config);
  
  // Generate Users Module
  await generateUsersModule(backendPath, config);
}

async function generateAuthModule(backendPath, config) {
  const authModulePath = path.join(backendPath, 'src/modules/auth');

  // auth.module.ts
  const authModuleContent = `import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
`;

  await fs.writeFile(path.join(authModulePath, 'auth.module.ts'), authModuleContent);

  // auth.service.ts
  const authServiceContent = `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: user,
    };
  }

  async register(userData: { email: string; password: string; name: string }) {
    const existingUser = await this.usersService.findByEmail(userData.email);
    
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const user = await this.usersService.create({
      ...userData,
      password: hashedPassword,
    });

    const { password, ...result } = user;
    return this.login(result);
  }
}
`;

  await fs.writeFile(path.join(authModulePath, 'auth.service.ts'), authServiceContent);

  // auth.controller.ts
  const authControllerContent = `import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  async register(@Body() userData: { name: string; email: string; password: string }) {
    return this.authService.register(userData);
  }
}
`;

  await fs.writeFile(path.join(authModulePath, 'auth.controller.ts'), authControllerContent);

  // Generate JWT Strategy
  const jwtStrategyContent = `import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
`;

  await fs.writeFile(
    path.join(authModulePath, 'strategies/jwt.strategy.ts'),
    jwtStrategyContent
  );

  // Generate Local Strategy
  const localStrategyContent = `import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
`;

  await fs.writeFile(
    path.join(authModulePath, 'strategies/local.strategy.ts'),
    localStrategyContent
  );

  // Generate Auth Guards
  const jwtAuthGuardContent = `import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
`;

  await fs.writeFile(
    path.join(authModulePath, 'guards/jwt-auth.guard.ts'),
    jwtAuthGuardContent
  );

  const localAuthGuardContent = `import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
`;

  await fs.writeFile(
    path.join(authModulePath, 'guards/local-auth.guard.ts'),
    localAuthGuardContent
  );
}

async function generateUsersModule(backendPath, config) {
  const usersModulePath = path.join(backendPath, 'src/modules/users');

  // users.module.ts
  const usersModuleContent = `import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
`;

  await fs.writeFile(path.join(usersModulePath, 'users.module.ts'), usersModuleContent);

  // users.service.ts
  const usersServiceContent = generateUsersService(config);
  await fs.writeFile(path.join(usersModulePath, 'users.service.ts'), usersServiceContent);

  // users.controller.ts
  const usersControllerContent = `import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetCurrentUser } from '../../common/decorators/get-current-user.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  async getProfile(@GetCurrentUser() user: any) {
    return this.usersService.findById(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiBearerAuth()
  async findAll() {
    return this.usersService.findAll();
  }
}
`;

  await fs.writeFile(path.join(usersModulePath, 'users.controller.ts'), usersControllerContent);
}

function generateUsersService(config) {
  if (config.orm === 'prisma') {
    return `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(userData: { name: string; email: string; password: string }) {
    return this.prisma.user.create({
      data: userData,
    });
  }

  async update(id: string, userData: Partial<{ name: string; email: string }>) {
    return this.prisma.user.update({
      where: { id },
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
`;
  } else {
    return `import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../config/drizzle.service';
import { users } from '../../../shared/database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(private drizzle: DrizzleService) {}

  async findAll() {
    return this.drizzle.db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users);
  }

  async findById(id: string) {
    const result = await this.drizzle.db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, id));
    
    return result[0];
  }

  async findByEmail(email: string) {
    const result = await this.drizzle.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async create(userData: { name: string; email: string; password: string }) {
    const result = await this.drizzle.db.insert(users).values({
      ...userData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    return result[0];
  }

  async update(id: string, userData: Partial<{ name: string; email: string }>) {
    const result = await this.drizzle.db.update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
    
    return result[0];
  }

  async delete(id: string) {
    const result = await this.drizzle.db.delete(users).where(eq(users.id, id)).returning();
    return result[0];
  }
}
`;
  }
}

async function generateNestConfigFiles(backendPath, config) {
  // nest-cli.json
  const nestCliContent = {
    "$schema": "https://json.schemastore.org/nest-cli",
    "collection": "@nestjs/schematics",
    "sourceRoot": "src",
    "compilerOptions": {
      "deleteOutDir": true
    }
  };

  await fs.writeFile(
    path.join(backendPath, 'nest-cli.json'),
    JSON.stringify(nestCliContent, null, 2)
  );

  // tsconfig.json
  const tsconfigContent = {
    "compilerOptions": {
      "module": "commonjs",
      "declaration": true,
      "removeComments": true,
      "emitDecoratorMetadata": true,
      "experimentalDecorators": true,
      "allowSyntheticDefaultImports": true,
      "target": "ES2020",
      "sourceMap": true,
      "outDir": "./dist",
      "baseUrl": "./",
      "incremental": true,
      "skipLibCheck": true,
      "strictNullChecks": false,
      "noImplicitAny": false,
      "strictBindCallApply": false,
      "forceConsistentCasingInFileNames": false,
      "noFallthroughCasesInSwitch": false,
      "paths": {
        "@/*": ["src/*"]
      }
    }
  };

  await fs.writeFile(
    path.join(backendPath, 'tsconfig.json'),
    JSON.stringify(tsconfigContent, null, 2)
  );

  // .eslintrc.js
  const eslintContent = `module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    '@nestjs/eslint-config',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
`;

  await fs.writeFile(path.join(backendPath, '.eslintrc.js'), eslintContent);
}

module.exports = {
  generateNestJSFiles,
  generateMainFiles,
  generateConfigFiles,
  generateCommonFiles,
  generateModules
};