const fs = require('fs-extra');
const path = require('path');

async function generateEnvFiles(projectPath, config) {
  await generateMainEnvFiles(projectPath, config);
  await generateBackendEnvFiles(projectPath, config);
  await generateFrontendEnvFiles(projectPath, config);
}

async function generateMainEnvFiles(projectPath, config) {
  // Generate .env file with actual values
  const envContent = generateEnvContent(config, false);
  await fs.writeFile(path.join(projectPath, '.env'), envContent);

  // Generate .env.example file with placeholder values
  const envExampleContent = generateEnvContent(config, true);
  await fs.writeFile(path.join(projectPath, '.env.example'), envExampleContent);

  // Generate .env.local for local development overrides
  const envLocalContent = `# Local development overrides
# This file is ignored by git and can contain sensitive data

# Override any production settings here for local development
# NODE_ENV=development
`;
  await fs.writeFile(path.join(projectPath, '.env.local'), envLocalContent);

  // Generate .gitignore
  const gitignoreContent = `# Dependencies
node_modules/
*/node_modules/

# Production builds
dist/
build/
.next/
out/

# Environment variables
.env
.env.local
.env.*.local

# Database
*.db
*.sqlite

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary folders
tmp/
temp/

# Database
prisma/dev.db*

# tRPC
.trpc/

# Next.js
.next/
out/

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
`;
  await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
}

function generateEnvContent(config, isExample = false) {
  let content = `# Kurdemy Stack Environment Configuration
# ${isExample ? 'EXAMPLE FILE - Copy to .env and fill in actual values' : 'Production Environment Variables'}

# Node Environment
NODE_ENV=${isExample ? 'development' : 'development'}

# Application
APP_NAME=${isExample ? 'My Kurdemy App' : 'My Kurdemy App'}
APP_URL=${isExample ? 'http://localhost:3000' : 'http://localhost:3000'}
API_URL=${isExample ? 'http://localhost:3000/api' : 'http://localhost:3000/api'}

# Server Configuration
PORT=${isExample ? '3000' : '3000'}
BACKEND_PORT=${isExample ? '4000' : '4000'}

`;

  // Database configuration
  content += generateDatabaseEnvContent(config, isExample);

  // Authentication configuration
  if (config.auth) {
    content += generateAuthEnvContent(config, isExample);
  }

  // tRPC configuration
  if (config.trpc) {
    content += generateTRPCEnvContent(config, isExample);
  }

  // Additional environment variables
  content += `
# Security
JWT_SECRET=${isExample ? 'your-super-secret-jwt-key-change-this-in-production' : 'your-super-secret-jwt-key-change-this-in-production'}
ENCRYPTION_KEY=${isExample ? 'your-encryption-key-32-characters-long' : 'your-encryption-key-32-characters-long'}

# CORS
CORS_ORIGIN=${isExample ? 'http://localhost:3000' : 'http://localhost:3000'}

# Logging
LOG_LEVEL=${isExample ? 'debug' : 'info'}

# File uploads (if needed)
MAX_FILE_SIZE=${isExample ? '10485760' : '10485760'} # 10MB in bytes
UPLOAD_PATH=${isExample ? './uploads' : './uploads'}
`;

  return content;
}

function generateDatabaseEnvContent(config, isExample) {
  let content = `# Database Configuration
`;

  switch (config.database) {
    case 'postgresql':
      content += `DATABASE_URL=${isExample 
        ? 'postgresql://username:password@localhost:5432/kurdemy_db'
        : 'postgresql://username:password@localhost:5432/kurdemy_db'
      }
POSTGRES_HOST=${isExample ? 'localhost' : 'localhost'}
POSTGRES_PORT=${isExample ? '5432' : '5432'}
POSTGRES_USER=${isExample ? 'username' : 'username'}
POSTGRES_PASSWORD=${isExample ? 'password' : 'password'}
POSTGRES_DB=${isExample ? 'kurdemy_db' : 'kurdemy_db'}
`;
      break;

    case 'mysql':
      content += `DATABASE_URL=${isExample 
        ? 'mysql://username:password@localhost:3306/kurdemy_db'
        : 'mysql://username:password@localhost:3306/kurdemy_db'
      }
MYSQL_HOST=${isExample ? 'localhost' : 'localhost'}
MYSQL_PORT=${isExample ? '3306' : '3306'}
MYSQL_USER=${isExample ? 'username' : 'username'}
MYSQL_PASSWORD=${isExample ? 'password' : 'password'}
MYSQL_DATABASE=${isExample ? 'kurdemy_db' : 'kurdemy_db'}
`;
      break;

    case 'sqlite':
      content += `DATABASE_URL=${isExample 
        ? 'file:./dev.db'
        : 'file:./dev.db'
      }
SQLITE_PATH=${isExample ? './dev.db' : './dev.db'}
`;
      break;

    case 'sqlserver':
      content += `DATABASE_URL=${isExample 
        ? 'sqlserver://localhost:1433;database=kurdemy_db;username=sa;password=YourPassword123;trustServerCertificate=true'
        : 'sqlserver://localhost:1433;database=kurdemy_db;username=sa;password=YourPassword123;trustServerCertificate=true'
      }
SQLSERVER_HOST=${isExample ? 'localhost' : 'localhost'}
SQLSERVER_PORT=${isExample ? '1433' : '1433'}
SQLSERVER_USER=${isExample ? 'sa' : 'sa'}
SQLSERVER_PASSWORD=${isExample ? 'YourPassword123' : 'YourPassword123'}
SQLSERVER_DATABASE=${isExample ? 'kurdemy_db' : 'kurdemy_db'}
`;
      break;
  }

  return content + '\n';
}

function generateAuthEnvContent(config, isExample) {
  return `# Authentication (NextAuth.js)
NEXTAUTH_URL=${isExample ? 'http://localhost:3000' : 'http://localhost:3000'}
NEXTAUTH_SECRET=${isExample ? 'your-nextauth-secret-change-this-in-production' : 'your-nextauth-secret-change-this-in-production'}

# OAuth Providers (uncomment and configure as needed)
# GOOGLE_CLIENT_ID=${isExample ? 'your-google-client-id' : 'your-google-client-id'}
# GOOGLE_CLIENT_SECRET=${isExample ? 'your-google-client-secret' : 'your-google-client-secret'}

# GITHUB_CLIENT_ID=${isExample ? 'your-github-client-id' : 'your-github-client-id'}
# GITHUB_CLIENT_SECRET=${isExample ? 'your-github-client-secret' : 'your-github-client-secret'}

# DISCORD_CLIENT_ID=${isExample ? 'your-discord-client-id' : 'your-discord-client-id'}
# DISCORD_CLIENT_SECRET=${isExample ? 'your-discord-client-secret' : 'your-discord-client-secret'}

`;
}

function generateTRPCEnvContent(config, isExample) {
  return `# tRPC Configuration
TRPC_ENDPOINT=${isExample ? 'http://localhost:3000/api/trpc' : 'http://localhost:3000/api/trpc'}

`;
}

async function generateBackendEnvFiles(projectPath, config) {
  const backendEnvContent = `# Backend Environment Variables

# Server
PORT=4000
NODE_ENV=development

# Database (inherits from parent .env)
# DATABASE_URL is read from parent .env

# API
API_PREFIX=api
API_VERSION=v1

# Security
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ENABLED=true

# Swagger API Documentation
SWAGGER_ENABLED=true
SWAGGER_PATH=api/docs
`;

  await fs.writeFile(
    path.join(projectPath, 'src/backend/.env'),
    backendEnvContent
  );
}

async function generateFrontendEnvFiles(projectPath, config) {
  let frontendEnvContent;

  if (config.frontend === 'nextjs') {
    frontendEnvContent = `# Frontend Environment Variables (Next.js)

# Public variables (exposed to browser - prefix with NEXT_PUBLIC_)
NEXT_PUBLIC_APP_NAME=Kurdemy App
NEXT_PUBLIC_API_URL=http://localhost:3000/api
${config.trpc ? 'NEXT_PUBLIC_TRPC_URL=http://localhost:3000/api/trpc\n' : ''}
# Private variables (server-side only)
SECRET_KEY=your-secret-key

# Next.js specific
NEXT_TELEMETRY_DISABLED=1
`;
  } else {
    frontendEnvContent = `# Frontend Environment Variables (React)

# Public variables (exposed to browser - prefix with REACT_APP_)
REACT_APP_NAME=Kurdemy App
REACT_APP_API_URL=http://localhost:4000/api
${config.trpc ? 'REACT_APP_TRPC_URL=http://localhost:4000/api/trpc\n' : ''}
# Build configuration
GENERATE_SOURCEMAP=true
`;
  }

  await fs.writeFile(
    path.join(projectPath, 'src/frontend/.env'),
    frontendEnvContent
  );
}

module.exports = {
  generateEnvFiles,
  generateMainEnvFiles,
  generateBackendEnvFiles,
  generateFrontendEnvFiles
};