#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Simple colors without chalk
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Simple banner
console.log(colors.cyan(`
██   ██ ██    ██ ██████  ██████  ███████ ███    ███ ██    ██ 
██  ██  ██    ██ ██   ██ ██   ██ ██      ████  ████  ██  ██  
█████   ██    ██ ██████  ██   ██ █████   ██ ████ ██   ████   
██  ██  ██    ██ ██   ██ ██   ██ ██      ██  ██  ██    ██    
██   ██  ██████  ██   ██ ██████  ███████ ██      ██    ██    

Create modern fullstack applications with ease!
`));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(text) {
  return new Promise((resolve) => {
    rl.question(text, resolve);
  });
}

async function main() {
  try {
    // Get project name
    const projectName = process.argv[2] || await question('Project name: ');
    
    if (!projectName) {
      console.log(colors.red('Project name is required!'));
      process.exit(1);
    }

    const projectPath = path.join(process.cwd(), projectName);

    // Check if directory exists
    if (fs.existsSync(projectPath)) {
      const overwrite = await question(`Directory ${projectName} exists. Overwrite? (y/N): `);
      if (overwrite.toLowerCase() !== 'y') {
        console.log(colors.yellow('Cancelled.'));
        process.exit(0);
      }
      fs.rmSync(projectPath, { recursive: true, force: true });
    }

    // Simple questions
    const frontend = await question('Frontend (1=Next.js, 2=React): ') === '2' ? 'react' : 'nextjs';
    const trpc = await question('Use tRPC? (y/N): ');
    const tailwind = await question('Use Tailwind? (y/N): ');

    const config = {
      frontend,
      trpc: trpc.toLowerCase() === 'y',
      tailwind: tailwind.toLowerCase() === 'y',
      auth: false // Keep it simple
    };

    console.log(colors.blue('\n🚀 Creating project...'));

    // Create project
    await generateProject(projectPath, projectName, config);

    console.log(colors.green('\n🎉 Project created successfully!'));
    console.log(colors.gray('\nNext steps:'));
    console.log(colors.gray(`  cd ${projectName}`));
    console.log(colors.cyan('  npm run install:all'));
    console.log(colors.gray('\nThen run in separate terminals:'));
    console.log(colors.cyan('  npm run dev:backend   ') + colors.gray('# http://localhost:4000'));
    console.log(colors.cyan('  npm run dev:frontend  ') + colors.gray('# http://localhost:3000'));
    console.log(colors.green('\n🚀 Happy coding!'));

  } catch (error) {
    console.log(colors.red('\n❌ Error:'), error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function generateProject(projectPath, projectName, config) {
  // Create directories
  const dirs = [
    'src/backend/src',
    'src/frontend',
    'src/shared'
  ];

  for (const dir of dirs) {
    fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
  }

  // Generate package.json
  const packageJson = {
    name: projectName,
    version: "0.1.0",
    scripts: {
      dev: "echo 'Run these commands in separate terminals:' && echo '  npm run dev:backend' && echo '  npm run dev:frontend'",
      "dev:backend": "cd src/backend && npm run start:dev",
      "dev:frontend": config.frontend === 'nextjs' ? "cd src/frontend && npm run dev" : "cd src/frontend && npm start",
      "install:all": "npm install && cd src/backend && npm install && cd ../frontend && npm install",
      "build:all": "cd src/backend && npm run build && cd ../frontend && npm run build"
    },
    devDependencies: {
      "typescript": "^5.0.0"
    },
    workspaces: ["src/backend", "src/frontend"]
  };

  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Generate backend package.json
  const backendPackage = {
    name: "backend",
    version: "0.1.0",
    scripts: {
      "start:dev": "nest start --watch",
      "start:prod": "node dist/main",
      "build": "nest build"
    },
    dependencies: {
      "@nestjs/common": "^10.0.0",
      "@nestjs/core": "^10.0.0",
      "@nestjs/platform-express": "^10.0.0",
      "reflect-metadata": "^0.1.13",
      "rxjs": "^7.8.0"
    },
    devDependencies: {
      "@nestjs/cli": "^10.0.0",
      "typescript": "^5.0.0",
      "@types/node": "^20.0.0",
      "ts-node": "^10.9.0",
      "nodemon": "^3.0.0"
    }
  };

  fs.writeFileSync(
    path.join(projectPath, 'src/backend/package.json'),
    JSON.stringify(backendPackage, null, 2)
  );

  // Generate frontend package.json
  const frontendPackage = {
    name: "frontend",
    version: "0.1.0",
    scripts: config.frontend === 'nextjs' ? {
      dev: "next dev",
      build: "next build",
      start: "next start"
    } : {
      start: "react-scripts start",
      build: "react-scripts build",
      test: "react-scripts test"
    },
    dependencies: config.frontend === 'nextjs' ? {
      "next": "^14.0.0",
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    } : {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-scripts": "^5.0.1",
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0"
    },
    devDependencies: {}
  };

  if (config.frontend === 'nextjs') {
    frontendPackage.devDependencies = {
      "typescript": "^5.0.0",
      "@types/node": "^20.0.0",
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0"
    };
  }

  if (config.tailwind) {
    frontendPackage.devDependencies = {
      ...frontendPackage.devDependencies,
      "tailwindcss": "^3.3.0",
      "autoprefixer": "^10.4.0",
      "postcss": "^8.4.0"
    };
  }

  fs.writeFileSync(
    path.join(projectPath, 'src/frontend/package.json'),
    JSON.stringify(frontendPackage, null, 2)
  );

  // Generate basic files
  fs.writeFileSync(
    path.join(projectPath, 'README.md'),
    `# ${projectName}\n\nA Kurdemy fullstack app with **${config.frontend === 'nextjs' ? 'Next.js' : 'React'}** + **NestJS**\n\n## Quick Start\n\n1. **Install dependencies:**\n   \`\`\`bash\n   npm run install:all\n   \`\`\`\n\n2. **Start development (run in separate terminals):**\n   \`\`\`bash\n   # Terminal 1 - Backend (http://localhost:4000)\n   npm run dev:backend\n   \n   # Terminal 2 - Frontend (http://localhost:3000)\n   npm run dev:frontend\n   \`\`\`\n\n## Project Structure\n\n\`\`\`\n${projectName}/\n├── src/\n│   ├── backend/          # NestJS API\n│   └── frontend/         # ${config.frontend === 'nextjs' ? 'Next.js' : 'React'} App\n└── package.json\n\`\`\`\n\n## Features\n\n- ✅ **Backend:** NestJS with TypeScript\n- ✅ **Frontend:** ${config.frontend === 'nextjs' ? 'Next.js' : 'React'} with TypeScript${config.tailwind ? '\n- ✅ **Styling:** Tailwind CSS' : ''}${config.trpc ? '\n- ✅ **API:** tRPC for type-safe APIs' : ''}\n\n**Happy coding! 🚀**`
  );

  fs.writeFileSync(
    path.join(projectPath, '.gitignore'),
    'node_modules/\n.env\n.env.local\ndist/\nbuild/\n.next/\npackage-lock.json\nyarn.lock\npnpm-lock.yaml'
  );

  // Backend files
  fs.writeFileSync(
    path.join(projectPath, 'src/backend/src/main.ts'),
    `import { NestFactory } from '@nestjs/core';\nimport { AppModule } from './app.module';\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  await app.listen(4000);\n  console.log('🚀 Backend running on http://localhost:4000');\n}\nbootstrap();`
  );

  fs.writeFileSync(
    path.join(projectPath, 'src/backend/src/app.module.ts'),
    `import { Module } from '@nestjs/common';\nimport { AppController } from './app.controller';\n\n@Module({\n  imports: [],\n  controllers: [AppController],\n  providers: [],\n})\nexport class AppModule {}`
  );

  fs.writeFileSync(
    path.join(projectPath, 'src/backend/src/app.controller.ts'),
    `import { Controller, Get } from '@nestjs/common';\n\n@Controller()\nexport class AppController {\n  @Get()\n  getHello(): string {\n    return 'Hello from Kurdemy Backend!';\n  }\n\n  @Get('health')\n  getHealth(): object {\n    return { status: 'OK', timestamp: new Date() };\n  }\n}`
  );

  // Frontend files
  if (config.frontend === 'nextjs') {
    // Create Next.js app directory structure
    fs.mkdirSync(path.join(projectPath, 'src/frontend/app'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'src/frontend/public'), { recursive: true });

    // Next.js app/page.tsx
    fs.writeFileSync(
      path.join(projectPath, 'src/frontend/app/page.tsx'),
      `export default function Home() {\n  return (\n    <main className="flex min-h-screen flex-col items-center justify-center p-24">\n      <h1 className="text-4xl font-bold">Welcome to ${projectName}!</h1>\n      <p className="mt-4 text-xl">Your Kurdemy fullstack app is ready! 🚀</p>\n    </main>\n  );\n}`
    );

    // Next.js app/layout.tsx
    fs.writeFileSync(
      path.join(projectPath, 'src/frontend/app/layout.tsx'),
      `import type { Metadata } from 'next';\n\nexport const metadata: Metadata = {\n  title: '${projectName}',\n  description: 'Generated by Kurdemy CLI',\n};\n\nexport default function RootLayout({\n  children,\n}: {\n  children: React.ReactNode;\n}) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}`
    );

    // Next.js config
    fs.writeFileSync(
      path.join(projectPath, 'src/frontend/next.config.js'),
      `/** @type {import('next').NextConfig} */\nconst nextConfig = {\n  eslint: {\n    ignoreDuringBuilds: true,\n  },\n  typescript: {\n    ignoreBuildErrors: true,\n  },\n};\n\nmodule.exports = nextConfig;`
    );

    // TypeScript config for Next.js
    fs.writeFileSync(
      path.join(projectPath, 'src/frontend/tsconfig.json'),
      JSON.stringify({
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
      }, null, 2)
    );

  } else {
    // React files
    fs.mkdirSync(path.join(projectPath, 'src/frontend/src'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'src/frontend/public'), { recursive: true });

    fs.writeFileSync(
      path.join(projectPath, 'src/frontend/src/App.tsx'),
      `function App() {\n  return (\n    <div className="App">\n      <header className="App-header">\n        <h1>Welcome to ${projectName}!</h1>\n        <p>Your Kurdemy fullstack app is ready! 🚀</p>\n      </header>\n    </div>\n  );\n}\n\nexport default App;`
    );

    fs.writeFileSync(
      path.join(projectPath, 'src/frontend/src/index.tsx'),
      `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(\n  document.getElementById('root') as HTMLElement\n);\nroot.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`
    );

    fs.writeFileSync(
      path.join(projectPath, 'src/frontend/public/index.html'),
      `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${projectName}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>`
    );

    // TypeScript config for React
    fs.writeFileSync(
      path.join(projectPath, 'src/frontend/tsconfig.json'),
      JSON.stringify({
        "compilerOptions": {
          "target": "es5",
          "lib": [
            "dom",
            "dom.iterable",
            "es6"
          ],
          "allowJs": true,
          "skipLibCheck": true,
          "esModuleInterop": true,
          "allowSyntheticDefaultImports": true,
          "strict": true,
          "forceConsistentCasingInFileNames": true,
          "noFallthroughCasesInSwitch": true,
          "module": "esnext",
          "moduleResolution": "node",
          "resolveJsonModule": true,
          "isolatedModules": true,
          "noEmit": true,
          "jsx": "react-jsx"
        },
        "include": [
          "src"
        ]
      }, null, 2)
    );
  }
}

main();