//
// script is called by 'npm test' command
// Runs unit tests using vite-node for Deepkit type transformations
// Note: We can't use node --test with vite-node as an import loader because vite-node
// doesn't expose a loader API. Instead, we run vite-node directly on test files.
// Usage examples:
//    node scripts/run_tests.js                - runs all tests
//    node scripts/run_tests.js --verbose      - runs all tests with verbose output
//    node scripts/run_tests.js --coverage     - runs all tests with coverage
//    node scripts/run_tests.js src/app.test.ts - runs a specific test file
//

import { spawn } from 'node:child_process';
import { glob } from 'node:fs/promises';
import { cpus, platform } from 'node:os';
import { styleText } from 'node:util';

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const hasVerboseFlag = args.includes('--verbose') || args.includes('-v');
    const hasCoverageFlag = args.includes('--coverage');

    const filteredArgs = args.filter((arg) => arg !== '--verbose' && arg !== '-v' && arg !== '--coverage');

    const hasSpecificFiles = filteredArgs.length > 0;
    const verbose = hasVerboseFlag || hasSpecificFiles;

    // Find test files using Node.js native glob
    let testFiles;
    if (hasSpecificFiles) {
        testFiles = filteredArgs;
    } else {
        // glob returns an async iterator, convert to array
        const iter = await glob('src/**/*.test.ts');
        testFiles = [];
        for await (const file of iter) {
            testFiles.push(file);
        }
    }

    if (testFiles.length === 0) {
        console.error('No test files found');
        process.exit(1);
    }

    // Run tests (with optional coverage wrapper)
    const viteNodeBin = 'vite-node';
    const isWindows = platform() === 'win32';

    const coverageMsg = hasCoverageFlag ? ' with coverage' : '';
    console.log(`${viteNodeBin} (running ${testFiles.length} test file(s) in parallel${coverageMsg})\n`);

    // If coverage is requested, we need to run all tests in a single vite-node process
    // to get accurate aggregated coverage. Otherwise run in parallel for speed.
    if (hasCoverageFlag) {
        // Note: c8 has limitations with transpilers like vite-node. The coverage numbers
        // may not be accurate because c8 instruments before vite-node transforms the code.
        // For better coverage, consider using vitest which has built-in support for vite transformations.

        // Run all tests together under c8
        // Output: lcov for VSCode coverage plugin, text for terminal
        const binName = 'c8';
        const binArgs = [
            '--reporter=text',
            '--reporter=lcov',
            '--all',
            '--src=.',
            '--include=src/**/*.ts',
            '--exclude=**/*.test.ts',
            viteNodeBin,
            ...testFiles,
        ];

        const env = {
            ...process.env,
            deepkit_test_mode: 'true',
        };

        const child = isWindows
            ? spawn(`${binName} ${binArgs.join(' ')}`, {
                  stdio: 'inherit',
                  env,
                  shell: true,
              })
            : spawn(binName, binArgs, {
                  stdio: 'inherit',
                  env,
              });

        child.on('close', (code) => {
            console.log('\nCoverage report: ./coverage/lcov.info (for VSCode Coverage Gutters plugin)');
            console.log('Note: Due to vite-node transformations, coverage numbers may be inaccurate.');
            console.log('For production use, consider migrating to vitest for accurate coverage.\n');
            process.exit(code || 0);
        });

        return;
    }

    // Run tests with concurrency limit (no coverage)
    const results = new Map();
    let completed = 0;
    let started = 0;

    // Calculate optimal concurrency: 80% of available CPUs
    const maxConcurrency = Math.max(1, Math.floor(cpus().length * 0.8));

    if (!verbose) {
        console.log(`Running with concurrency limit: ${maxConcurrency} (${cpus().length} CPUs available)\n`);
    }

    // Helper to update progress display
    function updateProgress(testFile, isStarting) {
        if (verbose) return;

        const total = testFiles.length;
        const maxLineLength = 100; // Ensure we clear previous line content

        if (isStarting) {
            // Show which test is starting
            const message = `Test ${started}/${total}: ${testFile}`;
            const padding = ' '.repeat(Math.max(0, maxLineLength - message.length));
            process.stdout.write(`\r${message}${padding}`);
        } else {
            // Show completion progress
            const message = `Completed ${completed}/${total} tests`;
            const padding = ' '.repeat(Math.max(0, maxLineLength - message.length));
            process.stdout.write(`\r${message}${padding}`);
        }
    }

    // Helper to run a single test file
    function runTest(testFile) {
        return new Promise((resolve) => {
            started++;
            updateProgress(testFile, true);
            const env = {
                ...process.env,
                deepkit_test_mode: 'true',
            };

            const child = isWindows
                ? spawn(`${viteNodeBin} ${testFile}`, {
                      stdio: verbose ? 'inherit' : ['inherit', 'pipe', 'pipe'],
                      env,
                      shell: true,
                  })
                : spawn(viteNodeBin, [testFile], {
                      stdio: verbose ? 'inherit' : ['inherit', 'pipe', 'pipe'],
                      env,
                  });

            let stdout = '';
            let stderr = '';

            if (!verbose && child.stdout) {
                child.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            }

            // Always capture stderr
            if (child.stderr) {
                child.stderr.on('data', (data) => {
                    const text = data.toString();
                    stderr += text;
                    // Always show stderr immediately
                    process.stderr.write(styleText('red', text));
                });
            }

            child.on('close', (code) => {
                results.set(testFile, { code, stdout, stderr });
                completed++;

                // Update progress on completion
                updateProgress(testFile, false);

                resolve();
            });
        });
    }

    // Queue-based parallel execution with concurrency limit
    const queue = [...testFiles];
    const running = new Set();

    async function processQueue() {
        while (queue.length > 0 || running.size > 0) {
            // Start new tests up to concurrency limit
            while (queue.length > 0 && running.size < maxConcurrency) {
                const testFile = queue.shift();
                const promise = runTest(testFile);
                running.add(promise);

                promise.finally(() => {
                    running.delete(promise);
                });
            }

            // Wait for at least one test to complete before continuing
            if (running.size > 0) {
                await Promise.race(running);
            }
        }
    }

    await processQueue();

    if (!verbose) {
        console.log('\n'); // Clear progress line
    }

    // Summary
    const failed = Array.from(results.entries()).filter(([_, r]) => r.code !== 0);
    if (failed.length > 0) {
        console.error(`\n${failed.length} test file(s) failed:`);
        failed.forEach(([file, _]) => {
            console.error(styleText('red', `  ✖ ${file}`));
        });
        process.exit(1);
    } else {
        if (!verbose) {
            console.log(styleText('green', `✔ All ${testFiles.length} test file(s) passed`));
        }
        process.exit(0);
    }
}

main().catch(console.error);
