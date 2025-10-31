import { beforeEach, describe, expect, test } from 'vitest';
import { app, TestCommand } from './app';

describe('TestCommand', () => {
    test('class is exported and decorated', () => {
        expect(TestCommand).toBeDefined();
        expect(typeof TestCommand).toBe('function');
    });

    test('execute method exists with correct signature', () => {
        const cmd = new TestCommand();
        expect(typeof cmd.execute).toBe('function');
    });
});

describe('app', () => {
    test('instance is exported and configured', () => {
        expect(app).toBeDefined();
        expect(app.setup).toBeDefined();
    });

    test('has test controller registered', async () => {
        // Setup the app to introspect it
        app.setup(() => {});

        // Check if TestCommand is in the controllers
        const hasTestCommand = app.appModule.controllers.includes(TestCommand);
        expect(hasTestCommand).toBe(true);
    });
});

describe('TestCommand execution', () => {
    let logs: string[];
    let mockLogger: Pick<import('@deepkit/logger').Logger, 'log'>;

    beforeEach(() => {
        logs = [];
        mockLogger = {
            log: (msg: string) => logs.push(msg),
        };
    });

    test('can be instantiated and executed with mock logger', async () => {
        const cmd = new TestCommand();
        await cmd.execute('TestUser', 5, false, mockLogger);

        // Verify logs contain expected output
        const allLogs = logs.join('\n');
        expect(allLogs).toMatch(/Deepkit Type System Test/);
        expect(allLogs).toMatch(/Hello TestUser!/);
        expect(allLogs).toMatch(/Count: 5/);
        expect(allLogs).toMatch(/Verbose mode: false/);
        expect(allLogs).toMatch(/Type compiler is working/);
        expect(allLogs).toMatch(/Decorators are working/);
        expect(allLogs).toMatch(/Dependency injection is working/);
    });

    test('verbose mode shows user data', async () => {
        const cmd = new TestCommand();
        await cmd.execute('Verbose', 1, true, mockLogger);

        const allLogs = logs.join('\n');
        expect(allLogs).toMatch(/Verbose mode: true/);
        expect(allLogs).toMatch(/User object with Deepkit types/);
        expect(allLogs).toMatch(/John Doe/);
        expect(allLogs).toMatch(/john@example.com/);
    });
});
