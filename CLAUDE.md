# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Notes

### Model

- Code is written in TypeScript and run using vite-node with Deepkit type compiler support.
- Code is run in dev and in prod using vite-node. We do not build a JS version of the code.
- In non-local environment, including prod, code is run on a docker image. Use npm run build to build the image. This also runs the unit tests as first stage and a vulnerability scan as last stage. Failing test should fail the build.
- Use TDD when coding: always write test before fixing or changing the code and re-run the tests after changes.
- Write code in such a way that tests pass cleanly without errors.
- Code coverage is tracked using Vitest with V8 provider. Coverage reports in lcov format are generated in `./coverage/`.
- **Coverage Limitations**: Due to Deepkit type compiler transformations, V8 coverage tracking does not work accurately. Coverage thresholds are disabled. This is a known limitation when combining custom Vite plugins with V8 coverage.
- Coverage exclusions (automatic): test files (*.test.ts, *.spec.ts), mock files (**/__mocks__/**, **/mock/**), and index files (index.ts, index.js, etc.)
- Coverage exclusions (manual): Use `/* v8 ignore start */` and `/* v8 ignore stop */` comments to exclude specific code blocks from coverage analysis.
- Adding dependency libraries into `dependencies` in package.json is strictly prohibited. Needs explicit developer approval.
- Code assumes Node.js >= 24 (see package.json engine field).
- You should never try to change files outside of the working folder (base folder of the project).
- All the project config files (the files outside src) should not be changed without explicit developer approval.

### TypeScript Configuration

- Target: es2020
- Module: ESNext
- Module Resolution: bundler
- Lib: ["es2020", "DOM"]
- Strict mode enabled
- Deepkit reflection enabled (`"reflection": true` in tsconfig.json)
- Experimental decorators enabled for Deepkit framework
- Use Deepkit type annotations (MinLength, MaxLength, Positive, Email, Flag, etc.)

### Deepkit Framework

- Uses @deepkit/app for application structure and dependency injection
- Type compiler enabled via @deepkit/vite plugin in vitest.config.ts (shared with Vite)
- CLI commands implemented with @cli.controller decorator
- Runtime type validation using Deepkit's type system
- Commands must implement the Command interface from @deepkit/app

### Testing Patterns

- **Test Framework**: Vitest 3.2.4 (downgraded from 4.0 due to Windows compatibility issues)
- **Assertions**: Vitest's `expect` API (Jest-compatible)
- **Test Files**: `*.test.ts` files alongside source in src/ folder
- **Unit Tests**: Use direct imports with mock dependencies (fast, run via Vitest)
- **Integration Tests** (ci/ folder): Run via `scripts/run-ci-tests.js` using vite-node directly (not through Vitest due to env var inheritance issues)
- **Environment Variable**: `deepkit_test_mode` is set by Vitest to prevent app auto-run during test imports
- **Watch Mode**: Available via `npm run test:watch` for TDD workflows
- **Test Organization**: Use `describe` and `test` from Vitest, `beforeEach`/`afterEach` for setup/teardown
- Tests can be debugged using VSCode launch configurations

### Coding patterns

- Never use `null` >> use `undefined` instead
- Never use `any` >> use `unknown` instead
- Use Deepkit type annotations for type validation
- Export app and command classes for testing
- Use `deepkit_test_mode` environment variable check to prevent app auto-run during test imports
- File naming uses kebab-case convention (e.g., run-tests.js, not run_tests.js) following Deepkit standards.

## Commands

### Testing

- `npm test` - Run linter and all unit tests via Vitest
- `npm run test:unit` - Run unit tests with coverage report
- `npm run test:watch` - Run tests in watch mode for TDD (no coverage)
- `npm run ci` - Run integration tests via vite-node (scripts/run-ci-tests.js)
- `npx vitest run src/app.test.ts` - Run specific test file
- VSCode debugger can be used to debug tests (see .vscode/launch.json)
- Coverage reports: `./coverage/lcov.info` (for VSCode Coverage Gutters extension)
- **Note**: Coverage tracking is currently inaccurate due to Deepkit type compiler transformations

### Development

- `npm run dev` - Run application in watch mode (hot-reload on file changes)
- `npm run app` - Run application using vite-node

### Building

- `npm run build` - Docker build with tests and vulnerability scan, outputs logs
- `npm run build:grype` - Build with Grype vulnerability scan only
- `npm run release` - Full release: version bump, changelog, git tag, push

### Release Management

- `node scripts/release.js [patch|minor|major|ci]` - Version bump and release
  - No params: auto-detect based on commit messages (feat = minor, else patch)
  - `ci`: creates timestamped version without git tag
  - `patch|minor|major`: explicit version bump
  - Automatically updates CHANGELOG.md with commits since last tag
  - Creates git tag and pushes (except for ci builds)

## Architecture

### Project Structure

This is a Deepkit Framework application organized into:

- **src/** - Application source code (app.ts, test files)
- **ci/** - Continuous integration tests (integration tests)
- **scripts/** - Build, test, and utility scripts
- **.vscode/** - VSCode debug configurations

### Key Architectural Components

#### 1. Deepkit Application (src/app.ts)

Main application file with:

- CLI command controllers using @cli.controller decorator
- Dependency injection via @deepkit/app
- Type validation using Deepkit type system (MinLength, MaxLength, Positive, Flag, etc.)
- Logger injection for structured logging

#### 2. Test Infrastructure

- **Unit Tests**: Fast tests using direct imports with Vitest, mock dependencies
- **Integration Tests**: Full CLI behavior tests via scripts/run-ci-tests.js using vite-node and node:assert
- **CI Test Runner**: Custom runner using util.parseArgs() with async/await pattern
- **Coverage**: Vitest with V8 provider (note: limited accuracy due to Deepkit transformations)

#### 3. Docker Build Strategy

Multi-stage Dockerfile with Wolfi OS base:

1. **test** - Runs tests, fails build if tests fail
2. **prod** - Production image (only if tests pass)
3. **scan** - Grype vulnerability scan (fails on critical vulns)
4. **logs** - Exports test and scan logs

#### 4. Development Workflow

- vite-node for TypeScript execution with Deepkit type compiler
- Deepkit Vite plugin (@deepkit/vite) with deepkitType() for runtime type transformation
- VSCode debug configurations for debugging app and tests
- Git-based version management with conventional commits

### VSCode Debug Configurations

Available debug configurations in .vscode/launch.json:

1. **Debug Current File** - F5 on any .ts file to debug it
2. **Debug Current File with Args** - Debug with command-line arguments
3. **Debug app.ts** - Dedicated application debugging
4. **Debug All Tests** - Debug the full test suite

### Version Management

Release process using scripts/release.js:

- Follows semantic versioning (semver)
- Auto-detects version bump from commit messages
- Supports conventional commits (feat = minor, fix = patch)
- Updates CHANGELOG.md automatically
- Creates git tags and pushes to remote (master branch)
- Supports CI builds with timestamped versions

### Environment

- Node.js 24+ required
- Windows development environment (project at c:\src\eram\dk-test)
- Git repository on master branch
- Uses npm for package management
