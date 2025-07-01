module.exports = {
    // Core generators
    generatePackageJson: require('./package').generatePackageJson,
    generateEnvFiles: require('./env').generateEnvFiles,
    
    // Backend generators
    generateNestJSFiles: require('./nestjs').generateNestJSFiles,
    
    // Frontend generators
    generateNextJSFiles: require('./nextjs').generateNextJSFiles,
    generateReactFiles: require('./react').generateReactFiles,
    
    // Database generators
    generateDatabaseFiles: require('./database').generateDatabaseFiles,
    
    // Feature generators
    generateTRPCFiles: require('./trpc').generateTRPCFiles,
    generateAuthFiles: require('./auth').generateAuthFiles,
    generateTailwindFiles: require('./tailwind').generateTailwindFiles,
    
    // Configuration generators
    generateConfigFiles: require('./config').generateConfigFiles,
    generateDockerFiles: require('./docker').generateDockerFiles,
  };
  