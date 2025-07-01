#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const validatePackageName = require('validate-npm-package-name');
const gradient = require('gradient-string');
const { generateProject } = require('../lib/generator');
const { installDependencies } = require('../lib/installer');
const { validateOptions } = require('../lib/validator');

const program = new Command();

// ASCII Art Banner
const banner = gradient.rainbow(`
██   ██ ██    ██ ██████  ██████  ███████ ███    ███ ██    ██ 
██  ██  ██    ██ ██   ██ ██   ██ ██      ████  ████  ██  ██  
█████   ██    ██ ██████  ██   ██ █████   ██ ████ ██   ████   
██  ██  ██    ██ ██   ██ ██   ██ ██      ██  ██  ██    ██    
██   ██  ██████  ██   ██ ██████  ███████ ██      ██    ██    
                                                             
Create modern fullstack applications with ease!
`);

async function main() {
  console.log(banner);
  console.log(chalk.gray('Welcome to Kurdemy Stack Generator\n'));

  const args = process.argv.slice(2);
  let projectName = args[0];

  // Validate project name
  if (!projectName) {
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'What is your project name?',
        default: 'my-kurdemy-app',
        validate: (input) => {
          const validation = validatePackageName(input);
          if (validation.validForNewPackages) {
            return true;
          }
          return `Invalid project name: ${validation.errors?.[0] || validation.warnings?.[0]}`;
        }
      }
    ]);
    projectName = name;
  }

  // Check if directory already exists
  const projectPath = path.resolve(process.cwd(), projectName);
  if (await fs.pathExists(projectPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory ${projectName} already exists. Do you want to overwrite it?`,
        default: false
      }
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Operation cancelled.'));
      process.exit(0);
    }

    await fs.remove(projectPath);
  }

  // Configuration questions - REMOVED DATABASE AND ORM QUESTIONS
  const config = await inquirer.prompt([
    {
      type: 'list',
      name: 'frontend',
      message: 'Choose your frontend framework:',
      choices: [
        { name: 'Next.js (Recommended)', value: 'nextjs' },
        { name: 'React.js', value: 'react' }
      ],
      default: 'nextjs'
    },
    {
      type: 'confirm',
      name: 'trpc',
      message: 'Do you want to use tRPC for type-safe APIs?',
      default: true
    },
    {
      type: 'confirm',
      name: 'auth',
      message: 'Do you want to include NextAuth.js for authentication?',
      default: true,
      when: (answers) => answers.frontend === 'nextjs' // Only show for Next.js
    },
    {
      type: 'confirm',
      name: 'tailwind',
      message: 'Do you want to use Tailwind CSS?',
      default: true
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Choose your package manager:',
      choices: [
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' },
        { name: 'pnpm', value: 'pnpm' }
      ],
      default: 'npm'
    }
  ]);

  // Set auth to false if not Next.js
  if (config.frontend !== 'nextjs') {
    config.auth = false;
  }

  // Validate configuration
  const validation = validateOptions(config);
  if (!validation.valid) {
    console.log(chalk.red(`Configuration error: ${validation.error}`));
    process.exit(1);
  }

  // Generate project
  const spinner = ora('Creating your Kurdemy app...').start();
  
  try {
    await generateProject(projectPath, projectName, config);
    spinner.succeed('Project structure created!');

    // Install dependencies
    spinner.start('Installing dependencies...');
    await installDependencies(projectPath, config.packageManager);
    spinner.succeed('Dependencies installed!');

    // Success message - REMOVED DATABASE SETUP INSTRUCTIONS
    console.log('\n' + chalk.green('🎉 Your Kurdemy app has been created successfully!\n'));
    
    console.log(chalk.bold('Next steps:'));
    console.log(chalk.gray(`  cd ${projectName}`));
    console.log(chalk.gray('  # Start development server'));
    console.log(chalk.gray(`  ${config.packageManager} run dev`));
    
    console.log('\n' + chalk.blue('Happy coding! 🚀'));
    console.log('\n' + chalk.gray('Your app will be available at:'));
    console.log(chalk.cyan('  Frontend: http://localhost:3000'));
    console.log(chalk.cyan('  Backend:  http://localhost:4000'));
    
  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

program
  .name('create-kurdemy-app')
  .description('Create a new Kurdemy stack application')
  .version('1.0.0')
  .argument('[project-name]', 'Name of the project')
  .action(main);

program.parse(process.argv);

module.exports = { main };