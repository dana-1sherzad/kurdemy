
// jest.config.js - Jest Configuration

module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    collectCoverageFrom: [
      'lib/**/*.js',
      'bin/**/*.js',
      '!lib/**/*.test.js',
      '!lib/**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 30000,
    verbose: true
  };
  
  // .github/workflows/test-and-publish.yml - GitHub Actions Workflow
  
  const workflowContent = `name: Test and Publish
  
  on:
    push:
      branches: [ main ]
      tags: [ 'v*' ]
    pull_request:
      branches: [ main ]
  
  jobs:
    test:
      runs-on: ubuntu-latest
      
      strategy:
        matrix:
          node-version: [16.x, 18.x, 20.x]
      
      steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run tests
        run: npm test
      
      - name: Test CLI generation
        run: npm run test:cli
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: matrix.node-version == '20.x'
  
    publish:
      needs: test
      runs-on: ubuntu-latest
      if: startsWith(github.ref, 'refs/tags/v')
      
      steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js 20.x
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build CLI
        run: npm run build
      
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
  `;
  