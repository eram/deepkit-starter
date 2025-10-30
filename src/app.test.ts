import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { app, TestCommand } from './app.ts';

test('TestCommand class is exported and decorated', () => {
    assert.ok(TestCommand, 'TestCommand should be exported');
    assert.equal(typeof TestCommand, 'function', 'TestCommand should be a class');
});

test('app instance is exported and configured', () => {
    assert.ok(app, 'App instance should be exported');
    assert.ok(app.setup, 'App should have setup method');
});

test('app has test controller registered', async () => {
    // Setup the app to introspect it
    await app.setup();

    // Check if TestCommand is in the controllers
    const hasTestCommand = app.appModule.controllers.includes(TestCommand);
    assert.ok(hasTestCommand, 'TestCommand should be registered as a controller');
});

test('TestCommand execute method exists with correct signature', () => {
    const cmd = new TestCommand();
    assert.equal(typeof cmd.execute, 'function', 'execute should be a function');
});

test('TestCommand can be instantiated and executed with mock logger', async () => {
    const logs: string[] = [];
    const mockLogger = {
        log: (msg: string) => logs.push(msg)
    };

    const cmd = new TestCommand();
    await cmd.execute('TestUser', 5, false, mockLogger as any);

    // Verify logs contain expected output
    const allLogs = logs.join('\n');
    assert.match(allLogs, /Deepkit Type System Test/, 'Should log test header');
    assert.match(allLogs, /Hello TestUser!/, 'Should use provided name');
    assert.match(allLogs, /Count: 5/, 'Should use provided count');
    assert.match(allLogs, /Verbose mode: false/, 'Should show verbose state');
    assert.match(allLogs, /Type compiler is working/, 'Should confirm type compiler');
    assert.match(allLogs, /Decorators are working/, 'Should confirm decorators');
    assert.match(allLogs, /Dependency injection is working/, 'Should confirm DI');
});

test('TestCommand verbose mode shows user data', async () => {
    const logs: string[] = [];
    const mockLogger = {
        log: (msg: string) => logs.push(msg)
    };

    const cmd = new TestCommand();
    await cmd.execute('Verbose', 1, true, mockLogger as any);

    const allLogs = logs.join('\n');
    assert.match(allLogs, /Verbose mode: true/, 'Should show verbose enabled');
    assert.match(allLogs, /User object with Deepkit types/, 'Should show user object header');
    assert.match(allLogs, /John Doe/, 'Should display user name');
    assert.match(allLogs, /john@example.com/, 'Should display user email');
});
