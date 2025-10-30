#!/usr/bin/env node
//
// script/run-ci-tests.js
// CI integration test runner using vite-node directly (not through Vitest)
// Usage:
//   node script/run-ci-tests.js                 - run all tests
//   node script/run-ci-tests.js --verbose       - run with verbose output
//   node script/run-ci-tests.js test-name       - run specific test
//

import { exec } from 'node:child_process';
import { glob } from 'node:fs/promises';
import { platform } from 'node:os';
import { parseArgs, promisify, styleText } from 'node:util';

const execAsync = promisify(exec);

// Styled logging helpers
function error(...args) {
    console.error(styleText('red', args.join(' ')));
}

function warning(...args) {
    console.log(styleText('yellow', args.join(' ')));
}

function log(...args) {
    console.log(styleText('gray', args.join(' ')));
}

function success(...args) {
    console.log(styleText('green', args.join(' ')));
}

function info(...args) {
    console.log(styleText('cyan', args.join(' ')));
}

// Parse command line arguments
const { values: options, positionals } = parseArgs({
    options: {
        verbose: { type: 'boolean', short: 'v', default: false },
        help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
});

if (options.help) {
    console.log(`
Usage: node script/run-ci-tests.js [options] [test-filter]

Options:
  -v, --verbose    Show detailed test output
  -h, --help       Show this help message

Examples:
  node script/run-ci-tests.js                    Run all CI tests
  node script/run-ci-tests.js --verbose          Run with detailed output
  node script/run-ci-tests.js "help"             Run tests matching "help"
`);
    process.exit(0);
}

const verbose = options.verbose;
const testFilter = positionals[0] || null;

// Use platform-specific vite-node binary path
const isWindows = platform() === 'win32';
const viteNodeBin = isWindows ? 'node_modules\\.bin\\vite-node.cmd' : 'node_modules/.bin/vite-node';
const APP_CMD = `${viteNodeBin} src/app.ts`;

// Helper to run command and capture output
async function runApp(args = '') {
    const env = { ...process.env };
    delete env.deepkit_test_mode;
    const cmd = args ? `${APP_CMD} ${args}` : APP_CMD;
    try {
        const { stdout, stderr } = await execAsync(cmd, {
            env,
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            shell: true,
            windowsHide: true,
        });
        return stdout + stderr;
    } catch (err) {
        // Return combined output even on error (for validation tests)
        return (err.stdout || '') + (err.stderr || '');
    }
}

// Load test files from ci/ folder using vite-node for TypeScript support
async function loadTestFiles() {
    const testFiles = [];

    // Look for both .ts and .js test files
    const patterns = ['ci/**/*.ci.*.ts', 'ci/**/*.ci.*.js'];

    for (const pattern of patterns) {
        const iter = await glob(pattern);
        for await (const file of iter) {
            testFiles.push(file);
        }
    }

    if (testFiles.length === 0) {
        error('No test files found in ci/ folder');
        process.exit(1);
    }

    const allTests = [];

    for (const testFile of testFiles) {
        try {
            // Use dynamic import with file:// URL
            // TypeScript files are handled by vite-node's transformations when this script runs via vite-node
            const fileUrl = new URL(`file:///${process.cwd()}/${testFile.replace(/\\/g, '/')}`);
            const module = await import(fileUrl.href);

            if (typeof module.createTests === 'function') {
                const tests = module.createTests(runApp);
                allTests.push(...tests);
            } else {
                warning(`Test file ${testFile} does not export a createTests function`);
            }
        } catch (err) {
            error(`Failed to load test file ${testFile}:`, err.message);
            if (verbose) {
                console.error(err);
            }
            process.exit(1);
        }
    }

    return allTests;
}

// Run tests
async function main() {
    // Load all test definitions from ci/ folder
    const tests = await loadTestFiles();

    // Filter tests if needed
    const filteredTests = testFilter ? tests.filter((t) => t.name.includes(testFilter)) : tests;

    if (filteredTests.length === 0) {
        error(`No tests matching "${testFilter}"`);
        process.exit(1);
    }

    let passed = 0;
    let failed = 0;
    const failures = [];

    const totalTests = filteredTests.length;
    info(`\nRunning ${totalTests} CI integration test${totalTests > 1 ? 's' : ''}...\n`);

    for (const test of filteredTests) {
        const startTime = Date.now();

        try {
            await test.fn();
            const duration = Date.now() - startTime;
            passed++;

            if (verbose) {
                success(`✓ ${test.name}${styleText('gray', ` (${duration}ms)`)}`);
            } else {
                success(`✓ ${test.name}`);
            }
        } catch (err) {
            const duration = Date.now() - startTime;
            failed++;
            failures.push({ test, error: err });

            if (verbose) {
                error(`✖ ${test.name}${styleText('gray', ` (${duration}ms)`)}`);
                error(`  ${err.message}`);
                if (err.actual !== undefined) {
                    log(`  Expected: ${err.expected}`);
                    log(`  Actual: ${err.actual}`);
                }
            } else {
                error(`✖ ${test.name}`);
            }
        }
    }

    // Summary
    console.log('');
    if (failed === 0) {
        success(`✔ All ${passed} test${passed > 1 ? 's' : ''} passed`);
    } else {
        console.log(
            `${styleText('red', `✖ ${failed} test${failed > 1 ? 's' : ''} failed`)}, ${styleText('green', `${passed} passed`)}`,
        );

        if (!verbose && failures.length > 0) {
            warning('\nFailed tests (run with --verbose for details):');
            for (const { test, error: err } of failures) {
                error(`  • ${test.name}`);
                log(`    ${err.message}`);
            }
        }

        process.exit(1);
    }
}

main().catch((err) => {
    error('\nError running tests:', err);
    process.exit(1);
});
