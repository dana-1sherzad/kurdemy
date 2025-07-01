function validateOptions(config) {
  const errors = [];

  // Validate frontend choice
  if (!['nextjs', 'react'].includes(config.frontend)) {
    errors.push('Invalid frontend choice. Must be "nextjs" or "react".');
  }

  // Validate package manager
  if (!['npm', 'yarn', 'pnpm'].includes(config.packageManager)) {
    errors.push('Invalid package manager. Must be "npm", "yarn", or "pnpm".');
  }

  // Validate boolean options
  const booleanOptions = ['trpc', 'auth', 'tailwind'];
  for (const option of booleanOptions) {
    if (typeof config[option] !== 'boolean') {
      errors.push(`${option} must be a boolean value.`);
    }
  }

  // Check compatibility issues
  if (config.auth && config.frontend !== 'nextjs') {
    errors.push('NextAuth.js requires Next.js as the frontend framework.');
  }

  return {
    valid: errors.length === 0,
    errors,
    error: errors.length > 0 ? errors[0] : null
  };
}

function validateProjectName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Project name is required and must be a string.' };
  }

  if (name.length < 1) {
    return { valid: false, error: 'Project name cannot be empty.' };
  }

  if (name.length > 214) {
    return { valid: false, error: 'Project name is too long (max 214 characters).' };
  }

  // Check for invalid characters
  if (!/^[a-z0-9_.-]+$/i.test(name)) {
    return { valid: false, error: 'Project name can only contain letters, numbers, hyphens, underscores, and dots.' };
  }

  // Check if it starts with a dot or hyphen
  if (name.startsWith('.') || name.startsWith('-')) {
    return { valid: false, error: 'Project name cannot start with a dot or hyphen.' };
  }

  // Check for reserved names
  const reservedNames = [
    'node_modules',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.git',
    '.env',
    'src',
    'dist',
    'build'
  ];

  if (reservedNames.includes(name.toLowerCase())) {
    return { valid: false, error: `"${name}" is a reserved name and cannot be used as a project name.` };
  }

  return { valid: true };
}

function getRecommendations(config) {
  const recommendations = [];

  // Performance recommendations
  if (config.frontend === 'react' && !config.trpc) {
    recommendations.push('Consider using tRPC for better type safety between frontend and backend.');
  }

  // Development experience recommendations
  if (!config.tailwind) {
    recommendations.push('Tailwind CSS can significantly speed up your styling workflow.');
  }

  if (!config.auth && config.frontend === 'nextjs') {
    recommendations.push('NextAuth.js provides easy authentication setup for Next.js applications.');
  }

  // Package manager recommendations
  if (config.packageManager === 'npm') {
    recommendations.push('Consider using pnpm or yarn for faster installs and better dependency management.');
  }

  // Stack recommendations
  if (config.frontend === 'nextjs' && config.trpc) {
    recommendations.push('Next.js with tRPC provides excellent full-stack type safety.');
  }

  if (config.tailwind && config.frontend === 'nextjs') {
    recommendations.push('Tailwind CSS integrates seamlessly with Next.js for rapid UI development.');
  }

  return recommendations;
}

function validateEnvironmentSetup() {
  const requirements = [];
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    requirements.push('Node.js 16 or higher is required. Current version: ' + nodeVersion);
  }

  return {
    valid: requirements.length === 0,
    requirements,
    error: requirements.length > 0 ? requirements[0] : null
  };
}

function validateStackCompatibility(config) {
  const warnings = [];

  // Check if all selected options work well together
  if (config.auth && !config.trpc && config.frontend === 'nextjs') {
    warnings.push('Using NextAuth.js with tRPC provides better type safety for authentication.');
  }

  if (config.trpc && config.frontend === 'react') {
    warnings.push('tRPC works great with React, but consider the additional setup complexity.');
  }

  return {
    compatible: true, // Our simplified stack is always compatible
    warnings
  };
}

module.exports = {
  validateOptions,
  validateProjectName,
  getRecommendations,
  validateEnvironmentSetup,
  validateStackCompatibility
};