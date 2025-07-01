const fs = require('fs-extra');
const path = require('path');
const { generatePackageJson } = require('./templates/package');
const { generateDockerFiles } = require('./templates/docker');
const { generateEnvFiles } = require('./templates/env');
const { generateNestJSFiles } = require('./templates/nestjs');
const { generateNextJSFiles } = require('./templates/nextjs');
const { generateReactFiles } = require('./templates/react');
const { generateDatabaseFiles } = require('./templates/database');
const { generateTRPCFiles } = require('./templates/trpc');
const { generateAuthFiles } = require('./templates/auth');
const { generateTailwindFiles } = require('./templates/tailwind');
const { generateConfigFiles } = require('./templates/config');

async function generateProject(projectPath, projectName, config) {
  // Create project directory
  await fs.ensureDir(projectPath);

  // Create basic folder structure
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

  // Generate database files
  await generateDatabaseFiles(projectPath, config);

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

  // Generate Docker files
  await generateDockerFiles(projectPath, config);

  // Generate README
  await generateReadme(projectPath, projectName, config);
}

async function createFolderStructure(projectPath, config) {
  const folders = [
    // Backend structure
    'src/backend',
    'src/backend/modules',
    'src/backend/modules/auth',
    'src/backend/modules/users',
    'src/backend/common',
    'src/backend/common/decorators',
    'src/backend/common/filters',
    'src/backend/common/guards',
    'src/backend/common/interceptors',
    'src/backend/common/pipes',
    'src/backend/config',
    
    // Frontend structure
    'src/frontend',
    'src/frontend/components',
    'src/frontend/components/ui',
    'src/frontend/pages',
    'src/frontend/styles',
    'src/frontend/lib',
    'src/frontend/hooks',
    'src/frontend/types',
    
    // Shared
    'src/shared',
    'src/shared/types',
    'src/shared/utils',
    
    // Database
    'prisma' // Will be created regardless, can be used for either ORM
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
      'src/frontend/app/api',
      'src/frontend/public'
    );
  } else {
    folders.push(
      'src/frontend/public',
      'src/frontend/src'
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
- **Database**: ${config.database}
- **ORM**: ${config.orm === 'prisma' ? 'Prisma' : 'Drizzle ORM'}
- **Language**: TypeScript
${config.trpc ? '- **API**: tRPC (Type-safe APIs)\n' : ''}${config.auth ? '- **Authentication**: NextAuth.js\n' : ''}${config.tailwind ? '- **Styling**: Tailwind CSS\n' : ''}

## 📦 Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── backend/          # NestJS backend
│   │   ├── modules/      # Feature modules
│   │   ├── common/       # Shared utilities
│   │   └── config/       # Configuration
│   ├── frontend/         # ${config.frontend === 'nextjs' ? 'Next.js' : 'React.js'} frontend
│   │   ├── components/   # React components
│   │   ├── pages/        # Pages/Routes
│   │   └── lib/          # Frontend utilities
│   └── shared/           # Shared code between frontend and backend
├── prisma/               # Database schema and migrations
└── package.json
\`\`\`

## 🛠️ Development

### Prerequisites

- Node.js 16+
- ${config.packageManager}
${config.database !== 'sqlite' ? `- ${config.database} database\n` : ''}

### Setup

1. **Install dependencies**
   \`\`\`bash
   ${config.packageManager} install
   \`\`\`

2. **Environment setup**
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   ${config.database !== 'sqlite' ? 'Edit `.env` with your database credentials.\n' : ''}

3. **Database setup**
   \`\`\`bash
   ${config.packageManager} run db:push
   \`\`\`

4. **Start development**
   \`\`\`bash
   ${config.packageManager} run dev
   \`\`\`

The application will be available at \`http://localhost:3000\`

## 📜 Available Scripts

- \`${config.packageManager} run dev\` - Start development servers (frontend + backend)
- \`${config.packageManager} run build\` - Build for production
- \`${config.packageManager} run start\` - Start production server
- \`${config.packageManager} run db:push\` - Push database schema
- \`${config.packageManager} run db:studio\` - Open database studio
- \`${config.packageManager} run lint\` - Run linting
- \`${config.packageManager} run test\` - Run tests

## 🌟 Features

- **Full-stack TypeScript** - End-to-end type safety
- **Modern Architecture** - Modular and scalable structure
- **Database Integration** - Ready-to-use ${config.orm} setup
${config.trpc ? '- **Type-safe APIs** - tRPC for seamless frontend-backend communication\n' : ''}${config.auth ? '- **Authentication** - NextAuth.js integration\n' : ''}${config.tailwind ? '- **Modern Styling** - Tailwind CSS with component library\n' : ''}- **Development Tools** - Hot reload, linting, and testing setup
- **Production Ready** - Docker support and optimized builds

## 📝 Environment Variables

${config.database !== 'sqlite' ? `\`\`\`env
DATABASE_URL="your-database-connection-string"
\`\`\`
` : 'No additional environment variables needed for SQLite setup.'}

${config.auth ? `For authentication:
\`\`\`env
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
\`\`\`
` : ''}

## 🚀 Deployment

This application is ready for deployment on platforms like:
- Vercel (recommended for Next.js)
- Railway
- Digital Ocean
- AWS
- Google Cloud

## 📄 License

MIT License - feel free to use this project for learning and building awesome applications!

---

Built with ❤️ using Kurdemy Stack
`;

  await fs.writeFile(path.join(projectPath, 'README.md'), readme);
}

module.exports = {
  generateProject,
  createFolderStructure
};