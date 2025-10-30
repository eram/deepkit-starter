# dk-test

A Deepkit Framework project template with TypeScript, runtime type validation, and production-ready infrastructure.

## Features

- **Deepkit Framework** - Runtime type system with decorators and dependency injection.
- **TypeScript** - ES2020 target with strict mode and experimental decorators.
- **vite-node** - Fast TypeScript execution with Deepkit type compiler integration.
- **Test Infrastructure** - Unit and integration tests with 80% coverage enforcement.
- **Docker Build** - Multi-stage Dockerfile with Wolfi OS, automated testing, and vulnerability scanning.
- **Release Management** - Semantic versioning with automatic changelog generation.
- **Code Quality** - Biome linter with an opinionated cofiguration.

## Quick Start

```bash
# Install dependencies
npm install

# Run application
npm run dev

# Run tests with coverage (80% required)
npm test

# Run tests without coverage (fast mode)
node scripts/run-tests.js --no-coverage

# Build Docker image
npm run build

# Create release
npm run release
```

## Project Structure

```
src/              - Application source code
ci/               - Integration tests
scripts/          - Build and release scripts
.vscode/          - VSCode debug configurations
```

## Requirements

- Node.js >= 24
- Docker (for builds)
