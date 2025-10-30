#!/usr/bin/env node
//
// scripts/run-vitest.js
// Run Vitest tests using vite-node directly (faster than npx)
// Usage:
//   node scripts/run-vitest.js              - run tests
//   node scripts/run-vitest.js --coverage   - run with coverage
//   node scripts/run-vitest.js --watch      - run in watch mode
//

import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const isWindows = platform() === 'win32';
const vitestBin = isWindows ? 'node_modules\\.bin\\vitest.cmd' : 'node_modules/.bin/vitest';

// Forward all arguments to vitest
const args = process.argv.slice(2);

const child = spawn(vitestBin, args, {
    stdio: 'inherit',
    shell: isWindows,
});

child.on('exit', (code) => {
    process.exit(code || 0);
});
