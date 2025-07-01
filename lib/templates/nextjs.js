const fs = require('fs-extra');
const path = require('path');

async function generateNextJSFiles(projectPath, config) {
  const frontendPath = path.join(projectPath, 'src/frontend');

  // Create Next.js configuration files
  await generateNextConfig(frontendPath, config);
  
  // Create app directory structure (App Router)
  await generateAppDirectory(frontendPath, config);
  
  // Create components
  await generateComponents(frontendPath, config);
  
  // Create lib utilities
  await generateLibFiles(frontendPath, config);
  
  // Create public assets
  await generatePublicFiles(frontendPath);
  
  // Create TypeScript config
  await generateTypeScriptConfig(frontendPath);
}

async function generateNextConfig(frontendPath, config) {
  const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    CUSTOM_KEY: 'my-value',
  },
  ${config.trpc ? `
  // Configure for tRPC
  async rewrites() {
    return [
      {
        source: '/api/trpc/:path*',
        destination: 'http://localhost:4000/api/trpc/:path*',
      },
    ];
  },` : ''}
  images: {
    domains: ['localhost'],
  },
  eslint: {
    dirs: ['app', 'components', 'lib'],
  },
}

module.exports = nextConfig;
`;

  await fs.writeFile(path.join(frontendPath, 'next.config.js'), nextConfigContent);
}

async function generateAppDirectory(frontendPath, config) {
  // layout.tsx (Root Layout)
  const layoutContent = `import './globals.css'
import { Inter } from 'next/font/google'
${config.trpc ? "import { TrpcProvider } from '@/lib/trpc/provider'" : ''}
${config.auth ? "import { AuthProvider } from '@/lib/auth/provider'" : ''}

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Kurdemy App',
  description: 'A modern fullstack application built with Kurdemy stack',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        ${config.auth ? '<AuthProvider>' : ''}
        ${config.trpc ? '<TrpcProvider>' : ''}
          {children}
        ${config.trpc ? '</TrpcProvider>' : ''}
        ${config.auth ? '</AuthProvider>' : ''}
      </body>
    </html>
  )
}
`;

  await fs.writeFile(path.join(frontendPath, 'app/layout.tsx'), layoutContent);

  // page.tsx (Home Page)
  const pageContent = `import { Navbar } from '@/components/ui/navbar'
import { Hero } from '@/components/sections/hero'
import { Features } from '@/components/sections/features'
import { Footer } from '@/components/ui/footer'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </main>
  )
}
`;

  await fs.writeFile(path.join(frontendPath, 'app/page.tsx'), pageContent);

  // loading.tsx
  const loadingContent = `export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  )
}
`;

  await fs.writeFile(path.join(frontendPath, 'app/loading.tsx'), loadingContent);

  // error.tsx
  const errorContent = `'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  )
}
`;

  await fs.writeFile(path.join(frontendPath, 'app/error.tsx'), errorContent);

  // globals.css
  const globalsCssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

  await fs.writeFile(path.join(frontendPath, 'app/globals.css'), globalsCssContent);

  // Generate API routes if needed
  if (!config.trpc) {
    await generateApiRoutes(frontendPath, config);
  }

  // Generate auth pages if auth is enabled
  if (config.auth) {
    await generateAuthPages(frontendPath);
  }
}

async function generateApiRoutes(frontendPath, config) {
  // API route for health check
  const healthRouteContent = `import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'app/api/health/route.ts'),
    healthRouteContent
  );
}

async function generateAuthPages(frontendPath) {
  // Login page
  const loginPageContent = `'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/dashboard')
      } else {
        alert('Invalid credentials')
      }
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 rounded-t-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 rounded-b-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/auth/register" className="text-blue-600 hover:text-blue-500">
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'app/auth/login/page.tsx'),
    loginPageContent
  );

  // Register page
  const registerPageContent = `'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (response.ok) {
        router.push('/auth/login')
      } else {
        const error = await response.json()
        alert(error.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 rounded-t-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Full name"
              />
            </div>
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 rounded-b-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-500">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'app/auth/register/page.tsx'),
    registerPageContent
  );
}

async function generateComponents(frontendPath, config) {
  // Navbar component
  const navbarContent = `'use client'

import Link from 'next/link'
import { useState } from 'react'
${config.auth ? "import { useSession, signOut } from 'next-auth/react'" : ''}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  ${config.auth ? "const { data: session } = useSession()" : ''}

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Kurdemy
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600">
              Home
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-blue-600">
              About
            </Link>
            ${config.auth ? `
            {session ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, {session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-blue-600"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </div>
            )}` : `
            <Link
              href="/contact"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Contact
            </Link>`}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
            <Link href="/" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
              Home
            </Link>
            <Link href="/about" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
              About
            </Link>
            ${config.auth ? `
            {session ? (
              <>
                <span className="block px-3 py-2 text-gray-700">Welcome, {session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="block w-full text-left px-3 py-2 text-red-600 hover:text-red-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                  Sign In
                </Link>
                <Link href="/auth/register" className="block px-3 py-2 text-blue-600 hover:text-blue-700">
                  Sign Up
                </Link>
              </>
            )}` : `
            <Link href="/contact" className="block px-3 py-2 text-blue-600 hover:text-blue-700">
              Contact
            </Link>`}
          </div>
        </div>
      )}
    </nav>
  )
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'components/ui/navbar.tsx'),
    navbarContent
  );

  // Hero section component
  const heroContent = `export function Hero() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to Kurdemy
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            A modern fullstack application built with the latest technologies.
            Experience the power of NestJS, Next.js, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Get Started
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'components/sections/hero.tsx'),
    heroContent
  );

  // Features section component
  const featuresContent = `export function Features() {
  const features = [
    {
      title: 'Full-stack TypeScript',
      description: 'End-to-end type safety with TypeScript across frontend and backend.',
      icon: '🔧',
    },
    {
      title: 'Modern Architecture',
      description: 'Built with NestJS for scalable backend and Next.js for powerful frontend.',
      icon: '🏗️',
    },
    {
      title: 'Database Ready',
      description: 'Integrated with ${config.orm === 'prisma' ? 'Prisma' : 'Drizzle ORM'} for seamless database operations.',
      icon: '🗄️',
    },
    ${config.trpc ? `{
      title: 'Type-safe APIs',
      description: 'tRPC provides end-to-end type safety for your API calls.',
      icon: '🔒',
    },` : ''}
    ${config.auth ? `{
      title: 'Authentication',
      description: 'Built-in authentication system with NextAuth.js.',
      icon: '🔐',
    },` : ''}
    {
      title: 'Developer Experience',
      description: 'Hot reload, linting, testing, and more for an amazing developer experience.',
      icon: '⚡',
    },
  ]

  return (
    <div className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Kurdemy?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Built with modern technologies and best practices to help you ship faster.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'components/sections/features.tsx'),
    featuresContent
  );

  // Footer component
  const footerContent = `export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold mb-4">Kurdemy</h3>
            <p className="text-gray-400 mb-4">
              A modern fullstack application template built with the latest technologies.
              Start building amazing applications today.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/" className="hover:text-white">Home</a></li>
              <li><a href="/about" className="hover:text-white">About</a></li>
              <li><a href="/contact" className="hover:text-white">Contact</a></li>
              <li><a href="/docs" className="hover:text-white">Documentation</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="https://github.com" className="hover:text-white">GitHub</a></li>
              <li><a href="/api/docs" className="hover:text-white">API Docs</a></li>
              <li><a href="/support" className="hover:text-white">Support</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Kurdemy. Built with ❤️ using Kurdemy Stack.</p>
        </div>
      </div>
    </footer>
  )
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'components/ui/footer.tsx'),
    footerContent
  );
}

async function generateLibFiles(frontendPath, config) {
  // Utils
  const utilsContent = `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
`;

  await fs.writeFile(path.join(frontendPath, 'lib/utils.ts'), utilsContent);

  // Generate tRPC files if enabled
  if (config.trpc) {
    await generateTRPCClientFiles(frontendPath);
  }

  // Generate auth files if enabled
  if (config.auth) {
    await generateAuthClientFiles(frontendPath);
  }
}

async function generateTRPCClientFiles(frontendPath) {
  // tRPC provider
  const trpcProviderContent = `'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import React, { useState } from 'react'
import { trpc } from './client'

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: process.env.NEXT_PUBLIC_TRPC_URL || 'http://localhost:4000/api/trpc',
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'lib/trpc/provider.tsx'),
    trpcProviderContent
  );

  // tRPC client
  const trpcClientContent = `import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/../../backend/src/trpc/app.router'

export const trpc = createTRPCReact<AppRouter>()
`;

  await fs.writeFile(
    path.join(frontendPath, 'lib/trpc/client.ts'),
    trpcClientContent
  );
}

async function generateAuthClientFiles(frontendPath) {
  // Auth provider
  const authProviderContent = `'use client'

import { SessionProvider } from 'next-auth/react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
`;

  await fs.writeFile(
    path.join(frontendPath, 'lib/auth/provider.tsx'),
    authProviderContent
  );

  // NextAuth API route
  const nextAuthApiContent = `import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Here you would typically verify the credentials with your backend
        const response = await fetch(\`\${process.env.API_URL}/auth/login\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        })

        if (!response.ok) {
          return null
        }

        const data = await response.json()
        
        if (data.user) {
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
          }
        }

        return null
      }
    })
  ],
  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})

export { handler as GET, handler as POST }
`;

  await fs.writeFile(
    path.join(frontendPath, 'app/api/auth/[...nextauth]/route.ts'),
    nextAuthApiContent
  );
}

async function generatePublicFiles(frontendPath) {
  // Create a simple favicon placeholder
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#2563eb"/>
  <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">K</text>
</svg>`;

  await fs.writeFile(path.join(frontendPath, 'public/favicon.svg'), faviconSvg);

  // robots.txt
  const robotsContent = `User-agent: *
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml
`;

  await fs.writeFile(path.join(frontendPath, 'public/robots.txt'), robotsContent);
}

async function generateTypeScriptConfig(frontendPath) {
  const tsconfigContent = {
    "compilerOptions": {
      "target": "es5",
      "lib": ["dom", "dom.iterable", "es6"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "plugins": [
        {
          "name": "next"
        }
      ],
      "baseUrl": ".",
      "paths": {
        "@/*": ["./*"]
      }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules"]
  };

  await fs.writeFile(
    path.join(frontendPath, 'tsconfig.json'),
    JSON.stringify(tsconfigContent, null, 2)
  );

  // next-env.d.ts
  const nextEnvContent = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`;

  await fs.writeFile(path.join(frontendPath, 'next-env.d.ts'), nextEnvContent);
}

module.exports = {
  generateNextJSFiles,
  generateAppDirectory,
  generateComponents,
  generateLibFiles
};