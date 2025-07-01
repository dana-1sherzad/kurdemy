






// CONTRIBUTING.md - Contribution Guidelines

const contributingContent = `# Contributing to Kurdemy

Thank you for your interest in contributing to Kurdemy! This guide will help you get started.

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Git
- Basic knowledge of TypeScript, React, and NestJS

### Development Setup

1. **Fork and clone the repository**
   \`\`\`bash
   git clone https://github.com/your-username/create-kurdemy-app.git
   cd create-kurdemy-app
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Link for local development**
   \`\`\`bash
   npm link
   \`\`\`

4. **Test the CLI**
   \`\`\`bash
   create-kurdemy-app test-app
   \`\`\`

## 🧪 Testing

### Run Tests
\`\`\`bash
npm test                # Run all tests
npm run test:cli        # Test CLI generation
npm run test:watch      # Run tests in watch mode
\`\`\`

### Test CLI Manually
\`\`\`bash
# Test different configurations
create-kurdemy-app test-nextjs --frontend nextjs --database postgresql
create-kurdemy-app test-react --frontend react --database sqlite
\`\`\`

## 📝 Code Style

We use ESLint and Prettier for code formatting:

\`\`\`bash
npm run lint            # Check linting
npm run lint:fix        # Fix linting issues
npm run format          # Format code
\`\`\`

## 🏗️ Project Structure

\`\`\`
create-kurdemy-app/
├── bin/                    # CLI entry point
├── lib/                    # Core CLI logic
│   ├── generator.js        # Main project generator
│   ├── installer.js        # Dependency installer
│   ├── validator.js        # Configuration validator
│   └── templates/          # Template generators
│       ├── nestjs.js       # NestJS backend templates
│       ├── nextjs.js       # Next.js frontend templates
│       ├── react.js        # React frontend templates
│       ├── database.js     # Database configurations
│       ├── auth.js         # Authentication setup
│       └── ...
├── scripts/                # Development scripts
├── tests/                  # Test files
└── docs/                   # Documentation
\`\`\`

## 🎯 How to Contribute

### 1. Adding New Features

**Template Generators**: Add new template generators in \`lib/templates/\`

\`\`\`javascript
// lib/templates/my-feature.js
async function generateMyFeature(projectPath, config) {
  // Implementation
}

module.exports = { generateMyFeature };
\`\`\`

**CLI Options**: Add new CLI options in \`bin/create-kurdemy-app.js\`

### 2. Adding Database Support

1. Update \`lib/validator.js\` to include the new database
2. Add database configuration in \`lib/templates/database.js\`
3. Update Docker configurations in \`lib/templates/docker.js\`
4. Add tests for the new database

### 3. Adding Frontend Frameworks

1. Create a new template generator (e.g., \`lib/templates/vue.js\`)
2. Update the CLI to include the new option
3. Add corresponding build and development configurations

### 4. Bug Fixes

1. Create a test that reproduces the bug
2. Fix the bug
3. Ensure all tests pass
4. Submit a pull request

## 📋 Pull Request Process

1. **Create a branch**
   \`\`\`bash
   git checkout -b feature/my-new-feature
   \`\`\`

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

3. **Test your changes**
   \`\`\`bash
   npm test
   npm run test:cli
   \`\`\`

4. **Commit your changes**
   \`\`\`bash
   git add .
   git commit -m "feat: add support for Vue.js"
   \`\`\`

5. **Push and create PR**
   \`\`\`bash
   git push origin feature/my-new-feature
   \`\`\`

### Commit Message Format

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

- \`feat:\` - New features
- \`fix:\` - Bug fixes
- \`docs:\` - Documentation changes
- \`style:\` - Code style changes
- \`refactor:\` - Code refactoring
- \`test:\` - Adding tests
- \`chore:\` - Maintenance tasks

## 🐛 Reporting Issues

When reporting issues, please include:

1. **Environment details**
   - Node.js version
   - npm version
   - Operating system

2. **Steps to reproduce**
   - Exact CLI command used
   - Expected vs actual behavior

3. **Additional context**
   - Error messages
   - Screenshots (if applicable)

## 💡 Feature Requests

We love feature requests! Please:

1. Check existing issues first
2. Clearly describe the feature
3. Explain the use case
4. Consider implementation complexity

## 📄 Documentation

Help improve our documentation:

- Fix typos and errors
- Add examples
- Improve clarity
- Translate to other languages

## 🏆 Recognition

Contributors are recognized in:

- GitHub contributors list
- Release notes
- Documentation credits

## 📞 Getting Help

- 💬 [Discord Community](https://discord.gg/kurdemy)
- 🐛 [GitHub Issues](https://github.com/kurdemy/create-kurdemy-app/issues)
- 📧 [Email](mailto:contribute@kurdemy.com)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
`;

// Export all the integration files
module.exports = {
  testCLI,
  buildCLI,
  publishCLI,
  workflowContent,
  contributingContent
};