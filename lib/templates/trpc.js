const fs = require('fs-extra');
const path = require('path');

async function generateTRPCFiles(projectPath, config) {
  const backendPath = path.join(projectPath, 'src/backend');
  const frontendPath = path.join(projectPath, 'src/frontend');

  // Generate backend tRPC files
  await generateBackendTRPCFiles(backendPath, config);
  
  // Generate shared tRPC types
  await generateSharedTRPCFiles(projectPath, config);
  
  // Generate frontend tRPC files (already handled in frontend generators)
  // But we'll create additional utilities here
  await generateTRPCUtilities(frontendPath, config);
}

async function generateBackendTRPCFiles(backendPath, config) {
  // Generate tRPC context
  await generateTRPCContext(backendPath, config);
  
  // Generate tRPC router
  await generateTRPCRouter(backendPath, config);
  
  // Generate tRPC module
  await generateTRPCModule(backendPath, config);
  
  // Generate tRPC procedures
  await generateTRPCProcedures(backendPath, config);
}

async function generateTRPCContext(backendPath, config) {
  const contextContent = `import { type CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
${config.orm === 'prisma' ? "import { PrismaService } from '../config/prisma.service';" : "import { DrizzleService } from '../config/drizzle.service';"}

export interface User {
  id: string;
  email: string;
  name: string;
}

interface CreateContextOptions {
  user?: User;
  ${config.orm === 'prisma' ? 'prisma: PrismaService;' : 'db: DrizzleService;'}
  config: ConfigService;
}

export interface Context extends CreateContextOptions {}

export const createContext = async (
  opts: CreateExpressContextOptions,
  ${config.orm === 'prisma' ? 'prisma: PrismaService,' : 'db: DrizzleService,'}
  configService: ConfigService
): Promise<Context> => {
  let user: User | undefined;

  // Extract token from Authorization header
  const authHeader = opts.req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const jwtSecret = configService.get<string>('JWT_SECRET');
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Fetch user from database
      ${config.orm === 'prisma' ? `
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, name: true }
      });
      ` : `
      const dbUser = await db.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, decoded.sub),
        columns: { id: true, email: true, name: true }
      });
      `}
      
      if (dbUser) {
        user = dbUser;
      }
    } catch (error) {
      // Invalid token, user remains undefined
      console.warn('Invalid JWT token:', error.message);
    }
  }

  return {
    user,
    ${config.orm === 'prisma' ? 'prisma,' : 'db,'}
    config: configService,
  };
};

// For Next.js API routes (if using Next.js with tRPC)
export const createNextContext = async (
  opts: CreateNextContextOptions,
  ${config.orm === 'prisma' ? 'prisma: PrismaService,' : 'db: DrizzleService,'}
  configService: ConfigService
): Promise<Context> => {
  return createContext(
    { req: opts.req, res: opts.res },
    ${config.orm === 'prisma' ? 'prisma,' : 'db,'}
    configService
  );
};
`;

  await fs.writeFile(
    path.join(backendPath, 'src/trpc/context.ts'),
    contextContent
  );
}

async function generateTRPCRouter(backendPath, config) {
  const routerContent = `import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import superjson from 'superjson';
import { ZodError } from 'zod';

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Create a server-side caller
export const createTRPCRouter = t.router;

// Base procedure
export const publicProcedure = t.procedure;

// Protected procedure with authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Now guaranteed to be defined
    },
  });
});

// Admin procedure (extend with role checks if needed)
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // Add admin role check logic here
  // For now, just using the same as protected
  return next({ ctx });
});

// Export the router instance
export { t };
`;

  await fs.writeFile(
    path.join(backendPath, 'src/trpc/trpc.ts'),
    routerContent
  );

  // Generate main app router
  const appRouterContent = `import { createTRPCRouter } from './trpc';
import { authRouter } from './routers/auth.router';
import { usersRouter } from './routers/users.router';
import { postsRouter } from './routers/posts.router';
import { healthRouter } from './routers/health.router';

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
  users: usersRouter,
  posts: postsRouter,
});

export type AppRouter = typeof appRouter;
`;

  await fs.writeFile(
    path.join(backendPath, 'src/trpc/app.router.ts'),
    appRouterContent
  );
}

async function generateTRPCModule(backendPath, config) {
  const moduleContent = `import { Module } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { TrpcRouter } from './trpc.router';
${config.orm === 'prisma' ? "import { PrismaService } from '../config/prisma.service';" : "import { DrizzleService } from '../config/drizzle.service';"}

@Module({
  imports: [],
  controllers: [TrpcRouter],
  providers: [TrpcService, ${config.orm === 'prisma' ? 'PrismaService' : 'DrizzleService'}],
})
export class TrpcModule {}
`;

  await fs.writeFile(
    path.join(backendPath, 'src/trpc/trpc.module.ts'),
    moduleContent
  );

  // Generate tRPC service
  const serviceContent = `import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './app.router';
import { createContext } from './context';
${config.orm === 'prisma' ? "import { PrismaService } from '../config/prisma.service';" : "import { DrizzleService } from '../config/drizzle.service';"}

@Injectable()
export class TrpcService {
  constructor(
    ${config.orm === 'prisma' ? 'private prisma: PrismaService,' : 'private db: DrizzleService,'}
    private configService: ConfigService,
  ) {}

  async createExpressMiddleware() {
    return trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: (opts) => createContext(opts, ${config.orm === 'prisma' ? 'this.prisma' : 'this.db'}, this.configService),
      onError:
        this.configService.get('NODE_ENV') === 'development'
          ? ({ path, error }) => {
              console.error(
                \`❌ tRPC failed on \${path ?? '<no-path>'}: \${error.message}\`
              );
            }
          : undefined,
    });
  }
}
`;

  await fs.writeFile(
    path.join(backendPath, 'src/trpc/trpc.service.ts'),
    serviceContent
  );

  // Generate tRPC router (NestJS controller)
  const controllerContent = `import { All, Controller, Next, Req, Res } from '@nestjs/common';
import { TrpcService } from './trpc.service';

@Controller('/trpc')
export class TrpcRouter {
  constructor(private readonly trpc: TrpcService) {}

  @All('/*')
  async handler(@Req() req: any, @Res() res: any, @Next() next: any) {
    const handler = await this.trpc.createExpressMiddleware();
    return handler(req, res, next);
  }
}
`;

  await fs.writeFile(
    path.join(backendPath, 'src/trpc/trpc.router.ts'),
    controllerContent
  );
}

async function generateTRPCProcedures(backendPath, config) {
  // Health router
  const healthRouterContent = `import { publicProcedure, createTRPCRouter } from '../trpc';

export const healthRouter = createTRPCRouter({
  check: publicProcedure.query(async ({ ctx }) => {
    const dbHealth = ${config.orm === 'prisma' ? 'await ctx.prisma.healthCheck();' : 'await ctx.db.healthCheck();'}
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      environment: ctx.config.get('NODE_ENV'),
      version: '1.0.0',
    };
  }),
});
`;

  await fs.writeFile(
    path.join(backendPath, 'src/trpc/routers/health.router.ts'),
    healthRouterContent
  );

  // Auth router
  const authRouterContent = `import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, createTRPCRouter } from '../trpc';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      // Find user by email
      ${config.orm === 'prisma' ? `
      const user = await ctx.prisma.user.findUnique({
        where: { email },
      });
      ` : `
      const user = await ctx.db.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });
      `}

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Generate JWT token
      const jwtSecret = ctx.config.get<string>('JWT_SECRET');
      const token = jwt.sign(
        { sub: user.id, email: user.email },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken: token,
      };
    }),

  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const { name, email, password } = input;

      // Check if user already exists
      ${config.orm === 'prisma' ? `
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
      });
      ` : `
      const existingUser = await ctx.db.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });
      `}

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      ${config.orm === 'prisma' ? `
      const user = await ctx.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });
      ` : `
      const [user] = await ctx.db.db.insert(users).values({
        id: crypto.randomUUID(),
        name,
        email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      `}

      // Generate JWT token
      const jwtSecret = ctx.config.get<string>('JWT_SECRET');
      const token = jwt.sign(
        { sub: user.id, email: user.email },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken: token,
      };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  logout: protectedProcedure.mutation(async () => {
    // In a JWT setup, logout is typically handled client-side
    // by removing the token. You could implement token blacklisting here.
    return { success: true };
  }),
});
`;

  await fs.writeFile(
    path.join(backendPath, 'src/trpc/routers/auth.router.ts'),
    authRouterContent
  );

  // Users router
  const usersRouterContent = `import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, createTRPCRouter } from '../trpc';
${config.orm === 'drizzle' ? "import { users } from '../../shared/database/schema';\nimport { eq } from 'drizzle-orm';" : ''}

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const usersRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    ${config.orm === 'prisma' ? `
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    ` : `
    const user = await ctx.db.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.user.id),
      columns: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    `}

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),

  updateProfile: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ input, ctx }) => {
      const { name, email } = input;

      // Check if email is already taken by another user
      if (email) {
        ${config.orm === 'prisma' ? `
        const existingUser = await ctx.prisma.user.findFirst({
          where: {
            email,
            NOT: { id: ctx.user.id },
          },
        });
        ` : `
        const existingUser = await ctx.db.db.query.users.findFirst({
          where: (users, { eq, and, not }) => and(
            eq(users.email, email),
            not(eq(users.id, ctx.user.id))
          ),
        });
        `}

        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email is already taken',
          });
        }
      }

      // Update user
      ${config.orm === 'prisma' ? `
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      ` : `
      const [updatedUser] = await ctx.db.db.update(users)
        .set({
          ...(name && { name }),
          ...(email && { email }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });
      `}

      return updatedUser;
    }),

  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, offset } = input;

      ${config.orm === 'prisma' ? `
      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          take: limit,
          skip: offset,
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        ctx.prisma.user.count(),
      ]);
      ` : `
      const usersList = await ctx.db.db.query.users.findMany({
        limit,
        offset,
        columns: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: (users, { desc }) => [desc(users.createdAt)],
      });

      // For total count, you might want to implement a separate query
      const total = usersList.length; // Simplified for now
      `}

      return {
        users${config.orm === 'drizzle' ? ': usersList' : ''},
        total,
        hasMore: offset + limit < total,
      };
    }),
});
`;

  await fs.writeFile(
    path.join(backendPath, 'src/trpc/routers/users.router.ts'),
    usersRouterContent
  );

  // Posts router
  const postsRouterContent = `import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, createTRPCRouter } from '../trpc';
${config.orm === 'drizzle' ? "import { posts } from '../../shared/database/schema';\nimport { eq, desc } from 'drizzle-orm';" : ''}

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  published: z.boolean().default(false),
});

const updatePostSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
});

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
        published: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, offset, published } = input;

      ${config.orm === 'prisma' ? `
      const where = published !== undefined ? { published } : {};

      const [posts, total] = await Promise.all([
        ctx.prisma.post.findMany({
          where,
          take: limit,
          skip: offset,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        ctx.prisma.post.count({ where }),
      ]);
      ` : `
      const postsList = await ctx.db.db.query.posts.findMany({
        limit,
        offset,
        where: published !== undefined 
          ? (posts, { eq }) => eq(posts.published, published)
          : undefined,
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      });

      const total = postsList.length; // Simplified
      `}

      return {
        posts${config.orm === 'drizzle' ? ': postsList' : ''},
        total,
        hasMore: offset + limit < total,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      ${config.orm === 'prisma' ? `
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      ` : `
      const post = await ctx.db.db.query.posts.findFirst({
        where: (posts, { eq }) => eq(posts.id, input.id),
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      `}

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      return post;
    }),

  create: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ input, ctx }) => {
      ${config.orm === 'prisma' ? `
      const post = await ctx.prisma.post.create({
        data: {
          ...input,
          authorId: ctx.user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      ` : `
      const [post] = await ctx.db.db.insert(posts).values({
        id: crypto.randomUUID(),
        ...input,
        authorId: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Fetch with author
      const postWithAuthor = await ctx.db.db.query.posts.findFirst({
        where: (posts, { eq }) => eq(posts.id, post.id),
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      `}

      return ${config.orm === 'drizzle' ? 'postWithAuthor' : 'post'};
    }),

  update: protectedProcedure
    .input(updatePostSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      // Check if post exists and user owns it
      ${config.orm === 'prisma' ? `
      const existingPost = await ctx.prisma.post.findUnique({
        where: { id },
      });
      ` : `
      const existingPost = await ctx.db.db.query.posts.findFirst({
        where: (posts, { eq }) => eq(posts.id, id),
      });
      `}

      if (!existingPost) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      if (existingPost.authorId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own posts',
        });
      }

      // Update post
      ${config.orm === 'prisma' ? `
      const updatedPost = await ctx.prisma.post.update({
        where: { id },
        data: updateData,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      ` : `
      const [updatedPost] = await ctx.db.db.update(posts)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, id))
        .returning();

      // Fetch with author
      const postWithAuthor = await ctx.db.db.query.posts.findFirst({
        where: (posts, { eq }) => eq(posts.id, id),
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      `}

      return ${config.orm === 'drizzle' ? 'postWithAuthor' : 'updatedPost'};
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Check if post exists and user owns it
      ${config.orm === 'prisma' ? `
      const existingPost = await ctx.prisma.post.findUnique({
        where: { id: input.id },
      });
      ` : `
      const existingPost = await ctx.db.db.query.posts.findFirst({
        where: (posts, { eq }) => eq(posts.id, input.id),
      });
      `}

      if (!existingPost) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      if (existingPost.authorId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own posts',
        });
      }

      // Delete post
      ${config.orm === 'prisma' ? `
      await ctx.prisma.post.delete({
        where: { id: input.id },
      });
      ` : `
      await ctx.db.db.delete(posts).where(eq(posts.id, input.id));
      `}

      return { success: true };
    }),

  getMyPosts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, offset } = input;

      ${config.orm === 'prisma' ? `
      const [posts, total] = await Promise.all([
        ctx.prisma.post.findMany({
          where: { authorId: ctx.user.id },
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        ctx.prisma.post.count({ where: { authorId: ctx.user.id } }),
      ]);
      ` : `
      const postsList = await ctx.db.db.query.posts.findMany({
        where: (posts, { eq }) => eq(posts.authorId, ctx.user.id),
        limit,
        offset,
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      });

      const total = postsList.length; // Simplified
      `}

      return {
        posts${config.orm === 'drizzle' ? ': postsList' : ''},
        total,
        hasMore: offset + limit < total,
      };
    }),
});
`;

  await fs.writeFile(
    path.join(backendPath, 'src/trpc/routers/posts.router.ts'),
    postsRouterContent
  );
}

async function generateSharedTRPCFiles(projectPath, config) {
  // Generate shared types
  const sharedTypesContent = `// Shared types between frontend and backend

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  title: string;
  content: string | null;
  published: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export interface HealthCheck {
  status: 'ok' | 'error';
  timestamp: string;
  database: {
    status: 'healthy' | 'unhealthy';
    error?: string;
  };
  environment: string;
  version: string;
}

// Form validation schemas (can be reused on frontend)
export const loginSchema = {
  email: 'string().email()',
  password: 'string().min(1)',
};

export const registerSchema = {
  name: 'string().min(1)',
  email: 'string().email()',
  password: 'string().min(6)',
};

export const createPostSchema = {
  title: 'string().min(1).max(255)',
  content: 'string().optional()',
  published: 'boolean().default(false)',
};
`;

  await fs.writeFile(
    path.join(projectPath, 'src/shared/types/trpc.ts'),
    sharedTypesContent
  );

  // Generate tRPC constants
  const constantsContent = `// tRPC Configuration Constants

export const TRPC_ENDPOINTS = {
  development: 'http://localhost:4000/api/trpc',
  production: process.env.TRPC_URL || 'https://yourapp.com/api/trpc',
} as const;

export const QUERY_KEYS = {
  health: ['health'] as const,
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    profile: ['users', 'profile'] as const,
    all: (limit: number, offset: number) => ['users', 'all', { limit, offset }] as const,
  },
  posts: {
    all: (limit: number, offset: number, published?: boolean) => 
      ['posts', 'all', { limit, offset, published }] as const,
    byId: (id: string) => ['posts', 'byId', id] as const,
    my: (limit: number, offset: number) => ['posts', 'my', { limit, offset }] as const,
  },
} as const;

export const DEFAULT_QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;
`;

  await fs.writeFile(
    path.join(projectPath, 'src/shared/trpc/constants.ts'),
    constantsContent
  );
}

async function generateTRPCUtilities(frontendPath, config) {
  // Generate tRPC hooks for React
  const hooksContent = `import { trpc } from './client';
import { useState } from 'react';

// Custom hooks that wrap tRPC calls with additional functionality

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();
  
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      // Store token in localStorage
      localStorage.setItem('authToken', data.accessToken);
      localStorage.setItem('userData', JSON.stringify(data.user));
      
      // Invalidate and refetch user data
      utils.auth.me.invalidate();
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      // Store token in localStorage
      localStorage.setItem('authToken', data.accessToken);
      localStorage.setItem('userData', JSON.stringify(data.user));
      
      // Invalidate and refetch user data
      utils.auth.me.invalidate();
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      // Remove token from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      // Clear all cached data
      utils.invalidate();
    },
  });

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ email, password });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await registerMutation.mutateAsync({ name, email, password });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    register,
    logout,
    isLoading: isLoading || loginMutation.isLoading || registerMutation.isLoading || logoutMutation.isLoading,
    error: loginMutation.error || registerMutation.error || logoutMutation.error,
  };
}

export function usePosts() {
  const utils = trpc.useUtils();

  const createMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      // Invalidate posts queries to refetch data
      utils.posts.getAll.invalidate();
      utils.posts.getMyPosts.invalidate();
    },
  });

  const updateMutation = trpc.posts.update.useMutation({
    onSuccess: (data) => {
      // Update the cached post data
      utils.posts.getById.setData({ id: data.id }, data);
      utils.posts.getAll.invalidate();
      utils.posts.getMyPosts.invalidate();
    },
  });

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      // Invalidate posts queries
      utils.posts.getAll.invalidate();
      utils.posts.getMyPosts.invalidate();
    },
  });

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
    error: createMutation.error || updateMutation.error || deleteMutation.error,
  };
}

export function useOptimisticUpdates() {
  const utils = trpc.useUtils();

  const optimisticUpdate = <T>(
    queryKey: any,
    updater: (oldData: T | undefined) => T
  ) => {
    utils.setData(queryKey, updater);
  };

  const revertOptimisticUpdate = (queryKey: any) => {
    utils.invalidate(queryKey);
  };

  return { optimisticUpdate, revertOptimisticUpdate };
}

// Error handling hook
export function useTRPCError() {
  const handleError = (error: any) => {
    if (error?.data?.code === 'UNAUTHORIZED') {
      // Redirect to login or show auth modal
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/auth/login';
    } else if (error?.data?.code === 'FORBIDDEN') {
      // Show forbidden message
      alert('You do not have permission to perform this action');
    } else {
      // Show generic error message
      console.error('tRPC Error:', error);
      alert(error?.message || 'An unexpected error occurred');
    }
  };

  return { handleError };
}
`;

  await fs.writeFile(
    path.join(frontendPath, `${config.frontend === 'nextjs' ? 'lib' : 'src/lib'}/trpc/hooks.ts`),
    hooksContent
  );

  // Generate tRPC error boundary
  const errorBoundaryContent = `import React from 'react';
import { TRPCClientError } from '@trpc/client';

interface TRPCErrorBoundaryState {
  hasError: boolean;
  error?: TRPCClientError<any>;
}

interface TRPCErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: TRPCClientError<any>) => React.ReactNode;
}

export class TRPCErrorBoundary extends React.Component<
  TRPCErrorBoundaryProps,
  TRPCErrorBoundaryState
> {
  constructor(props: TRPCErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): TRPCErrorBoundaryState {
    if (error instanceof TRPCClientError) {
      return { hasError: true, error };
    }
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('tRPC Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error);
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling tRPC errors consistently
export function useTRPCErrorHandler() {
  const handleError = (error: TRPCClientError<any>) => {
    const code = error.data?.code;
    
    switch (code) {
      case 'UNAUTHORIZED':
        // Clear auth and redirect
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/auth/login';
        break;
        
      case 'FORBIDDEN':
        alert('You do not have permission to perform this action');
        break;
        
      case 'NOT_FOUND':
        alert('The requested resource was not found');
        break;
        
      case 'CONFLICT':
        alert('A conflict occurred. Please check your data and try again.');
        break;
        
      case 'TIMEOUT':
        alert('Request timed out. Please try again.');
        break;
        
      default:
        alert(error.message || 'An unexpected error occurred');
    }
  };

  return { handleError };
}
`;

  await fs.writeFile(
    path.join(frontendPath, `${config.frontend === 'nextjs' ? 'lib' : 'src/lib'}/trpc/error-boundary.tsx`),
    errorBoundaryContent
  );
}

module.exports = {
  generateTRPCFiles,
  generateBackendTRPCFiles,
  generateSharedTRPCFiles,
  generateTRPCUtilities
};