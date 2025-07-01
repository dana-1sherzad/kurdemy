#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function publish() {
  console.log('🚀 Publishing create-kurdemy-app...');
  
  try {
    // Check if logged in
    execSync('npm whoami', { stdio: 'pipe' });
    console.log('✅ Logged in to npm');
  } catch (error) {
    console.error('❌ Not logged in to npm. Run: npm login');
    process.exit(1);
  }
  
  // Check package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`📦 Publishing ${packageJson.name}@${packageJson.version}`);
  
  // Run tests (if any)
  try {
    console.log('🧪 Running tests...');
    execSync('npm test', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️ No tests found, skipping...');
  }
  
  // Publish
  try {
    console.log('📤 Publishing to npm...');
    execSync('npm publish', { stdio: 'inherit' });
    console.log('🎉 Successfully published!');
    console.log(`\nUsers can now install with:`);
    console.log(`npm install -g ${packageJson.name}`);
    console.log(`\nOr use directly:`);
    console.log(`npx ${packageJson.name} my-app`);
  } catch (error) {
    console.error('❌ Publishing failed:', error.message);
    process.exit(1);
  }
}

publish();