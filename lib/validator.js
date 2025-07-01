function validateOptions(config) {
    const errors = [];
  
    // Validate frontend choice
    if (!['nextjs', 'react'].includes(config.frontend)) {
      errors.push('Invalid frontend choice. Must be "nextjs" or "react".');
    }
  
    // Validate database choice
    if (!['postgresql', 'mysql', 'sqlite', 'sqlserver'].includes(config.database)) {
      errors.push('Invalid database choice. Must be one of: postgresql, mysql, sqlite, sqlserver.');
    }
  
    // Validate ORM choice
    if (!['prisma', 'drizzle'].includes(config.orm)) {
      errors.push('Invalid ORM choice. Must be "prisma" or "drizzle".');
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
  
    if (config.orm === 'drizzle' && config.database === 'sqlserver') {
      errors.push('Drizzle ORM does not fully support SQL Server yet. Please use Prisma for SQL Server.');
    }
  
    // Check if tRPC is compatible with chosen stack
    if (config.trpc && config.frontend === 'react' && !config.backend) {
      // This is a logical check - tRPC needs a backend
      // In our case, we always have NestJS backend, so this is just for future compatibility
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
  
  function validateDatabaseConnection(database, connectionString) {
    if (!connectionString || typeof connectionString !== 'string') {
      return { valid: false, error: 'Database connection string is required.' };
    }
  
    const patterns = {
      postgresql: /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/\w+$/,
      mysql: /^mysql:\/\/[^:]+:[^@]+@[^:]+:\d+\/\w+$/,
      sqlite: /^file:.*\.db$/,
      sqlserver: /^sqlserver:\/\/[^:]+:[^@]+@[^:]+:\d+;database=\w+$/
    };
  
    const pattern = patterns[database];
    if (!pattern) {
      return { valid: false, error: `Unknown database type: ${database}` };
    }
  
    if (database === 'sqlite') {
      // SQLite is more flexible with file paths
      return { valid: true };
    }
  
    if (!pattern.test(connectionString)) {
      return { 
        valid: false, 
        error: `Invalid ${database} connection string format.` 
      };
    }
  
    return { valid: true };
  }
  
  function getRecommendations(config) {
    const recommendations = [];
  
    // Performance recommendations
    if (config.frontend === 'react' && !config.trpc) {
      recommendations.push('Consider using tRPC for better type safety between frontend and backend.');
    }
  
    if (config.database === 'sqlite' && config.orm === 'drizzle') {
      recommendations.push('SQLite with Drizzle is a great choice for development and small applications.');
    }
  
    if (config.database === 'postgresql' && config.orm === 'prisma') {
      recommendations.push('PostgreSQL with Prisma is an excellent choice for production applications.');
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
  
    return recommendations;
  }
  
  module.exports = {
    validateOptions,
    validateProjectName,
    validateDatabaseConnection,
    getRecommendations
  };