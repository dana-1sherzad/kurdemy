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
    console.log(colors.gray('  npm install'));
    console.log(colors.gray('  npm run dev'));

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
      dev: "echo 'Run: npm run dev:backend & npm run dev:frontend'",
      "dev:backend": "cd src/backend && npm run start:dev",
      "dev:frontend": config.frontend === 'nextjs' ? "cd src/frontend && npm run dev" : "cd src/frontend && npm start"
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
      "start:dev": "echo 'Backend starting...'",
      build: "echo 'Building backend...'"
    },
    dependencies: {
      "@nestjs/common": "^10.0.0",
      "@nestjs/core": "^10.0.0"
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
      build: "next build"
    } : {
      start: "react-scripts start",
      build: "react-scripts build"
    },
    dependencies: config.frontend === 'nextjs' ? {
      "next": "^13.5.0",
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    } : {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-scripts": "^5.0.1"
    }
  };

  if (config.tailwind) {
    frontendPackage.devDependencies = {
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
    `# ${projectName}\n\nA Kurdemy fullstack app.\n\n## Setup\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\``
  );

  fs.writeFileSync(
    path.join(projectPath, '.gitignore'),
    'node_modules/\n.env\ndist/\nbuild/\n.next/'
  );

  // Basic backend main file
  fs.writeFileSync(
    path.join(projectPath, 'src/backend/src/main.ts'),
    `import { NestFactory } from '@nestjs/core';\nimport { AppModule } from './app.module';\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  await app.listen(4000);\n}\nbootstrap();`
  );

  // Basic app module
  fs.writeFileSync(
    path.join(projectPath, 'src/backend/src/app.module.ts'),
    `import { Module } from '@nestjs/common';\n\n@Module({\n  imports: [],\n  controllers: [],\n  providers: [],\n})\nexport class AppModule {}`
  );

  // Basic frontend file
  if (config.frontend === 'nextjs') {
    fs.writeFileSync(
      path.join(projectPath, 'src/frontend/page.tsx'),
      `export default function Home() {\n  return <h1>Welcome to ${projectName}!</h1>;\n}`
    );
  } else {
    fs.writeFileSync(
      path.join(projectPath, 'src/frontend/src/App.tsx'),
      `function App() {\n  return <h1>Welcome to ${projectName}!</h1>;\n}\n\nexport default App;`
    );
  }
}

main();