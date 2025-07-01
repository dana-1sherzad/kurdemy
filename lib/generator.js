const fs = require('fs-extra');
const path = require('path');
const { generatePackageJson } = require('../templates/packages');
const { generateEnvFiles } = require('../templates/env');
const { generateNestJSFiles } = require('../templates/nestjs');
const { generateNextJSFiles } = require('../templates/nextjs');
const { generateReactFiles } = require('../templates/reactjs');
const { generateTRPCFiles } = require('../templates/trpc');
const { generateAuthFiles } = require('../templates/auth');
const { generateTailwindFiles } = require('../templates/tailwind');
const { generateConfigFiles } = require('../templates/config');

async function generateProject(projectPath, projectName, config) {
  try {
    // Create project directory
    await fs.ensureDir(projectPath);

    // Create basic folder structure (NO DATABASE FOLDERS)
    await createFolderStructure(projectPath, config);

    // Generate package.json
    await generatePackageJson(projectPath, projectName, config);

    // Generate environment files
    await generateEnvFiles(projectPath, config);

    // Generate backend (NestJS)
    await generateNestJSFiles(projectPath, config);

    // Generate frontend (Next.js or React)
    if (config.frontend === 'nextjs') {
      await generateNextJSFiles(projectPath, config);
    } else {
      await generateReactFiles(projectPath, config);
    }

    // Generate tRPC if selected
    if (config.trpc) {
      await generateTRPCFiles(projectPath, config);
    }

    // Generate auth files if selected
    if (config.auth) {
      await generateAuthFiles(projectPath, config);
    }

    // Generate Tailwind CSS if selected
    if (config.tailwind) {
      await generateTailwindFiles(projectPath, config);
    }

    // Generate configuration files
    await generateConfigFiles(projectPath, config);

    // Generate README
    await generateReadme(projectPath, projectName, config);

  } catch (error) {
    throw new Error(`Failed to generate project: ${error.message}`);
  }
}

async function createFolderStructure(projectPath, config) {
  const folders = [
    // Backend structure
    'src/backend',
    'src/backend/src',
    'src/backend/src/config',
    'src/backend/src/common',
    'src/backend/src/modules',
    'src/backend/src/modules/health',
    
    // Frontend structure
    'src/frontend',
    'src/frontend/components',
    'src/frontend/pages',
    'src/frontend/styles',
    'src/frontend/lib',
    'src/frontend/types',
    'src/frontend/public',
    
    // Shared
    'src/shared',
    'src/shared/types',
    'src/shared/utils'
  ];

  if (config.trpc) {
    folders.push(
      'src/shared/trpc',
      'src/backend/trpc',
      'src/frontend/trpc'
    );
  }

  if (config.frontend === 'nextjs') {
    folders.push(
      'src/frontend/app',
      'src/frontend/app/api'
    );
  }

  for (const folder of folders) {
    await fs.ensureDir(path.join(projectPath, folder));
  }
}

async function generateReadme(projectPath, projectName, config) {
  const readme = `# ${projectName}

A modern fullstack application built with the Kurdemy stack.

## 🚀 Tech Stack

- **Backend**: NestJS
- **Frontend**: ${config.frontend === 'nextjs' ? 'Next.js' : 'React.js'}
- **Language**: TypeScript
${config.trpc ? '- **API**: tRPC (Type-safe APIs)\n' : ''}${config.auth ? '- **Authentication**: NextAuth.js\n' : ''}${config.tailwind ? '- **Styling**: Tailwind CSS\n' : ''}

## 🛠️ Development

### Prerequisites

- Node.js 16+
- ${config.packageManager}

### Setup

1. **Install dependencies**
   \`\`\`bash
   ${config.packageManager} install
   \`\`\`

2. **Start development**
   \`\`\`bash
   ${config.packageManager} run dev
   \`\`\`

The application will be available at \`http://localhost:3000\`

## 📜 Available Scripts

- \`${config.packageManager} run dev\` - Start development servers
- \`${config.packageManager} run build\` - Build for production
- \`${config.packageManager} run start\` - Start production server
- \`${config.packageManager} run lint\` - Run linting
- \`${config.packageManager} run test\` - Run tests

## 🎉 Happy Coding!

Built with ❤️ using Kurdemy Stack
`;

  await fs.writeFile(path.join(projectPath, 'README.md'), readme);
}

module.exports = {
  generateProject
};