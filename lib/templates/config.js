const fs = require('fs-extra');
const path = require('path');

async function generateConfigFiles(projectPath, config) {
  // Generate TypeScript configurations
  await generateTypeScriptConfigs(projectPath, config);
  
  // Generate ESLint configurations
  await generateESLintConfigs(projectPath, config);
  
  // Generate Prettier configuration
  await generatePrettierConfig(projectPath, config);
  
  // Generate Husky and Git hooks
  await generateGitHooks(projectPath, config);
  
  // Generate GitHub Actions workflows
  await generateGitHubActions(projectPath, config);
  
  // Generate VS Code settings
  await generateVSCodeSettings(projectPath, config);
  
  // Generate development scripts
  await generateDevScripts(projectPath, config);
}

async function generateTypeScriptConfigs(projectPath, config) {
  // Root TypeScript config
  const rootTsConfigContent = {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "forceConsistentCasingInFileNames": true,
      "noEmit": true,
      "esModuleInterop": true,
      "moduleResolution": "node",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "incremental": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["src/*"],
        "@/backend/*": ["src/backend/*"],
        "@/frontend/*": ["src/frontend/*"],
        "@/shared/*": ["src/shared/*"]
      }
    },
    "include": ["src/**/*", "scripts/**/*"],
    "exclude": ["node_modules", "dist", "build", ".next"]
  };

  await fs.writeFile(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(rootTsConfigContent, null, 2)
  );

  // Backend TypeScript config
  const backendTsConfigContent = {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "declaration": true,
      "removeComments": true,
      "emitDecoratorMetadata": true,
      "experimentalDecorators": true,
      "allowSyntheticDefaultImports": true,
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
        "@/*": ["src/*"],
        "@/shared/*": ["../shared/*"]
      }
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
  };

  await fs.writeFile(
    path.join(projectPath, 'src/backend/tsconfig.json'),
    JSON.stringify(backendTsConfigContent, null, 2)
  );

  // Build-specific TypeScript config for backend
  const backendBuildTsConfigContent = {
    "extends": "./tsconfig.json",
    "exclude": ["node_modules", "test", "dist", "**/*spec.ts", "**/*test.ts"]
  };

  await fs.writeFile(
    path.join(projectPath, 'src/backend/tsconfig.build.json'),
    JSON.stringify(backendBuildTsConfigContent, null, 2)
  );

  // Frontend TypeScript config (handled in frontend generators, but we'll create a shared one)
  if (config.frontend === 'nextjs') {
    const frontendTsConfigContent = {
      "extends": "../../tsconfig.json",
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
          "@/*": ["./*"],
          "@/shared/*": ["../shared/*"]
        }
      },
      "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      "exclude": ["node_modules"]
    };

    await fs.writeFile(
      path.join(projectPath, 'src/frontend/tsconfig.json'),
      JSON.stringify(frontendTsConfigContent, null, 2)
    );
  }
}

async function generateESLintConfigs(projectPath, config) {
  // Root ESLint config
  const rootEslintContent = `module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};
`;

  await fs.writeFile(path.join(projectPath, '.eslintrc.js'), rootEslintContent);

  // Backend ESLint config
  const backendEslintContent = `module.exports = {
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
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
};
`;

  await fs.writeFile(path.join(projectPath, 'src/backend/.eslintrc.js'), backendEslintContent);

  // Frontend ESLint config
  if (config.frontend === 'nextjs') {
    const frontendEslintContent = `module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: ['node_modules', '.next', 'out'],
};
`;

    await fs.writeFile(path.join(projectPath, 'src/frontend/.eslintrc.js'), frontendEslintContent);
  } else {
    const frontendEslintContent = `module.exports = {
  extends: [
    'react-app',
    'react-app/jest',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: ['node_modules', 'build'],
};
`;

    await fs.writeFile(path.join(projectPath, 'src/frontend/.eslintrc.js'), frontendEslintContent);
  }

  // ESLint ignore file
  const eslintIgnoreContent = `# Dependencies
node_modules/
*/node_modules/

# Production builds
dist/
build/
.next/
out/

# Environment files
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Generated files
coverage/
.nyc_output/

# Package manager
.pnpm-debug.log*
.yarn/
.pnp.*
`;

  await fs.writeFile(path.join(projectPath, '.eslintignore'), eslintIgnoreContent);
}

async function generatePrettierConfig(projectPath, config) {
  // Prettier configuration
  const prettierConfigContent = {
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 80,
    "tabWidth": 2,
    "useTabs": false,
    "quoteProps": "as-needed",
    "bracketSpacing": true,
    "bracketSameLine": false,
    "arrowParens": "avoid",
    "endOfLine": "lf",
    "embeddedLanguageFormatting": "auto",
    "overrides": [
      {
        "files": "*.json",
        "options": {
          "parser": "json"
        }
      },
      {
        "files": "*.md",
        "options": {
          "parser": "markdown",
          "printWidth": 100
        }
      },
      {
        "files": "*.yaml",
        "options": {
          "parser": "yaml"
        }
      }
    ]
  };

  await fs.writeFile(
    path.join(projectPath, '.prettierrc'),
    JSON.stringify(prettierConfigContent, null, 2)
  );

  // Prettier ignore file
  const prettierIgnoreContent = `# Dependencies
node_modules/
*/node_modules/

# Production builds
dist/
build/
.next/
out/

# Environment files
.env
.env.local
.env.*.local

# Logs
*.log

# Generated files
coverage/
.nyc_output/

# Package manager
package-lock.json
yarn.lock
pnpm-lock.yaml

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`;

  await fs.writeFile(path.join(projectPath, '.prettierignore'), prettierIgnoreContent);
}

async function generateGitHooks(projectPath, config) {
  // Husky configuration
  await fs.ensureDir(path.join(projectPath, '.husky'));

  // Pre-commit hook
  const preCommitContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
`;

  await fs.writeFile(path.join(projectPath, '.husky/pre-commit'), preCommitContent);
  await fs.chmod(path.join(projectPath, '.husky/pre-commit'), '755');

  // Commit message hook
  const commitMsgContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit $1
`;

  await fs.writeFile(path.join(projectPath, '.husky/commit-msg'), commitMsgContent);
  await fs.chmod(path.join(projectPath, '.husky/commit-msg'), '755');

  // Lint-staged configuration
  const lintStagedContent = {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md,yaml,yml}": [
      "prettier --write"
    ],
    "package.json": [
      "sort-package-json"
    ]
  };

  await fs.writeFile(
    path.join(projectPath, '.lintstagedrc'),
    JSON.stringify(lintStagedContent, null, 2)
  );

  // Commitlint configuration
  const commitlintContent = `module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
`;

  await fs.writeFile(path.join(projectPath, '.commitlintrc.js'), commitlintContent);

  // Add Husky installation script
  const huskyInstallContent = `#!/usr/bin/env sh
if [ -z "$HUSKY_SKIP_INSTALL" ]; then
  npx husky install
fi
`;

  await fs.writeFile(path.join(projectPath, '.husky/install.sh'), huskyInstallContent);
  await fs.chmod(path.join(projectPath, '.husky/install.sh'), '755');
}

async function generateGitHubActions(projectPath, config) {
  await fs.ensureDir(path.join(projectPath, '.github/workflows'));

  // CI/CD workflow - SIMPLIFIED without database
  const ciWorkflowContent = `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run type checking
      run: npm run type-check

    - name: Run tests
      run: npm test
      env:
        CI: true

    - name: Build application
      run: npm run build

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      if: matrix.node-version == '20.x'

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Deploy to production
      run: echo "Add your deployment commands here"
      # Example deployment commands:
      # - name: Deploy to Vercel
      #   uses: amondnet/vercel-action@v25
      #   with:
      #     vercel-token: \${{ secrets.VERCEL_TOKEN }}
      #     vercel-org-id: \${{ secrets.ORG_ID }}
      #     vercel-project-id: \${{ secrets.PROJECT_ID }}
      #     vercel-args: '--prod'
`;

  await fs.writeFile(
    path.join(projectPath, '.github/workflows/ci.yml'),
    ciWorkflowContent
  );

  // Security audit workflow
  const securityWorkflowContent = `name: Security Audit

on:
  schedule:
    - cron: '0 10 * * 1' # Run every Monday at 10 AM UTC
  workflow_dispatch:

jobs:
  security-audit:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run security audit
      run: npm audit --audit-level high

    - name: Run dependency check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        project: 'kurdemy-app'
        path: '.'
        format: 'ALL'

    - name: Upload results
      uses: actions/upload-artifact@v3
      with:
        name: dependency-check-reports
        path: reports/
`;

  await fs.writeFile(
    path.join(projectPath, '.github/workflows/security.yml'),
    securityWorkflowContent
  );

  // Issue templates
  await fs.ensureDir(path.join(projectPath, '.github/ISSUE_TEMPLATE'));

  const bugReportTemplate = `---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment (please complete the following information):**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]
 - Node.js version: [e.g. 18.0.0]

**Additional context**
Add any other context about the problem here.
`;

  await fs.writeFile(
    path.join(projectPath, '.github/ISSUE_TEMPLATE/bug_report.md'),
    bugReportTemplate
  );

  const featureRequestTemplate = `---
name: Feature request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''

---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
`;

  await fs.writeFile(
    path.join(projectPath, '.github/ISSUE_TEMPLATE/feature_request.md'),
    featureRequestTemplate
  );

  // Pull request template
  const prTemplate = `## Description
Brief description of the changes introduced by this PR.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have tested the changes manually

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information that reviewers should know.
`;

  await fs.writeFile(
    path.join(projectPath, '.github/pull_request_template.md'),
    prTemplate
  );
}

async function generateVSCodeSettings(projectPath, config) {
  await fs.ensureDir(path.join(projectPath, '.vscode'));

  // VS Code settings
  const settingsContent = {
    "typescript.preferences.preferTypeOnlyAutoImports": true,
    "typescript.suggest.autoImports": true,
    "typescript.updateImportsOnFileMove.enabled": "always",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true,
      "source.organizeImports": true
    },
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "emmet.includeLanguages": {
      "typescript": "html",
      "typescriptreact": "html"
    },
    "files.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/build": true,
      "**/.next": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/build": true,
      "**/.next": true,
      "**/coverage": true
    },
    "typescript.preferences.includePackageJsonAutoImports": "auto",
    "editor.rulers": [80, 120],
    "editor.wordWrap": "wordWrapColumn",
    "editor.wordWrapColumn": 80,
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,
    "files.trimFinalNewlines": true
  };

  await fs.writeFile(
    path.join(projectPath, '.vscode/settings.json'),
    JSON.stringify(settingsContent, null, 2)
  );

  // VS Code extensions
  const extensionsContent = {
    "recommendations": [
      "esbenp.prettier-vscode",
      "dbaeumer.vscode-eslint",
      "bradlc.vscode-tailwindcss",
      "ms-vscode.vscode-typescript-next",
      "ms-vscode.vscode-json",
      "redhat.vscode-yaml",
      "ms-vscode.vscode-eslint",
      "christian-kohler.path-intellisense",
      "christian-kohler.npm-intellisense",
      "formulahendry.auto-rename-tag",
      "ms-vscode.vscode-todo-highlight",
      "gruntfuggly.todo-tree",
      "usernamehw.errorlens",
      "streetsidesoftware.code-spell-checker"
    ]
  };

  await fs.writeFile(
    path.join(projectPath, '.vscode/extensions.json'),
    JSON.stringify(extensionsContent, null, 2)
  );

  // VS Code launch configuration
  const launchContent = {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Debug Backend",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/src/backend/src/main.ts",
        "outFiles": ["${workspaceFolder}/src/backend/dist/**/*.js"],
        "env": {
          "NODE_ENV": "development"
        },
        "envFile": "${workspaceFolder}/.env",
        "console": "integratedTerminal",
        "restart": true,
        "runtimeArgs": ["-r", "ts-node/register"]
      },
      {
        "name": "Debug Frontend",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/src/frontend/src/index.tsx",
        "console": "integratedTerminal",
        "restart": true
      }
    ]
  };

  await fs.writeFile(
    path.join(projectPath, '.vscode/launch.json'),
    JSON.stringify(launchContent, null, 2)
  );

  // VS Code tasks
  const tasksContent = {
    "version": "2.0.0",
    "tasks": [
      {
        "type": "npm",
        "script": "dev",
        "group": {
          "kind": "build",
          "isDefault": true
        },
        "label": "Start Development",
        "detail": "Start both frontend and backend in development mode"
      },
      {
        "type": "npm",
        "script": "build",
        "group": "build",
        "label": "Build Application",
        "detail": "Build the entire application for production"
      },
      {
        "type": "npm",
        "script": "test",
        "group": "test",
        "label": "Run Tests",
        "detail": "Run all tests"
      },
      {
        "type": "npm",
        "script": "lint",
        "group": "build",
        "label": "Lint Code",
        "detail": "Run ESLint on all code"
      }
    ]
  };

  await fs.writeFile(
    path.join(projectPath, '.vscode/tasks.json'),
    JSON.stringify(tasksContent, null, 2)
  );
}

async function generateDevScripts(projectPath, config) {
  await fs.ensureDir(path.join(projectPath, 'scripts'));

  // Development setup script - SIMPLIFIED without database
  const setupScriptContent = `#!/bin/bash

set -e

echo "🚀 Setting up Kurdemy development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup Git hooks
echo "🎣 Setting up Git hooks..."
npx husky install

# Setup environment files
if [ ! -f .env ]; then
    echo "📝 Setting up environment files..."
    echo "# Add your environment variables here" > .env
    echo "✅ .env file created"
fi

# Run initial build
echo "🔨 Running initial build..."
npm run build

echo "🎉 Setup complete! Run 'npm run dev' to start development."
echo ""
echo "📖 Next steps:"
echo "   1. Update .env with your configuration"
echo "   2. Run 'npm run dev' to start development"
echo "   3. Visit http://localhost:3000 to see your app"
`;

  await fs.writeFile(path.join(projectPath, 'scripts/setup.sh'), setupScriptContent);
  await fs.chmod(path.join(projectPath, 'scripts/setup.sh'), '755');

  // Clean script
  const cleanScriptContent = `#!/bin/bash

echo "🧹 Cleaning build artifacts..."

# Remove build directories
rm -rf dist/
rm -rf build/
rm -rf .next/
rm -rf out/

# Remove dependency directories
rm -rf node_modules/
rm -rf src/backend/node_modules/
rm -rf src/frontend/node_modules/

# Remove lock files
rm -f package-lock.json
rm -f src/backend/package-lock.json
rm -f src/frontend/package-lock.json

# Remove coverage
rm -rf coverage/

# Remove logs
rm -f *.log
rm -f npm-debug.log*
rm -f yarn-debug.log*
rm -f yarn-error.log*

echo "✅ Clean complete!"
`;

  await fs.writeFile(path.join(projectPath, 'scripts/clean.sh'), cleanScriptContent);
  await fs.chmod(path.join(projectPath, 'scripts/clean.sh'), '755');

  // Health check script - SIMPLIFIED without database
  const healthCheckScriptContent = `#!/bin/bash

echo "🏥 Running health checks..."

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Check dependencies
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Dependencies not installed. Run 'npm install'"
    exit 1
fi

# Check environment file
echo "📝 Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✅ Environment file exists"
else
    echo "❌ Environment file missing. Copy .env.example to .env"
    exit 1
fi

# Check ports
echo "🔌 Checking ports..."
check_port 3000
check_port 4000

echo "🎉 All health checks passed!"
`;

  await fs.writeFile(path.join(projectPath, 'scripts/health-check.sh'), healthCheckScriptContent);
  await fs.chmod(path.join(projectPath, 'scripts/health-check.sh'), '755');
}

module.exports = {
  generateConfigFiles,
  generateTypeScriptConfigs,
  generateESLintConfigs,
  generatePrettierConfig,
  generateGitHooks,
  generateGitHubActions,
  generateVSCodeSettings,
  generateDevScripts
};