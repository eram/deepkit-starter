// ci/app.ci.test.ts
// Integration tests for the app CLI
//
// This file exports a `createTests` function that will be loaded and executed by scripts/run-ci-tests.js

import { match } from 'node:assert/strict';
import type { Test } from './test';

/**
 * Create test suite for app CLI
 * @param runApp - Function to run the app and capture output
 * @returns Array of test definitions
 */
export function createTests(runApp: (args?: string) => Promise<string>): Test[] {
    return [
        {
            name: 'shows help when no command provided',
            fn: async () => {
                const output = await runApp();
                match(output, /USAGE/, 'Should show USAGE');
                match(output, /COMMANDS/, 'Should show COMMANDS');
                match(output, /test/, 'Should show test command');
            },
        },
        {
            name: 'shows help for test command',
            fn: async () => {
                const output = await runApp('test --help');
                match(output, /Test command to verify Deepkit type system/, 'Should show command description');
                match(output, /name/, 'Should show name parameter');
                match(output, /count/, 'Should show count parameter');
                match(output, /--verbose/, 'Should show verbose flag');
                match(output, /default=World/, 'Should show default name');
                match(output, /default=1/, 'Should show default count');
            },
        },
        {
            name: 'runs with default parameters',
            fn: async () => {
                const output = await runApp('test');
                match(output, /Deepkit Type System Test/, 'Should show test header');
                match(output, /Hello World!/, 'Should greet with default name');
                match(output, /Count: 1/, 'Should show default count');
                match(output, /Type compiler is working/, 'Should confirm type compiler');
                match(output, /Decorators are working/, 'Should confirm decorators');
                match(output, /Dependency injection is working/, 'Should confirm DI');
            },
        },
        {
            name: 'accepts custom parameters',
            fn: async () => {
                const output = await runApp('test "TestUser" 5');
                match(output, /Hello TestUser!/, 'Should use custom name');
                match(output, /Count: 5/, 'Should use custom count');
            },
        },
        {
            name: 'supports verbose flag',
            fn: async () => {
                const output = await runApp('test "TestUser" 3 --verbose');
                match(output, /Verbose mode: true/, 'Should enable verbose mode');
                match(output, /User object with Deepkit types/, 'Should show user object');
                match(output, /John Doe/, 'Should display user data');
            },
        },
        {
            name: 'validates minimum string length',
            fn: async () => {
                const output = await runApp('test "AB" 1');
                match(output, /Min length is 3/, 'Should show validation error');
            },
        },
    ];
}
