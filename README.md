# Create Kurdemy App

<div align="center">

<img src="https://i.ibb.co/ztkwj4k/logo.jpg" alt="Kurdemy Logo" width="150"/>

**Create modern fullstack applications with the Kurdemy stack**

[![npm version](https://badge.fury.io/js/create-kurdemy-app.svg)](https://badge.fury.io/js/create-kurdemy-app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

</div>

## ✨ What is Kurdemy?

Kurdemy is a modern, opinionated fullstack application generator that creates production-ready applications with the best practices and latest technologies. It combines the power of **NestJS** for the backend, **Next.js** or **React** for the frontend, and your choice of database with **Prisma** or **Drizzle ORM**.

## 🚀 Quick Start

```bash
npx create-kurdemy-app my-awesome-app
cd my-awesome-app
npm run dev
```

That's it! Your fullstack application is ready at `http://localhost:3000` 🎉

## 🎯 Features

### 🏗️ **Modern Architecture**
- **Backend**: NestJS with TypeScript
- **Frontend**: Next.js or React.js with TypeScript
- **Database**: PostgreSQL, MySQL, SQLite, or SQL Server
- **ORM**: Prisma or Drizzle ORM
- **API**: REST + optional tRPC for type-safe communication

### 🔐 **Authentication Ready**
- NextAuth.js integration for Next.js apps
- Custom JWT-based auth for React apps
- Multiple OAuth providers support
- Role-based access control

### 🎨 **Beautiful UI**
- Tailwind CSS with custom design system
- Pre-built component library
- Dark mode support
- Responsive design out of the box

### 🛠️ **Developer Experience**
- End-to-end TypeScript
- Hot reload for frontend and backend
- ESLint + Prettier configuration
- Husky git hooks
- GitHub Actions CI/CD

### 📦 **Production Ready**
- Docker configuration
- Database migrations
- Health checks
- Logging and monitoring
- Security best practices

## 🔧 Technology Stack

| Category | Technologies |
|----------|-------------|
| **Backend** | NestJS, TypeScript, Express |
| **Frontend** | Next.js 13+ (App Router) or React 18+ |
| **Database** | PostgreSQL, MySQL, SQLite, SQL Server |
| **ORM** | Prisma or Drizzle ORM |
| **API** | REST APIs + tRPC (optional) |
| **Auth** | NextAuth.js or custom JWT |
| **Styling** | Tailwind CSS + Custom Components |
| **Testing** | Jest + Testing Library |
| **DevOps** | Docker, GitHub Actions |

## 📖 Usage

### Interactive Setup

```bash
npx create-kurdemy-app
```

The CLI will guide you through the setup process:

1. **Project Name** - Choose your project name
2. **Frontend Framework** - Next.js (recommended) or React.js
3. **Database** - PostgreSQL, MySQL, SQLite, or SQL Server
4. **ORM** - Prisma (recommended) or Drizzle
5. **Features** - tRPC, Authentication, Tailwind CSS
6. **Package Manager** - npm, yarn, or pnpm

### Command Line Options

```bash
npx create-kurdemy-app my-app --frontend nextjs --database postgresql --orm prisma --trpc --auth --tailwind
```

#### Available Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--frontend` | `nextjs`, `react` | `nextjs` | Frontend framework |
| `--database` | `postgresql`, `mysql`, `sqlite`, `sqlserver` | `postgresql` | Database type |
| `--orm` | `prisma`, `drizzle` | `prisma` | ORM choice |
| `--trpc` | `true`, `false` | `true` | Include tRPC |
| `--auth` | `true`, `false` | `true` | Include authentication |
| `--tailwind` | `true`, `false` | `true` | Include Tailwind CSS |
| `--package-manager` | `npm`, `yarn`, `pnpm` | `npm` | Package manager |

## 🏃‍♂️ Getting Started

After creating your project:

### 1. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database configuration
vim .env
```

### 2. Set Up Database

```bash
# Push database schema
npm run db:push

# Seed with sample data (optional)
npm run db:seed
```

### 3. Start Development

```bash
# Start both frontend and backend
npm run dev

# Or start separately
npm run dev:backend  # Backend on :4000
npm run dev:frontend # Frontend on :3000
```

### 4. Open Your App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api
- **API Documentation**: http://localhost:4000/api/docs

## 📁 Project Structure

```
my-kurdemy-app/
├── src/
│   ├── backend/                 # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/         # Feature modules
│   │   │   │   ├── auth/        # Authentication
│   │   │   │   └── users/       # User management
│   │   │   ├── common/          # Shared utilities
│   │   │   ├── config/          # Configuration
│   │   │   └── trpc/            # tRPC setup (if enabled)
│   │   └── package.json
│   ├── frontend/                # Next.js/React frontend
│   │   ├── components/          # React components
│   │   ├── pages/               # Pages/routes
│   │   ├── lib/                 # Utilities
│   │   └── package.json
│   └── shared/                  # Shared code
│       ├── types/               # TypeScript types
│       └── utils/               # Shared utilities
├── prisma/                      # Database schema (if Prisma)
├── scripts/                     # Development scripts
├── docker-compose.dev.yml       # Development Docker setup
├── docker-compose.prod.yml      # Production Docker setup
├── .env.example                 # Environment template
└── package.json                 # Root package.json
```

## 🎨 UI Components

Kurdemy comes with a beautiful, accessible component library:

```tsx
import { Button, Card, Input, Modal } from '@/components/ui';

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter your name" />
      <Button variant="primary">Save</Button>
    </Card>
  );
}
```

### Available Components

- **Button** - Various styles and sizes
- **Input** - Form inputs with validation
- **Card** - Content containers
- **Modal** - Accessible dialogs
- **Toast** - Notifications
- **Loading** - Loading states

## 🔐 Authentication

### NextAuth.js (Next.js)

```tsx
import { useSession } from 'next-auth/react';

function Profile() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <p>Loading...</p>;
  if (!session) return <p>Not logged in</p>;
  
  return <p>Welcome, {session.user.name}!</p>;
}
```

### Custom Auth (React)

```tsx
import { useAuth } from '@/lib/auth';

function Profile() {
  const { user, login, logout } = useAuth();
  
  if (!user) return <LoginForm onLogin={login} />;
  
  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## 🌐 API Development

### REST APIs (NestJS)

```typescript
@Controller('posts')
export class PostsController {
  @Get()
  findAll(): Promise<Post[]> {
    return this.postsService.findAll();
  }
  
  @Post()
  create(@Body() createPostDto: CreatePostDto): Promise<Post> {
    return this.postsService.create(createPostDto);
  }
}
```

### tRPC (Type-safe APIs)

```typescript
// Backend router
export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.post.findMany();
  }),
  
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.post.create({ data: input });
    }),
});
```

```tsx
// Frontend usage
import { trpc } from '@/lib/trpc';

function Posts() {
  const { data: posts } = trpc.posts.getAll.useQuery();
  const createPost = trpc.posts.create.useMutation();
  
  return (
    <div>
      {posts?.map(post => <div key={post.id}>{post.title}</div>)}
      <button onClick={() => createPost.mutate({ title: 'New Post' })}>
        Add Post
      </button>
    </div>
  );
}
```

## 🗄️ Database

### Prisma Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("posts")
}
```

### Database Commands

```bash
# Development
npm run db:push          # Push schema changes
npm run db:studio        # Open database studio
npm run db:seed          # Seed with sample data

# Production
npm run db:migrate       # Run migrations
npm run db:reset         # Reset database
```

## 🐳 Docker Deployment

### Development

```bash
# Start development environment
npm run docker:dev

# Services available:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:4000
# - Database: localhost:5432 (PostgreSQL)
# - Adminer: http://localhost:8080
```

### Production

```bash
# Build and deploy
npm run docker:prod

# Application available at http://localhost
```

## 📜 Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start frontend only
npm run dev:backend      # Start backend only

# Building
npm run build            # Build both applications
npm run build:frontend   # Build frontend
npm run build:backend    # Build backend

# Production
npm run start            # Start production servers
npm run start:frontend   # Start frontend production
npm run start:backend    # Start backend production

# Database
npm run db:push          # Push schema to database
npm run db:studio        # Open database studio
npm run db:seed          # Seed database
npm run db:migrate       # Run migrations (Prisma)
npm run db:reset         # Reset database

# Code Quality
npm run lint             # Lint all code
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Docker
npm run docker:dev       # Start development environment
npm run docker:prod      # Start production environment
npm run docker:cleanup   # Clean up Docker resources

# Utilities
npm run clean            # Clean build artifacts
npm run health-check     # Check application health
```

## 🎯 Examples

### Blog Application

```bash
npx create-kurdemy-app my-blog --template blog
```

### E-commerce Platform

```bash
npx create-kurdemy-app my-store --template ecommerce
```

### SaaS Application

```bash
npx create-kurdemy-app my-saas --template saas
```

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/kurdemy/create-kurdemy-app.git
cd create-kurdemy-app

# Install dependencies
npm install

# Link for local development
npm link

# Test the CLI
create-kurdemy-app test-app
```

## 📚 Documentation

- [Getting Started Guide](docs/getting-started.md)
- [Configuration Reference](docs/configuration.md)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

## 🐛 Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill processes on ports 3000 and 4000
npx kill-port 3000 4000
```

**Database connection issues**
```bash
# Check database status
npm run health-check

# Reset database
npm run db:reset
```

**Build failures**
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Getting Help

- 📖 [Documentation](https://docs.kurdemy.com)
- 💬 [Discord Community](https://discord.gg/kurdemy)
- 🐛 [GitHub Issues](https://github.com/kurdemy/create-kurdemy-app/issues)
- 📧 [Email Support](mailto:support@kurdemy.com)

## 🗺️ Roadmap

### Current (v1.0)
- ✅ Core CLI functionality
- ✅ NestJS + Next.js/React integration
- ✅ Database support (Prisma/Drizzle)
- ✅ Authentication systems
- ✅ Docker deployment
- ✅ Component library

### Upcoming (v1.1)
- 🔄 GraphQL support
- 🔄 Real-time features (WebSockets)
- 🔄 File upload handling
- 🔄 Payment integration
- 🔄 Admin dashboard generator

### Future (v2.0)
- 🔮 Mobile app generation (React Native)
- 🔮 Microservices architecture
- 🔮 AI/ML integration templates
- 🔮 Plugin ecosystem

## ⭐ Showcase

Built something awesome with Kurdemy? [Share it with us!](https://github.com/kurdemy/create-kurdemy-app/discussions/categories/showcase)

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 💖 Acknowledgments

Kurdemy is inspired by and builds upon these amazing projects:

- [Create React App](https://create-react-app.dev/) - The original inspiration
- [Next.js](https://nextjs.org/) - Amazing React framework
- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Prisma](https://prisma.io/) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs

---

<div align="center">

**Made with ❤️ by the Kurdemy Team**

[Website](https://kurdemy.com) • [Documentation](https://docs.kurdemy.com) • [Twitter](https://twitter.com/kurdemy) • [Discord](https://discord.gg/kurdemy)

</div>