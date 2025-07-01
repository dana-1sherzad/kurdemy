const fs = require('fs-extra');
const path = require('path');

async function generatePackageJson(projectPath, projectName, config) {
  // Helper function to get the correct Drizzle commands based on database
  const getDrizzleCommand = (command) => {
    const dbCommands = {
      postgresql: `drizzle-kit ${command}:pg`,
      mysql: `drizzle-kit ${command}:mysql`,
      sqlite: `drizzle-kit ${command}:sqlite`,
      sqlserver: `drizzle-kit ${command}:pg` // Use pg for SQL Server as fallback
    };
    return dbCommands[config.database] || dbCommands.postgresql;
  };

  const packageJson = {
    name: projectName,
    version: "0.1.0",
    description: "A fullstack application built with Kurdemy stack",
    private: true,
    scripts: {
      // Development
      "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
      "dev:backend": "cd src/backend && npm run start:dev",
      "dev:frontend": config.frontend === 'nextjs' 
        ? "cd src/frontend && npm run dev" 
        : "cd src/frontend && npm start",
      
      // Build
      "build": "npm run build:backend && npm run build:frontend",
      "build:backend": "cd src/backend && npm run build",
      "build:frontend": config.frontend === 'nextjs'
        ? "cd src/frontend && npm run build"
        : "cd src/frontend && npm run build",
      
      // Production
      "start": "concurrently \"npm run start:backend\" \"npm run start:frontend\"",
      "start:backend": "cd src/backend && npm run start:prod",
      "start:frontend": config.frontend === 'nextjs'
        ? "cd src/frontend && npm start"
        : "serve -s src/frontend/build",
      
      // Database - Fixed to use correct database commands
      "db:push": config.orm === 'prisma' 
        ? "prisma db push"
        : getDrizzleCommand('push'),
      "db:studio": config.orm === 'prisma'
        ? "prisma studio"
        : "drizzle-kit studio",
      "db:generate": config.orm === 'prisma'
        ? "prisma generate"
        : getDrizzleCommand('generate'),
      
      // Linting and Testing
      "lint": "npm run lint:backend && npm run lint:frontend",
      "lint:backend": "cd src/backend && npm run lint",
      "lint:frontend": "cd src/frontend && npm run lint",
      "test": "npm run test:backend && npm run test:frontend",
      "test:backend": "cd src/backend && npm run test",
      "test:frontend": "cd src/frontend && npm test",
      
      // Utilities
      "clean": "rimraf dist build .next",
      "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,md}\"",
      "type-check": "tsc --noEmit"
    },
    dependencies: {
      // Shared dependencies
      "typescript": "^5.0.0"
    },
    devDependencies: {
      // Development tools
      "concurrently": "^8.2.0",
      "rimraf": "^5.0.0",
      "prettier": "^3.0.0",
      "@types/node": "^20.0.0"
    },
    workspaces: [
      "src/backend",
      "src/frontend"
    ],
    engines: {
      "node": ">=16.0.0",
      "npm": ">=7.0.0"
    },
    repository: {
      "type": "git",
      "url": `git+https://github.com/dana-1sherzad/${projectName}.git`
    },
    keywords: [
      "kurdemy",
      "nestjs",
      config.frontend,
      config.orm,
      config.database,
      "typescript",
      "fullstack"
    ],
    author: "Your Name",
    license: "MIT"
  };

  // Add conditional dependencies based on configuration
  if (config.orm === 'prisma') {
    packageJson.devDependencies["prisma"] = "^5.0.0";
    packageJson.dependencies["@prisma/client"] = "^5.0.0";
  } else {
    packageJson.devDependencies["drizzle-kit"] = "^0.19.0";
    packageJson.dependencies["drizzle-orm"] = "^0.28.0";
  }

  // Add database drivers
  switch (config.database) {
    case 'postgresql':
      packageJson.dependencies["pg"] = "^8.11.0";
      packageJson.devDependencies["@types/pg"] = "^8.10.0";
      break;
    case 'mysql':
      packageJson.dependencies["mysql2"] = "^3.6.0";
      break;
    case 'sqlite':
      packageJson.dependencies["better-sqlite3"] = "^8.7.0";
      packageJson.devDependencies["@types/better-sqlite3"] = "^7.6.0";
      break;
    case 'sqlserver':
      packageJson.dependencies["mssql"] = "^9.1.0";
      packageJson.devDependencies["@types/mssql"] = "^8.1.0";
      break;
  }

  if (config.trpc) {
    packageJson.dependencies["@trpc/server"] = "^10.38.0";
    packageJson.dependencies["@trpc/client"] = "^10.38.0";
    packageJson.dependencies["@trpc/next"] = "^10.38.0";
    packageJson.dependencies["@trpc/react-query"] = "^10.38.0";
    packageJson.dependencies["@tanstack/react-query"] = "^4.35.0";
    packageJson.dependencies["zod"] = "^3.22.0";
  }

  if (config.auth) {
    packageJson.dependencies["next-auth"] = "^4.23.0";
    packageJson.dependencies["@next-auth/prisma-adapter"] = "^1.0.0";
  }

  if (config.tailwind) {
    packageJson.devDependencies["tailwindcss"] = "^3.3.0";
    packageJson.devDependencies["autoprefixer"] = "^10.4.0";
    packageJson.devDependencies["postcss"] = "^8.4.0";
  }

  // Add serve for React.js production
  if (config.frontend === 'react') {
    packageJson.devDependencies["serve"] = "^14.2.0";
  }

  await fs.writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Generate backend package.json
  await generateBackendPackageJson(projectPath, config);

  // Generate frontend package.json
  await generateFrontendPackageJson(projectPath, config);
}

async function generateBackendPackageJson(projectPath, config) {
  const backendPackageJson = {
    name: "backend",
    version: "0.1.0",
    description: "NestJS backend for Kurdemy app",
    private: true,
    scripts: {
      "build": "nest build",
      "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
      "start": "nest start",
      "start:dev": "nest start --watch",
      "start:debug": "nest start --debug --watch",
      "start:prod": "node dist/main",
      "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
      "test": "jest",
      "test:watch": "jest --watch",
      "test:cov": "jest --coverage",
      "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
      "test:e2e": "jest --config ./test/jest-e2e.json"
    },
    dependencies: {
      "@nestjs/common": "^10.0.0",
      "@nestjs/core": "^10.0.0",
      "@nestjs/platform-express": "^10.0.0",
      "@nestjs/config": "^3.0.0",
      "@nestjs/swagger": "^7.0.0",
      "reflect-metadata": "^0.1.13",
      "rxjs": "^7.8.0",
      "class-validator": "^0.14.0",
      "class-transformer": "^0.5.1"
    },
    devDependencies: {
      "@nestjs/cli": "^10.0.0",
      "@nestjs/schematics": "^10.0.0",
      "@nestjs/testing": "^10.0.0",
      "@types/express": "^4.17.17",
      "@types/jest": "^29.5.2",
      "@types/node": "^20.3.1",
      "@types/supertest": "^2.0.12",
      "@typescript-eslint/eslint-plugin": "^6.0.0",
      "@typescript-eslint/parser": "^6.0.0",
      "eslint": "^8.42.0",
      "eslint-config-prettier": "^9.0.0",
      "eslint-plugin-prettier": "^5.0.0",
      "jest": "^29.5.0",
      "prettier": "^3.0.0",
      "source-map-support": "^0.5.21",
      "supertest": "^6.3.0",
      "ts-jest": "^29.1.0",
      "ts-loader": "^9.4.3",
      "ts-node": "^10.9.1",
      "tsconfig-paths": "^4.2.0",
      "typescript": "^5.1.3"
    }
  };

  // Add tRPC specific dependencies
  if (config.trpc) {
    backendPackageJson.dependencies["@trpc/server"] = "^10.38.0";
    backendPackageJson.dependencies["zod"] = "^3.22.0";
  }

  await fs.writeFile(
    path.join(projectPath, 'src/backend/package.json'),
    JSON.stringify(backendPackageJson, null, 2)
  );
}

async function generateFrontendPackageJson(projectPath, config) {
  let frontendPackageJson;

  if (config.frontend === 'nextjs') {
    frontendPackageJson = {
      name: "frontend",
      version: "0.1.0",
      private: true,
      scripts: {
        "dev": "next dev -p 3000",
        "build": "next build",
        "start": "next start -p 3000",
        "lint": "next lint",
        "type-check": "tsc --noEmit"
      },
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "next": "^13.5.0"
      },
      devDependencies: {
        "typescript": "^5.0.0",
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "@types/node": "^20.0.0",
        "eslint": "^8.42.0",
        "eslint-config-next": "^13.5.0"
      }
    };
  } else {
    frontendPackageJson = {
      name: "frontend",
      version: "0.1.0",
      private: true,
      scripts: {
        "start": "react-scripts start",
        "build": "react-scripts build",
        "test": "react-scripts test",
        "eject": "react-scripts eject",
        "lint": "eslint src --ext .ts,.tsx",
        "type-check": "tsc --noEmit"
      },
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-scripts": "^5.0.1",
        "web-vitals": "^3.4.0"
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "typescript": "^5.0.0"
      },
      browserslist: {
        production: [
          ">0.2%",
          "not dead",
          "not op_mini all"
        ],
        development: [
          "last 1 chrome version",
          "last 1 firefox version",
          "last 1 safari version"
        ]
      }
    };
  }

  // Add common frontend dependencies
  if (config.trpc) {
    frontendPackageJson.dependencies["@trpc/client"] = "^10.38.0";
    frontendPackageJson.dependencies["@trpc/react-query"] = "^10.38.0";
    frontendPackageJson.dependencies["@tanstack/react-query"] = "^4.35.0";
    if (config.frontend === 'nextjs') {
      frontendPackageJson.dependencies["@trpc/next"] = "^10.38.0";
    }
  }

  if (config.auth && config.frontend === 'nextjs') {
    frontendPackageJson.dependencies["next-auth"] = "^4.23.0";
  }

  if (config.tailwind) {
    frontendPackageJson.devDependencies["tailwindcss"] = "^3.3.0";
    frontendPackageJson.devDependencies["autoprefixer"] = "^10.4.0";
    frontendPackageJson.devDependencies["postcss"] = "^8.4.0";
  }

  await fs.writeFile(
    path.join(projectPath, 'src/frontend/package.json'),
    JSON.stringify(frontendPackageJson, null, 2)
  );
}

module.exports = {
  generatePackageJson,
  generateBackendPackageJson,
  generateFrontendPackageJson
};