

// scripts/test-cli.js - CLI Testing Script

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function testCLI() {
  console.log('🧪 Testing Kurdemy CLI...');
  
  const testDir = path.join(__dirname, '../test-output');
  
  // Clean test directory
  if (await fs.pathExists(testDir)) {
    await fs.remove(testDir);
  }
  await fs.ensureDir(testDir);
  
  const testCases = [
    {
      name: 'NextJS + PostgreSQL + Prisma + tRPC + Auth + Tailwind',
      args: [
        'nextjs-full-app',
        '--frontend', 'nextjs',
        '--database', 'postgresql',
        '--orm', 'prisma',
        '--trpc',
        '--auth',
        '--tailwind',
        '--package-manager', 'npm'
      ]
    },
    {
      name: 'React + SQLite + Drizzle',
      args: [
        'react-simple-app',
        '--frontend', 'react',
        '--database', 'sqlite',
        '--orm', 'drizzle',
        '--no-trpc',
        '--no-auth',
        '--tailwind',
        '--package-manager', 'npm'
      ]
    },
    {
      name: 'NextJS + MySQL + Prisma (minimal)',
      args: [
        'nextjs-minimal-app',
        '--frontend', 'nextjs',
        '--database', 'mysql',
        '--orm', 'prisma',
        '--no-trpc',
        '--no-auth',
        '--no-tailwind',
        '--package-manager', 'npm'
      ]
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔬 Testing: ${testCase.name}`);
    
    try {
      const projectPath = path.join(testDir, testCase.args[0]);
      
      // Run CLI
      const cliPath = path.join(__dirname, '../bin/create-kurdemy-app.js');
      const command = `node ${cliPath} ${testCase.args.join(' ')}`;
      
      console.log(`   Running: ${command}`);
      execSync(command, { cwd: testDir, stdio: 'pipe' });
      
      // Verify project structure
      await verifyProjectStructure(projectPath, testCase);
      
      console.log(`   ✅ ${testCase.name} - PASSED`);
      
    } catch (error) {
      console.error(`   ❌ ${testCase.name} - FAILED`);
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }
  }
  
  console.log('\n🎉 All CLI tests passed!');
}

async function verifyProjectStructure(projectPath, testCase) {
  const requiredFiles = [
    'package.json',
    '.env.example',
    '.gitignore',
    'README.md',
    'tsconfig.json',
    'src/backend/package.json',
    'src/frontend/package.json',
    'src/backend/src/main.ts',
    'src/backend/src/app.module.ts'
  ];
  
  // Check if all required files exist
  for (const file of requiredFiles) {
    const filePath = path.join(projectPath, file);
    if (!await fs.pathExists(filePath)) {
      throw new Error(`Required file missing: ${file}`);
    }
  }
  
  // Verify package.json content
  const packageJson = await fs.readJson(path.join(projectPath, 'package.json'));
  if (!packageJson.name || !packageJson.scripts) {
    throw new Error('Invalid package.json structure');
  }
  
  // Check frontend-specific files
  const frontendArg = testCase.args.find((arg, index) => testCase.args[index - 1] === '--frontend');
  if (frontendArg === 'nextjs') {
    const nextConfigPath = path.join(projectPath, 'src/frontend/next.config.js');
    if (!await fs.pathExists(nextConfigPath)) {
      throw new Error('Next.js config file missing');
    }
  }
  
  // Check database-specific files
  const ormArg = testCase.args.find((arg, index) => testCase.args[index - 1] === '--orm');
  if (ormArg === 'prisma') {
    const prismaSchemaPath = path.join(projectPath, 'prisma/schema.prisma');
    if (!await fs.pathExists(prismaSchemaPath)) {
      throw new Error('Prisma schema file missing');
    }
  }
  
  // Check optional features
  if (testCase.args.includes('--trpc')) {
    const trpcPath = path.join(projectPath, 'src/backend/src/trpc');
    if (!await fs.pathExists(trpcPath)) {
      throw new Error('tRPC files missing');
    }
  }
  
  if (testCase.args.includes('--tailwind')) {
    const tailwindConfigPath = path.join(projectPath, 'src/frontend/tailwind.config.js');
    if (!await fs.pathExists(tailwindConfigPath)) {
      throw new Error('Tailwind config file missing');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCLI().catch(console.error);
}

module.exports = { testCLI, verifyProjectStructure };