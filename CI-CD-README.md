# CI/CD Standards & Setup

This document outlines the CI/CD standards and setup for the DevAI MCP Server project.

## 🚀 Overview

Our CI/CD pipeline ensures code quality, security, and reliability through automated checks and testing. The pipeline runs on every push to `main` and `develop` branches, as well as on pull requests.

## 📋 CI/CD Pipeline Components

### 1. Code Quality Checks
- **ESLint**: TypeScript/JavaScript linting with strict rules
- **Prettier**: Code formatting consistency
- **TypeScript**: Type checking and compilation verification

### 2. Security Scanning
- **npm audit**: Dependency vulnerability scanning
- **Automatic security fixes**: When possible, vulnerabilities are automatically fixed

### 3. Testing
- **Unit Tests**: Jest-based testing with coverage reporting
- **Integration Tests**: Database and service integration testing
- **Coverage Threshold**: 70% minimum coverage required

### 4. Build Verification
- **TypeScript Compilation**: Ensures code compiles correctly
- **Docker Build**: Container image building and testing
- **Bundle Analysis**: Performance and size monitoring

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (for container testing)
- PostgreSQL (for integration tests)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup Git hooks** (optional but recommended):
   ```bash
   npx husky install
   ```

3. **Install pre-commit hooks**:
   ```bash
   npx husky add .husky/pre-commit "npm run ci:check"
   npx husky add .husky/commit-msg "npx --no -- commitlint --edit \$1"
   ```

### Available Scripts

#### Code Quality
```bash
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues automatically
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
npm run type-check    # Run TypeScript type checking
```

#### Testing
```bash
npm run test          # Run tests in watch mode
npm run test:ci       # Run tests for CI (no watch)
npm run test:coverage # Run tests with coverage report
```

#### Security
```bash
npm run security:audit  # Run security audit
npm run security:fix    # Fix security issues automatically
```

#### CI/CD
```bash
npm run ci:check       # Run all CI checks locally
npm run ci:build       # Build application and Docker image
```

## 🔄 GitHub Actions Workflow

### Triggers
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Scheduled dependency checks (weekly)

### Jobs

1. **Lint & Format Check**
   - ESLint validation
   - Prettier formatting check
   - TypeScript type checking

2. **Security Audit**
   - npm audit for vulnerabilities
   - Automatic security fixes when possible

3. **Testing**
   - Unit and integration tests
   - Coverage reporting
   - PostgreSQL service container

4. **Build Verification**
   - TypeScript compilation
   - Build output verification

5. **Docker Build**
   - Container image building
   - Image testing

6. **Performance Check** (main branch only)
   - Bundle size analysis
   - Performance metrics

## 📊 Quality Gates

### Code Coverage
- **Minimum**: 70% overall coverage
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Code Quality
- **ESLint**: Zero warnings or errors
- **TypeScript**: No type errors
- **Prettier**: All files properly formatted

### Security
- **npm audit**: No moderate or higher vulnerabilities
- **Dependencies**: All dependencies up to date

## 🚨 Failure Handling

### CI Failures
When CI fails, the pipeline will:
1. Stop execution and report the failure
2. Provide detailed logs for debugging
3. Block merging until issues are resolved
4. Send notifications (configurable)

### Common Issues & Solutions

#### ESLint Errors
```bash
npm run lint:fix  # Auto-fix most issues
```

#### TypeScript Errors
```bash
npm run type-check  # Check for type issues
```

#### Test Failures
```bash
npm run test  # Run tests locally to debug
```

#### Security Vulnerabilities
```bash
npm run security:fix  # Auto-fix when possible
npm audit fix         # Manual fix
```

## 📝 Commit Standards

### Conventional Commits
We use conventional commit messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or changes
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks
- `revert`: Revert previous commit

#### Examples
```
feat(auth): add user authentication
fix(api): resolve database connection issue
docs(readme): update installation instructions
```

## 🔧 Configuration Files

### ESLint (`.eslintrc.json`)
- TypeScript support
- Jest testing rules
- Node.js environment
- Prettier integration

### Prettier (`.prettierrc`)
- Consistent code formatting
- 100 character line width
- Single quotes
- Trailing commas

### Jest (`jest.config.js`)
- TypeScript support
- Coverage reporting
- Test environment setup
- Coverage thresholds

### GitHub Actions (`.github/workflows/ci.yml`)
- Multi-job pipeline
- Parallel execution
- Service containers
- Caching and optimization

## 🚀 Deployment Readiness

### Docker
- Multi-stage builds for optimization
- Security best practices
- Health checks
- Non-root user

### Environment Variables
- Development: `.env`
- Testing: `.env.test`
- Production: Environment-specific

### Database
- Migration scripts
- Seed data
- Backup/restore procedures

## 📈 Monitoring & Metrics

### Code Quality Metrics
- ESLint rule compliance
- TypeScript strict mode compliance
- Test coverage trends
- Security vulnerability trends

### Performance Metrics
- Build time optimization
- Bundle size monitoring
- Docker image size tracking

## 🔄 Continuous Improvement

### Regular Reviews
- Weekly dependency updates
- Monthly security audits
- Quarterly performance reviews

### Feedback Loop
- CI failure analysis
- Performance regression detection
- Security vulnerability tracking

## 📚 Resources

- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Jest Documentation](https://jestjs.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 🤝 Contributing

When contributing to this project:

1. Follow the commit message standards
2. Ensure all tests pass locally
3. Run `npm run ci:check` before pushing
4. Address any CI failures promptly
5. Maintain or improve test coverage

## 📞 Support

For CI/CD related issues:
1. Check the GitHub Actions logs
2. Review this documentation
3. Run checks locally to reproduce issues
4. Create an issue with detailed information