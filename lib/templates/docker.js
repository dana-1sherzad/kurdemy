const fs = require('fs-extra');
const path = require('path');

async function generateDockerFiles(projectPath, config) {
  // Generate main Dockerfile
  await generateMainDockerfile(projectPath, config);
  
  // Generate development Docker setup
  await generateDevDockerfiles(projectPath, config);
  
  // Generate Docker Compose files
  await generateDockerCompose(projectPath, config);
  
  // Generate Docker ignore file
  await generateDockerIgnore(projectPath, config);
  
  // Generate Nginx configuration
  await generateNginxConfig(projectPath, config);
  
  // Generate Docker scripts
  await generateDockerScripts(projectPath, config);
}

async function generateMainDockerfile(projectPath, config) {
  const dockerfileContent = `# Multi-stage Dockerfile for Kurdemy Stack Application

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/backend/package*.json ./src/backend/
COPY src/frontend/package*.json ./src/frontend/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build backend
WORKDIR /app/src/backend
RUN npm run build

# Build frontend
WORKDIR /app/src/frontend
RUN npm run build

# Stage 2: Production backend
FROM node:18-alpine AS backend-production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy built backend
COPY --from=builder --chown=nestjs:nodejs /app/src/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/src/backend/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/src/backend/node_modules ./node_modules

# Copy shared files
COPY --from=builder --chown=nestjs:nodejs /app/src/shared ./shared

${config.orm === 'prisma' ? `# Copy Prisma files
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma` : ''}

# Switch to app user
USER nestjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node healthcheck.js || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]

# Stage 3: Production frontend (for Next.js)
${config.frontend === 'nextjs' ? `FROM node:18-alpine AS frontend-production

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built frontend
COPY --from=builder --chown=nextjs:nodejs /app/src/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/src/frontend/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src/frontend/public ./public

# Switch to app user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]` : `# Stage 3: Production frontend (Nginx for React)
FROM nginx:alpine AS frontend-production

# Copy built frontend
COPY --from=builder /app/src/frontend/build /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]`}

# Stage 4: Development
FROM node:18-alpine AS development

# Install development dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Expose ports
EXPOSE 3000 4000

# Start development server
CMD ["npm", "run", "dev"]
`;

  await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfileContent);
}

async function generateDevDockerfiles(projectPath, config) {
  // Development Dockerfile
  const devDockerfileContent = `# Development Dockerfile for Kurdemy Stack

FROM node:18-alpine

# Install development tools
RUN apk add --no-cache \\
    git \\
    curl \\
    bash \\
    ${config.database === 'postgresql' ? 'postgresql-client' : ''} \\
    ${config.database === 'mysql' ? 'mysql-client' : ''} \\
    && rm -rf /var/cache/apk/*

# Install global development dependencies
RUN npm install -g \\
    nodemon \\
    ts-node \\
    ${config.orm === 'prisma' ? 'prisma' : ''} \\
    ${config.orm === 'drizzle' ? 'drizzle-kit' : ''}

# Create app directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY src/backend/package*.json ./src/backend/
COPY src/frontend/package*.json ./src/frontend/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \\
    adduser -S appuser -u 1001 -G appgroup

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 3000 4000 5555

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \\
  CMD curl -f http://localhost:4000/api/health || exit 1

# Default command
CMD ["npm", "run", "dev"]
`;

  await fs.writeFile(path.join(projectPath, 'Dockerfile.dev'), devDockerfileContent);

  // Backend specific Dockerfile
  const backendDockerfileContent = `# Backend Dockerfile for Kurdemy Stack

FROM node:18-alpine AS base

# Install dependencies
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nestjs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=base --chown=nestjs:nodejs /app/dist ./dist
COPY --from=base --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nestjs:nodejs /app/package*.json ./

${config.orm === 'prisma' ? `# Copy Prisma files
COPY --from=base --chown=nestjs:nodejs /app/prisma ./prisma` : ''}

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:4000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
`;

  await fs.writeFile(path.join(projectPath, 'src/backend/Dockerfile'), backendDockerfileContent);

  // Frontend specific Dockerfile
  if (config.frontend === 'nextjs') {
    const frontendDockerfileContent = `# Frontend Dockerfile for Next.js

FROM node:18-alpine AS base

# Install dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

# Copy built application
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
`;

    await fs.writeFile(path.join(projectPath, 'src/frontend/Dockerfile'), frontendDockerfileContent);
  } else {
    const frontendDockerfileContent = `# Frontend Dockerfile for React

FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Copy built application
COPY --from=base /app/build /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
`;

    await fs.writeFile(path.join(projectPath, 'src/frontend/Dockerfile'), frontendDockerfileContent);
  }
}

async function generateDockerCompose(projectPath, config) {
  // Development Docker Compose
  const devComposeContent = `version: '3.8'

services:
  # Database
  ${config.database}:
    image: ${getDatabaseDockerImage(config.database)}
    container_name: kurdemy-${config.database}
    restart: unless-stopped
    environment:
      ${getDatabaseEnvironment(config.database)}
    ports:
      - "${getDatabasePort(config.database)}:${getDatabasePort(config.database)}"
    volumes:
      - ${config.database}_data:/var/lib/${getDatabaseDataPath(config.database)}
      ${config.database === 'postgresql' ? '- ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql' : ''}
    networks:
      - kurdemy-network
    ${getDatabaseHealthCheck(config.database) ? `healthcheck:
      test: ${getDatabaseHealthCheck(config.database)}
      interval: 30s
      timeout: 10s
      retries: 5` : ''}

  # Backend
  backend:
    build:
      context: .
      dockerfile: src/backend/Dockerfile
      target: development
    container_name: kurdemy-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      - DATABASE_URL=${getDatabaseUrl(config.database)}
      - JWT_SECRET=your-development-jwt-secret
      - CORS_ORIGIN=http://localhost:3000
    ports:
      - "4000:4000"
    volumes:
      - ./src/backend:/app/src/backend
      - ./src/shared:/app/src/shared
      - /app/node_modules
      - /app/src/backend/node_modules
    depends_on:
      ${config.database}:
        condition: service_healthy
    networks:
      - kurdemy-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
  frontend:
    build:
      context: .
      dockerfile: src/frontend/Dockerfile
      target: development
    container_name: kurdemy-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      ${config.frontend === 'nextjs' ? '- NEXT_PUBLIC_API_URL=http://localhost:4000/api' : '- REACT_APP_API_URL=http://localhost:4000/api'}
    ports:
      - "3000:3000"
    volumes:
      - ./src/frontend:/app/src/frontend
      - ./src/shared:/app/src/shared
      - /app/node_modules
      - /app/src/frontend/node_modules
    depends_on:
      - backend
    networks:
      - kurdemy-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis (for caching and sessions)
  redis:
    image: redis:7-alpine
    container_name: kurdemy-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - kurdemy-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Database Admin Tool
  ${config.database === 'postgresql' ? `adminer:
    image: adminer:4
    container_name: kurdemy-adminer
    restart: unless-stopped
    ports:
      - "8080:8080"
    depends_on:
      - ${config.database}
    networks:
      - kurdemy-network` : ''}
  ${config.database === 'mysql' ? `phpmyadmin:
    image: phpmyadmin/phpmyadmin:5
    container_name: kurdemy-phpmyadmin
    restart: unless-stopped
    environment:
      PMA_HOST: mysql
      PMA_PORT: 3306
      PMA_USER: root
      PMA_PASSWORD: rootpassword
    ports:
      - "8080:80"
    depends_on:
      - ${config.database}
    networks:
      - kurdemy-network` : ''}

volumes:
  ${config.database}_data:
  redis_data:

networks:
  kurdemy-network:
    driver: bridge
`;

  await fs.writeFile(path.join(projectPath, 'docker-compose.dev.yml'), devComposeContent);

  // Production Docker Compose
  const prodComposeContent = `version: '3.8'

services:
  # Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: kurdemy-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - backend
      - frontend
    networks:
      - kurdemy-network

  # Database
  ${config.database}:
    image: ${getDatabaseDockerImage(config.database)}
    container_name: kurdemy-${config.database}-prod
    restart: unless-stopped
    environment:
      ${getDatabaseEnvironment(config.database, true)}
    volumes:
      - ${config.database}_prod_data:/var/lib/${getDatabaseDataPath(config.database)}
      - ./backups:/backups
    networks:
      - kurdemy-network
    ${getDatabaseHealthCheck(config.database) ? `healthcheck:
      test: ${getDatabaseHealthCheck(config.database)}
      interval: 30s
      timeout: 10s
      retries: 5` : ''}

  # Backend
  backend:
    build:
      context: .
      dockerfile: Dockerfile
      target: backend-production
    container_name: kurdemy-backend-prod
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${getDatabaseUrl(config.database, true)}
    volumes:
      - ./logs/backend:/app/logs
    depends_on:
      ${config.database}:
        condition: service_healthy
    networks:
      - kurdemy-network
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      target: frontend-production
    container_name: kurdemy-frontend-prod
    restart: unless-stopped
    ${config.frontend === 'nextjs' ? `environment:
      - NODE_ENV=production` : ''}
    depends_on:
      - backend
    networks:
      - kurdemy-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${config.frontend === 'nextjs' ? '3000' : '80'}"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis
  redis:
    image: redis:7-alpine
    container_name: kurdemy-redis-prod
    restart: unless-stopped
    volumes:
      - redis_prod_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - kurdemy-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  ${config.database}_prod_data:
  redis_prod_data:

networks:
  kurdemy-network:
    driver: bridge
`;

  await fs.writeFile(path.join(projectPath, 'docker-compose.prod.yml'), prodComposeContent);

  // Override file for local development
  const overrideComposeContent = `version: '3.8'

# Override file for local development customizations
services:
  backend:
    environment:
      - DEBUG=*
      - LOG_LEVEL=debug
    volumes:
      - ./logs/backend:/app/logs

  frontend:
    environment:
      - DEBUG=true

  ${config.database}:
    ports:
      - "${getDatabasePort(config.database)}:${getDatabasePort(config.database)}"
`;

  await fs.writeFile(path.join(projectPath, 'docker-compose.override.yml'), overrideComposeContent);
}

async function generateDockerIgnore(projectPath, config) {
  const dockerIgnoreContent = `# Git
.git
.gitignore

# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist
build
.next
out

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Database files
*.db
*.sqlite

# Testing
coverage/

# Documentation
docs/

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Kubernetes
k8s/
*.yaml
*.yml

# Backups
backups/

# Scripts (keep essential ones)
scripts/

# README and documentation
README.md
CHANGELOG.md
LICENSE
`;

  await fs.writeFile(path.join(projectPath, '.dockerignore'), dockerIgnoreContent);
}

async function generateNginxConfig(projectPath, config) {
  await fs.ensureDir(path.join(projectPath, 'nginx'));

  const nginxConfigContent = `user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Upstream servers
    upstream backend {
        server backend:4000 max_fails=3 fail_timeout=30s;
    }

    upstream frontend {
        server frontend:${config.frontend === 'nextjs' ? '3000' : '80'} max_fails=3 fail_timeout=30s;
    }

    # HTTP server (redirect to HTTPS in production)
    server {
        listen 80;
        server_name localhost;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Auth endpoints with stricter rate limiting
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend routes
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static assets caching
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            proxy_pass http://frontend;
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Cache-Status $upstream_cache_status;
        }
    }

    # HTTPS server (uncomment for production with SSL)
    # server {
    #     listen 443 ssl http2;
    #     server_name yourdomain.com;

    #     ssl_certificate /etc/nginx/ssl/cert.pem;
    #     ssl_certificate_key /etc/nginx/ssl/key.pem;
    #     ssl_session_timeout 1d;
    #     ssl_session_cache shared:MozTLS:10m;
    #     ssl_session_tickets off;

    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    #     ssl_prefer_server_ciphers off;

    #     # HSTS
    #     add_header Strict-Transport-Security "max-age=63072000" always;

    #     # Include the same location blocks as above
    # }
}
`;

  await fs.writeFile(path.join(projectPath, 'nginx/nginx.conf'), nginxConfigContent);

  // FIXED: Ensure redis directory exists before writing redis.conf
  await fs.ensureDir(path.join(projectPath, 'redis'));

  // Redis configuration
  const redisConfigContent = `# Redis configuration for production

# Network
bind 127.0.0.1 ::1
port 6379
protected-mode yes

# General
daemonize no
supervised docker
pidfile /var/run/redis_6379.pid

# Logging
loglevel notice
logfile ""

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data

# Security
requirepass your-redis-password

# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Clients
maxclients 10000
timeout 300
tcp-keepalive 300

# Performance
tcp-backlog 511
databases 16
`;

  await fs.writeFile(path.join(projectPath, 'redis/redis.conf'), redisConfigContent);
}

async function generateDockerScripts(projectPath, config) {
  await fs.ensureDir(path.join(projectPath, 'scripts/docker'));

  // Docker development script
  const devScriptContent = `#!/bin/bash

set -e

echo "🐳 Starting Kurdemy development environment with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.dev.yml ps

# Show logs
echo "📝 Showing service logs..."
docker-compose -f docker-compose.dev.yml logs --tail=50

echo ""
echo "🎉 Development environment is ready!"
echo "📖 Services:"
echo "   Frontend: http://localhost:3000"
echo "   Backend: http://localhost:4000"
echo "   API Docs: http://localhost:4000/api/docs"
${config.database === 'postgresql' ? '   Database Admin: http://localhost:8080' : ''}
${config.database === 'mysql' ? '   phpMyAdmin: http://localhost:8080' : ''}
echo ""
echo "🔧 Useful commands:"
echo "   docker-compose -f docker-compose.dev.yml logs -f [service]  # View logs"
echo "   docker-compose -f docker-compose.dev.yml down              # Stop services"
echo "   docker-compose -f docker-compose.dev.yml restart [service] # Restart service"
`;

  await fs.writeFile(path.join(projectPath, 'scripts/docker/dev.sh'), devScriptContent);
  await fs.chmod(path.join(projectPath, 'scripts/docker/dev.sh'), '755');

  // Docker production script
  const prodScriptContent = `#!/bin/bash

set -e

echo "🐳 Starting Kurdemy production environment with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | xargs)
else
    echo "⚠️  .env.production file not found. Using defaults."
fi

# Build and start services
echo "🔨 Building and starting production services..."
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🎉 Production environment is ready!"
echo "📖 Application: http://localhost"
echo ""
echo "🔧 Useful commands:"
echo "   docker-compose -f docker-compose.prod.yml logs -f [service]  # View logs"
echo "   docker-compose -f docker-compose.prod.yml down               # Stop services"
echo "   docker-compose -f docker-compose.prod.yml restart [service]  # Restart service"
`;

  await fs.writeFile(path.join(projectPath, 'scripts/docker/prod.sh'), prodScriptContent);
  await fs.chmod(path.join(projectPath, 'scripts/docker/prod.sh'), '755');

  // Docker cleanup script
  const cleanupScriptContent = `#!/bin/bash

echo "🧹 Cleaning up Docker resources..."

# Stop all containers
echo "⏹️  Stopping all containers..."
docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true

# Remove unused images
echo "🗑️  Removing unused images..."
docker image prune -f

# Remove unused volumes
echo "📦 Removing unused volumes..."
docker volume prune -f

# Remove unused networks
echo "🌐 Removing unused networks..."
docker network prune -f

# Remove build cache
echo "🗂️  Removing build cache..."
docker builder prune -f

echo "✅ Docker cleanup complete!"

# Show current status
echo ""
echo "📊 Current Docker status:"
docker system df
`;

  await fs.writeFile(path.join(projectPath, 'scripts/docker/cleanup.sh'), cleanupScriptContent);
  await fs.chmod(path.join(projectPath, 'scripts/docker/cleanup.sh'), '755');

  // Database backup script
  const backupScriptContent = `#!/bin/bash

set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE="${config.database}"

echo "📦 Creating database backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

case $DATABASE in
  postgresql)
    echo "🐘 Backing up PostgreSQL database..."
    docker-compose exec ${config.database} pg_dump -U postgres -d kurdemy_db > "$BACKUP_DIR/postgres_backup_$DATE.sql"
    ;;
  mysql)
    echo "🐬 Backing up MySQL database..."
    docker-compose exec ${config.database} mysqldump -u root -prootpassword kurdemy_db > "$BACKUP_DIR/mysql_backup_$DATE.sql"
    ;;
  sqlite)
    echo "📄 Backing up SQLite database..."
    cp dev.db "$BACKUP_DIR/sqlite_backup_$DATE.db"
    ;;
  sqlserver)
    echo "🏢 Backing up SQL Server database..."
    # SQL Server backup commands would go here
    ;;
esac

echo "✅ Database backup created: $BACKUP_DIR/${DATABASE}_backup_$DATE.*"

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "${DATABASE}_backup_*" -mtime +7 -delete

echo "🧹 Old backups cleaned up (kept last 7 days)"
`;

  await fs.writeFile(path.join(projectPath, 'scripts/docker/backup.sh'), backupScriptContent);
  await fs.chmod(path.join(projectPath, 'scripts/docker/backup.sh'), '755');

  // Health check script
  const healthCheckContent = `#!/bin/bash

echo "🏥 Running health checks on Docker services..."

# Check if services are running
echo "📋 Service status:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "🔍 Health check results:"

# Check backend health
echo -n "Backend: "
if curl -f -s http://localhost:4000/api/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Check frontend health
echo -n "Frontend: "
if curl -f -s http://localhost:3000 > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Check database health
echo -n "Database: "
case ${config.database} in
  postgresql)
    if docker-compose exec ${config.database} pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ Healthy"
    else
        echo "❌ Unhealthy"
    fi
    ;;
  mysql)
    if docker-compose exec ${config.database} mysqladmin ping -h localhost -u root -prootpassword > /dev/null 2>&1; then
        echo "✅ Healthy"
    else
        echo "❌ Unhealthy"
    fi
    ;;
  sqlite)
    echo "✅ Healthy (file-based)"
    ;;
esac

# Check Redis health
echo -n "Redis: "
if docker-compose exec redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

echo ""
echo "📊 Resource usage:"
docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}"
`;

  await fs.writeFile(path.join(projectPath, 'scripts/docker/health-check.sh'), healthCheckContent);
  await fs.chmod(path.join(projectPath, 'scripts/docker/health-check.sh'), '755');
}

// Helper functions for database configuration
function getDatabaseDockerImage(database) {
  const images = {
    postgresql: 'postgres:15-alpine',
    mysql: 'mysql:8.0',
    sqlite: 'alpine:latest', // SQLite doesn't need a separate container
    sqlserver: 'mcr.microsoft.com/mssql/server:2022-latest'
  };
  return images[database];
}

function getDatabaseEnvironment(database, production = false) {
  const envs = {
    postgresql: production ? 
      'POSTGRES_DB: ${POSTGRES_DB:-kurdemy_db}\n      POSTGRES_USER: ${POSTGRES_USER:-postgres}\n      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}' :
      'POSTGRES_DB: kurdemy_dev\n      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: postgres',
    mysql: production ?
      'MYSQL_DATABASE: ${MYSQL_DATABASE:-kurdemy_db}\n      MYSQL_USER: ${MYSQL_USER:-kurdemy}\n      MYSQL_PASSWORD: ${MYSQL_PASSWORD}\n      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}' :
      'MYSQL_DATABASE: kurdemy_dev\n      MYSQL_USER: kurdemy\n      MYSQL_PASSWORD: password\n      MYSQL_ROOT_PASSWORD: rootpassword',
    sqlserver: production ?
      'ACCEPT_EULA: Y\n      SA_PASSWORD: ${SA_PASSWORD}\n      MSSQL_PID: ${MSSQL_PID:-Express}' :
      'ACCEPT_EULA: Y\n      SA_PASSWORD: YourStrong@Passw0rd\n      MSSQL_PID: Express'
  };
  return envs[database] || '';
}

function getDatabasePort(database) {
  const ports = {
    postgresql: 5432,
    mysql: 3306,
    sqlite: null,
    sqlserver: 1433
  };
  return ports[database];
}

function getDatabaseDataPath(database) {
  const paths = {
    postgresql: 'postgresql/data',
    mysql: 'mysql',
    sqlserver: 'mssql'
  };
  return paths[database];
}

function getDatabaseHealthCheck(database) {
  const checks = {
    postgresql: '["CMD-SHELL", "pg_isready -U postgres"]',
    mysql: '["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpassword"]',
    sqlserver: '["CMD-SHELL", "/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q \\"SELECT 1\\""]'
  };
  return checks[database];
}

function getDatabaseUrl(database, production = false) {
  if (production) {
    const urls = {
      postgresql: '${DATABASE_URL}',
      mysql: '${DATABASE_URL}',
      sqlite: 'file:./prod.db',
      sqlserver: '${DATABASE_URL}'
    };
    return urls[database];
  } else {
    const urls = {
      postgresql: 'postgresql://postgres:postgres@postgres:5432/kurdemy_dev',
      mysql: 'mysql://kurdemy:password@mysql:3306/kurdemy_dev',
      sqlite: 'file:./dev.db',
      sqlserver: 'sqlserver://sa:YourStrong@Passw0rd@sqlserver:1433;database=kurdemy_dev;trustServerCertificate=true'
    };
    return urls[database];
  }
}

module.exports = {
  generateDockerFiles,
  generateMainDockerfile,
  generateDevDockerfiles,
  generateDockerCompose,
  generateDockerIgnore,
  generateNginxConfig,
  generateDockerScripts
};