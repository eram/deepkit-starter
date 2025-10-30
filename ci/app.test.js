import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { execSync } from 'node:child_process';

const APP_CMD = 'npm run app --';

test('app shows help when no command provided', () => {
    const output = execSync('npm run app', { encoding: 'utf8' });

    assert.match(output, /USAGE/, 'Should show usage information');
    assert.match(output, /COMMANDS/, 'Should list available commands');
    assert.match(output, /test/, 'Should show test command');
});

test('app test command runs with default parameters', () => {
    const output = execSync(`${APP_CMD} test`, { encoding: 'utf8' });

    assert.match(output, /Deepkit Type System Test/, 'Should show test header');
    assert.match(output, /Hello World!/, 'Should greet with default name');
    assert.match(output, /Count: 1/, 'Should show default count');
    assert.match(output, /Type compiler is working/, 'Should confirm type compiler works');
    assert.match(output, /Decorators are working/, 'Should confirm decorators work');
    assert.match(output, /Dependency injection is working/, 'Should confirm DI works');
});

test('app test command accepts custom parameters', () => {
    const output = execSync(`${APP_CMD} test "TestUser" 5`, { encoding: 'utf8' });

    assert.match(output, /Hello TestUser!/, 'Should use custom name');
    assert.match(output, /Count: 5/, 'Should use custom count');
});

test('app test command supports verbose flag', () => {
    const output = execSync(`${APP_CMD} test "TestUser" 3 --verbose`, { encoding: 'utf8' });

    assert.match(output, /Verbose mode: true/, 'Should enable verbose mode');
    assert.match(output, /User object with Deepkit types/, 'Should show user object in verbose');
    assert.match(output, /John Doe/, 'Should display user data');
});

test('app validates minimum string length', () => {
    try {
        execSync(`${APP_CMD} test "AB" 1`, { encoding: 'utf8', stdio: 'pipe' });
        assert.fail('Should have thrown an error for short name');
    } catch (error) {
        const stderr = error.stderr?.toString() || error.stdout?.toString() || '';
        assert.match(stderr, /Min length is 3/, 'Should show validation error for short name');
    }
});

test('app shows help for test command', () => {
    const output = execSync(`${APP_CMD} test --help`, { encoding: 'utf8' });

    assert.match(output, /Test command to verify Deepkit type system/, 'Should show command description');
    assert.match(output, /name/, 'Should show name argument');
    assert.match(output, /count/, 'Should show count argument');
    assert.match(output, /--verbose/, 'Should show verbose flag');
    assert.match(output, /default=World/, 'Should show default value for name');
    assert.match(output, /default=1/, 'Should show default value for count');
});
