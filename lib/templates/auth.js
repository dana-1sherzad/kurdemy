const fs = require('fs-extra');
const path = require('path');

async function generateAuthFiles(projectPath, config) {
  const backendPath = path.join(projectPath, 'src/backend');
  const frontendPath = path.join(projectPath, 'src/frontend');

  // Generate backend authentication files
  await generateBackendAuthFiles(backendPath, config);
  
  if (config.frontend === 'nextjs') {
    // Generate NextAuth.js files for Next.js
    await generateNextAuthFiles(frontendPath, config);
  } else {
    // Generate custom auth files for React
    await generateReactAuthFiles(frontendPath, config);
  }
  
  // Generate shared auth utilities
  await generateSharedAuthFiles(projectPath, config);
}

async function generateBackendAuthFiles(backendPath, config) {
  // Generate JWT strategy (already generated in NestJS template)
  // Generate additional auth guards and decorators
  await generateAuthGuards(backendPath, config);
  await generateAuthDecorators(backendPath, config);
  await generateAuthMiddleware(backendPath, config);
}

async function generateAuthGuards(backendPath, config) {
  // Roles guard
  const rolesGuardContent = `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false;
    }
    
    // Add role checking logic here
    // For now, we'll assume admin role for users with admin email
    const userRole = user.email?.includes('admin') ? Role.ADMIN : Role.USER;
    
    return requiredRoles.some((role) => userRole === role);
  }
}
`;

  await fs.writeFile(
    path.join(backendPath, 'src/modules/auth/guards/roles.guard.ts'),
    rolesGuardContent
  );

  // Rate limit guard
  const rateLimitGuardContent = `import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    
    // Get rate limit options from decorator or use defaults
    const options: RateLimitOptions = this.reflector.get('rateLimit', context.getHandler()) || {
      windowMs: parseInt(this.configService.get('RATE_LIMIT_WINDOW_MS', '900000')), // 15 minutes
      max: parseInt(this.configService.get('RATE_LIMIT_MAX_REQUESTS', '100')),
    };

    const key = \`\${ip}_\${context.getClass().name}_\${context.getHandler().name}\`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Reset window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return true;
    }

    if (record.count >= options.max) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }
}
`;

  await fs.writeFile(
    path.join(backendPath, 'src/modules/auth/guards/rate-limit.guard.ts'),
    rateLimitGuardContent
  );

  // API Key guard
  const apiKeyGuardContent = `import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.query.apiKey;
    
    const validApiKeys = this.configService.get<string>('API_KEYS', '').split(',').filter(Boolean);
    
    if (!apiKey || !validApiKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }
    
    return true;
  }
}
`;

  await fs.writeFile(
    path.join(backendPath, 'src/modules/auth/guards/api-key.guard.ts'),
    apiKeyGuardContent
  );
}

async function generateAuthDecorators(backendPath, config) {
  // Roles decorator
  const rolesDecoratorContent = `import { SetMetadata } from '@nestjs/common';
import { Role } from '../guards/roles.guard';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
`;

  await fs.writeFile(
    path.join(backendPath, 'src/modules/auth/decorators/roles.decorator.ts'),
    rolesDecoratorContent
  );

  // Rate limit decorator
  const rateLimitDecoratorContent = `import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata('rateLimit', options);
`;

  await fs.writeFile(
    path.join(backendPath, 'src/modules/auth/decorators/rate-limit.decorator.ts'),
    rateLimitDecoratorContent
  );

  // Public route decorator
  const publicDecoratorContent = `import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
`;

  await fs.writeFile(
    path.join(backendPath, 'src/modules/auth/decorators/public.decorator.ts'),
    publicDecoratorContent
  );
}

async function generateAuthMiddleware(backendPath, config) {
  // Logging middleware
  const loggingMiddlewareContent = `import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('User-Agent') || '';

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const duration = Date.now() - start;

      const logMessage = \`\${method} \${originalUrl} \${statusCode} \${contentLength || 0}b - \${duration}ms - \${ip} \${userAgent}\`;

      if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
`;

  await fs.writeFile(
    path.join(backendPath, 'src/common/middleware/logging.middleware.ts'),
    loggingMiddlewareContent
  );

  // CORS middleware
  const corsMiddlewareContent = `import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const allowedOrigins = this.configService.get<string>('CORS_ORIGIN', 'http://localhost:3000').split(',');
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-API-Key');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  }
}
`;

  await fs.writeFile(
    path.join(backendPath, 'src/common/middleware/cors.middleware.ts'),
    corsMiddlewareContent
  );
}

async function generateNextAuthFiles(frontendPath, config) {
  // NextAuth configuration
  const nextAuthConfigContent = `import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import DiscordProvider from 'next-auth/providers/discord';
${config.orm === 'prisma' ? "import { PrismaAdapter } from '@next-auth/prisma-adapter';\nimport { prisma } from './prisma';" : ''}

export const authOptions: NextAuthOptions = {
  ${config.orm === 'prisma' ? 'adapter: PrismaAdapter(prisma),' : ''}
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        try {
          const response = await fetch(\`\${process.env.NEXTAUTH_URL}/api/auth/login\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            throw new Error('Invalid credentials');
          }

          const data = await response.json();
          
          if (data.user) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              accessToken: data.accessToken,
            };
          }

          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    }),
    
    // OAuth providers (configure these in your environment variables)
    ...(process.env.GOOGLE_CLIENT_ID ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    
    ...(process.env.GITHUB_CLIENT_ID ? [
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      })
    ] : []),
    
    ...(process.env.DISCORD_CLIENT_ID ? [
      DiscordProvider({
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
      })
    ] : []),
  ],
  
  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register',
    error: '/auth/error',
  },
  
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.accessToken = user.accessToken;
      }
      
      if (account) {
        token.accessToken = account.access_token;
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.accessToken = token.accessToken as string;
      }
      
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return \`\${baseUrl}\${url}\`;
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  
  debug: process.env.NODE_ENV === 'development',
};
`;

  await fs.writeFile(
    path.join(frontendPath, 'lib/auth/config.ts'),
    nextAuthConfigContent
  );

  // NextAuth types
  const nextAuthTypesContent = `import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
    accessToken: string;
  }

  interface User extends DefaultUser {
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    accessToken: string;
  }
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'types/next-auth.d.ts'),
    nextAuthTypesContent
  );

  // Auth hooks for Next.js
  const nextAuthHooksContent = `'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const login = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    return result;
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    // Auto-login after registration
    return login(email, password);
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  return {
    user: session?.user,
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    login,
    register,
    logout,
  };
}

export function useRequireAuth(redirectTo = '/auth/login') {
  const { session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push(redirectTo);
    }
  }, [session, status, router, redirectTo]);

  return { session, status };
}

export function useRedirectIfAuthenticated(redirectTo = '/dashboard') {
  const { session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (session) {
      router.push(redirectTo);
    }
  }, [session, status, router, redirectTo]);

  return { session, status };
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'lib/auth/hooks.ts'),
    nextAuthHooksContent
  );

  // Protected route component for Next.js
  const protectedRouteContent = `'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  fallback, 
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push(redirectTo);
    }
  }, [session, status, router, redirectTo]);

  if (status === 'loading') {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return fallback || null;
  }

  return <>{children}</>;
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'components/auth/ProtectedRoute.tsx'),
    protectedRouteContent
  );

  // Authentication API routes for Next.js
  const registerApiContent = `import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
${config.orm === 'prisma' ? "import { prisma } from '@/lib/prisma';" : "import { db } from '@/lib/db';"}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    ${config.orm === 'prisma' ? `
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    ` : `
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });
    `}

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    ${config.orm === 'prisma' ? `
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    ` : `
    const [user] = await db.insert(users).values({
      id: crypto.randomUUID(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    });
    `}

    return NextResponse.json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'app/api/auth/register/route.ts'),
    registerApiContent
  );
}

async function generateReactAuthFiles(frontendPath, config) {
  // Auth context for React (already generated in React template)
  // Generate additional auth utilities for React
  const authUtilsContent = `export const AUTH_STORAGE_KEY = 'authToken';
export const USER_STORAGE_KEY = 'userData';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(\`\${this.baseUrl}/auth/login\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    
    // Store auth data
    this.setAuthData(data);
    
    return data;
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(\`\${this.baseUrl}/auth/register\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    
    // Store auth data
    this.setAuthData(data);
    
    return data;
  }

  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(\`\${this.baseUrl}/auth/logout\`, {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${token}\`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await fetch(\`\${this.baseUrl}/auth/refresh\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.clearAuthData();
        return null;
      }

      const data = await response.json();
      localStorage.setItem(AUTH_STORAGE_KEY, data.accessToken);
      
      return data.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuthData();
      return null;
    }
  }

  async getProfile(): Promise<User | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await fetch(\`\${this.baseUrl}/users/profile\`, {
        headers: {
          'Authorization': \`Bearer \${token}\`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuthData();
        }
        return null;
      }

      return response.json();
    } catch (error) {
      console.error('Get profile error:', error);
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEY);
  }

  getUser(): User | null {
    const userData = localStorage.getItem(USER_STORAGE_KEY);
    if (!userData) return null;

    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private setAuthData(data: AuthResponse): void {
    localStorage.setItem(AUTH_STORAGE_KEY, data.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  }

  private clearAuthData(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export const authService = new AuthService();

// HTTP interceptor for automatic token attachment
export function createAuthenticatedFetch() {
  return async (url: string, options: RequestInit = {}) => {
    const token = authService.getToken();
    
    const headers = {
      ...options.headers,
      ...(token && { Authorization: \`Bearer \${token}\` }),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token expiration
    if (response.status === 401 && token) {
      const newToken = await authService.refreshToken();
      
      if (newToken) {
        // Retry with new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: \`Bearer \${newToken}\`,
          },
        });
      } else {
        // Redirect to login or handle logout
        window.location.href = '/auth/login';
      }
    }

    return response;
  };
}

export const authenticatedFetch = createAuthenticatedFetch();
`;

  await fs.writeFile(
    path.join(frontendPath, 'src/lib/auth/service.ts'),
    authUtilsContent
  );

  // Auth forms for React
  const authFormsContent = `import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}

interface RegisterFormProps {
  onSubmit: (name: string, email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export function RegisterForm({ onSubmit, isLoading, error }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long');
      return;
    }

    await onSubmit(name, email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || validationError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error || validationError}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your password"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Confirm your password"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'src/components/auth/AuthForms.tsx'),
    authFormsContent
  );
}

async function generateSharedAuthFiles(projectPath, config) {
  // Shared auth types
  const authTypesContent = `// Shared authentication types

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  role?: 'user' | 'admin' | 'moderator';
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

// Error types
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export const AuthErrorCodes = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  RATE_LIMITED: 'RATE_LIMITED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
} as const;

// Permission types
export type Permission = 
  | 'read:posts'
  | 'write:posts'
  | 'delete:posts'
  | 'read:users'
  | 'write:users'
  | 'delete:users'
  | 'admin:all';

export interface Role {
  name: string;
  permissions: Permission[];
}

// Session types
export interface SessionData {
  user: User;
  permissions: Permission[];
  expiresAt: Date;
}
`;

  await fs.writeFile(
    path.join(projectPath, 'src/shared/types/auth.ts'),
    authTypesContent
  );

  // Auth validation utilities
  const authValidationContent = `import { z } from 'zod';

// Validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  email: z.string().email('Invalid email address').optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Validation functions
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (password.length > 100) {
    errors.push('Password must be less than 100 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Rate limiting helpers
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return {
    isAllowed(identifier: string): boolean {
      const now = Date.now();
      const record = attempts.get(identifier);

      if (!record || now > record.resetTime) {
        attempts.set(identifier, { count: 1, resetTime: now + windowMs });
        return true;
      }

      if (record.count >= maxAttempts) {
        return false;
      }

      record.count++;
      return true;
    },

    getRemainingTime(identifier: string): number {
      const record = attempts.get(identifier);
      if (!record) return 0;
      
      return Math.max(0, record.resetTime - Date.now());
    },

    reset(identifier: string): void {
      attempts.delete(identifier);
    },
  };
}

// Common auth utilities
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function isTokenExpired(expiresAt: Date | string | number): boolean {
  const expiration = new Date(expiresAt);
  return expiration.getTime() < Date.now();
}

export function getTokenExpirationTime(token: string): Date | null {
  try {
    // For JWT tokens, decode the payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}
`;

  await fs.writeFile(
    path.join(projectPath, 'src/shared/utils/auth.ts'),
    authValidationContent
  );

  // Auth constants
  const authConstantsContent = `// Authentication constants

export const AUTH_CONSTANTS = {
  TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour in milliseconds
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPT_WINDOW: 15 * 60 * 1000, // 15 minutes
  EMAIL_VERIFICATION_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_EXPIRY: 60 * 60 * 1000, // 1 hour
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  REMEMBER_ME: 'remember_me',
  LAST_ACTIVITY: 'last_activity',
} as const;

export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
  PROFILE: '/api/auth/profile',
  CHANGE_PASSWORD: '/api/auth/change-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  VERIFY_EMAIL: '/api/auth/verify-email',
  RESEND_VERIFICATION: '/api/auth/resend-verification',
} as const;

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
} as const;

export const PERMISSIONS = {
  READ_POSTS: 'read:posts',
  WRITE_POSTS: 'write:posts',
  DELETE_POSTS: 'delete:posts',
  READ_USERS: 'read:users',
  WRITE_USERS: 'write:users',
  DELETE_USERS: 'delete:users',
  ADMIN_ALL: 'admin:all',
} as const;

export const DEFAULT_ROLE_PERMISSIONS = {
  [USER_ROLES.USER]: [
    PERMISSIONS.READ_POSTS,
    PERMISSIONS.WRITE_POSTS,
  ],
  [USER_ROLES.MODERATOR]: [
    PERMISSIONS.READ_POSTS,
    PERMISSIONS.WRITE_POSTS,
    PERMISSIONS.DELETE_POSTS,
    PERMISSIONS.READ_USERS,
  ],
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.ADMIN_ALL,
  ],
} as const;

// Error messages
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User with this email already exists',
  EMAIL_NOT_VERIFIED: 'Please verify your email address',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  TOKEN_INVALID: 'Invalid authentication token',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  RATE_LIMITED: 'Too many attempts. Please try again later.',
  ACCOUNT_DISABLED: 'Your account has been disabled',
  PASSWORD_MISMATCH: 'Current password is incorrect',
  EMAIL_SEND_FAILED: 'Failed to send email. Please try again.',
  VERIFICATION_FAILED: 'Email verification failed',
} as const;
`;

  await fs.writeFile(
    path.join(projectPath, 'src/shared/constants/auth.ts'),
    authConstantsContent
  );
}

module.exports = {
  generateAuthFiles,
  generateBackendAuthFiles,
  generateNextAuthFiles,
  generateReactAuthFiles,
  generateSharedAuthFiles
};