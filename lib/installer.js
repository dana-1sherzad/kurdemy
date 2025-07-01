const { execa } = require('execa');
const path = require('path');
const chalk = require('chalk');

async function installDependencies(projectPath, packageManager = 'npm') {
  const installCommand = getInstallCommand(packageManager);
  
  try {
    await execa(installCommand.command, installCommand.args, {
      cwd: projectPath,
      stdio: 'pipe'
    });
  } catch (error) {
    throw new Error(`Failed to install dependencies: ${error.message}`);
  }
}

function getInstallCommand(packageManager) {
  switch (packageManager) {
    case 'yarn':
      return { command: 'yarn', args: ['install'] };
    case 'pnpm':
      return { command: 'pnpm', args: ['install'] };
    default:
      return { command: 'npm', args: ['install'] };
  }
}

async function runScript(projectPath, script, packageManager = 'npm') {
  const command = getScriptCommand(packageManager, script);
  
  try {
    await execa(command.command, command.args, {
      cwd: projectPath,
      stdio: 'inherit'
    });
  } catch (error) {
    console.log(chalk.yellow(`Warning: Failed to run script "${script}": ${error.message}`));
  }
}

function getScriptCommand(packageManager, script) {
  switch (packageManager) {
    case 'yarn':
      return { command: 'yarn', args: [script] };
    case 'pnpm':
      return { command: 'pnpm', args: ['run', script] };
    default:
      return { command: 'npm', args: ['run', script] };
  }
}

async function checkPackageManagerAvailability(packageManager) {
  try {
    await execa(packageManager, ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function initializeGit(projectPath) {
  try {
    await execa('git', ['init'], { cwd: projectPath, stdio: 'pipe' });
    await execa('git', ['add', '.'], { cwd: projectPath, stdio: 'pipe' });
    await execa('git', ['commit', '-m', 'Initial commit from Kurdemy CLI'], { 
      cwd: projectPath, 
      stdio: 'pipe' 
    });
    return true;
  } catch {
    return false;
  }
}

async function setupHusky(projectPath, packageManager = 'npm') {
  try {
    // Install husky
    const huskyCommand = getScriptCommand(packageManager, 'husky');
    await execa(huskyCommand.command, ['install'], {
      cwd: projectPath,
      stdio: 'pipe'
    });
    return true;
  } catch (error) {
    console.log(chalk.yellow(`Warning: Failed to setup Husky: ${error.message}`));
    return false;
  }
}

async function buildProject(projectPath, packageManager = 'npm') {
  try {
    await runScript(projectPath, 'build', packageManager);
    return true;
  } catch (error) {
    console.log(chalk.yellow(`Warning: Failed to build project: ${error.message}`));
    return false;
  }
}

async function runLinting(projectPath, packageManager = 'npm') {
  try {
    await runScript(projectPath, 'lint', packageManager);
    return true;
  } catch (error) {
    console.log(chalk.yellow(`Warning: Failed to run linting: ${error.message}`));
    return false;
  }
}

async function runTypeCheck(projectPath, packageManager = 'npm') {
  try {
    await runScript(projectPath, 'type-check', packageManager);
    return true;
  } catch (error) {
    console.log(chalk.yellow(`Warning: Failed to run type checking: ${error.message}`));
    return false;
  }
}

async function installWorkspaceDependencies(projectPath, packageManager = 'npm') {
  try {
    // Install root dependencies
    await installDependencies(projectPath, packageManager);
    
    // Install backend dependencies
    const backendPath = path.join(projectPath, 'src/backend');
    await installDependencies(backendPath, packageManager);
    
    // Install frontend dependencies
    const frontendPath = path.join(projectPath, 'src/frontend');
    await installDependencies(frontendPath, packageManager);
    
    return true;
  } catch (error) {
    throw new Error(`Failed to install workspace dependencies: ${error.message}`);
  }
}

async function setupDevEnvironment(projectPath, packageManager = 'npm') {
  const setupSteps = [];
  
  try {
    // Setup git if not already initialized
    const gitInitialized = await initializeGit(projectPath);
    setupSteps.push({ step: 'Git repository', success: gitInitialized });
    
    // Setup Husky for git hooks
    const huskySetup = await setupHusky(projectPath, packageManager);
    setupSteps.push({ step: 'Git hooks (Husky)', success: huskySetup });
    
    // Run type checking
    const typeCheck = await runTypeCheck(projectPath, packageManager);
    setupSteps.push({ step: 'Type checking', success: typeCheck });
    
    return setupSteps;
  } catch (error) {
    throw new Error(`Failed to setup development environment: ${error.message}`);
  }
}

module.exports = {
  installDependencies,
  runScript,
  checkPackageManagerAvailability,
  initializeGit,
  setupHusky,
  buildProject,
  runLinting,
  runTypeCheck,
  installWorkspaceDependencies,
  setupDevEnvironment,
  getInstallCommand,
  getScriptCommand
};