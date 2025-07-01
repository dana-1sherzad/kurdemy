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

module.exports = {
  installDependencies,
  runScript,
  checkPackageManagerAvailability,
  initializeGit,
  getInstallCommand,
  getScriptCommand
};