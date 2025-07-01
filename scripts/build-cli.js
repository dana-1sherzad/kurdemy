// scripts/build-cli.js - CLI Build Script

const fs = require('fs-extra');
const path = require('path');

async function buildCLI() {
  console.log('🔨 Building Kurdemy CLI...');
  
  const rootDir = path.join(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  
  // Clean dist directory
  if (await fs.pathExists(distDir)) {
    await fs.remove(distDir);
  }
  await fs.ensureDir(distDir);
  
  // Copy essential files
  const filesToCopy = [
    'bin/',
    'lib/',
    'templates/',
    'package.json',
    'README.md',
    'LICENSE'
  ];
  
  for (const file of filesToCopy) {
    const sourcePath = path.join(rootDir, file);
    const destPath = path.join(distDir, file);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, destPath);
      console.log(`   ✅ Copied ${file}`);
    }
  }
  
  // Update package.json for distribution
  const packageJsonPath = path.join(distDir, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  
  // Remove dev dependencies for distribution
  delete packageJson.devDependencies;
  
  // Update scripts
  packageJson.scripts = {
    test: 'echo "No tests specified"'
  };
  
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  
  console.log('✅ CLI build complete!');
}

// Run build if this file is executed directly
if (require.main === module) {
  buildCLI().catch(console.error);
}

module.exports = { buildCLI };

// scripts/publish-cli.js - CLI Publishing Script

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function publishCLI() {
  console.log('📦 Publishing Kurdemy CLI...');
  
  const rootDir = path.join(__dirname, '..');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  
  console.log(`Publishing version: ${packageJson.version}`);
  
  // Run tests before publishing
  console.log('🧪 Running tests...');
  try {
    execSync('npm test', { cwd: rootDir, stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Tests failed. Aborting publish.');
    process.exit(1);
  }
  
  // Build the CLI
  console.log('🔨 Building CLI...');
  const { buildCLI } = require('./build-cli');
  await buildCLI();
  
  // Check npm authentication
  try {
    execSync('npm whoami', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Not logged in to npm. Run "npm login" first.');
    process.exit(1);
  }
  
  // Publish to npm
  console.log('🚀 Publishing to npm...');
  try {
    execSync('npm publish', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Successfully published to npm!');
  } catch (error) {
    console.error('❌ Failed to publish to npm');
    console.error(error.message);
    process.exit(1);
  }
  
  // Create git tag
  console.log('🏷️ Creating git tag...');
  try {
    execSync(`git tag v${packageJson.version}`, { cwd: rootDir });
    execSync(`git push origin v${packageJson.version}`, { cwd: rootDir });
    console.log(`✅ Created git tag v${packageJson.version}`);
  } catch (error) {
    console.warn('⚠️ Failed to create git tag (this is optional)');
  }
  
  console.log('\n🎉 CLI published successfully!');
  console.log(`\n📖 Users can now run:`);
  console.log(`   npx create-kurdemy-app@${packageJson.version} my-app`);
}

// Run publish if this file is executed directly
if (require.main === module) {
  publishCLI().catch(console.error);
}

module.exports = { publishCLI };