import { App, Command, cli, Flag } from '@deepkit/app';
import { Logger } from '@deepkit/logger';
import { Email, MaxLength, MinLength, Positive } from '@deepkit/type';

interface User {
    name: string & MinLength<3> & MaxLength<50>;
    age: number & Positive;
    email?: string & Email;
}

@cli.controller('test', {
    description: 'Test command to verify Deepkit type system',
})
export class TestCommand implements Command {
    async execute(
        name: string & MinLength<3> = 'World',
        count: number & Positive = 1,
        verbose: boolean & Flag = false,
        logger: Logger,
    ) {
        logger.log('=== Deepkit Type System Test ===');
        logger.log(`Hello ${name}!`);
        logger.log(`Count: ${count}`);
        logger.log(`Verbose mode: ${verbose}`);

        // Test interface with type annotations
        const user: User = {
            name: 'John Doe',
            age: 30,
            email: 'john@example.com',
        };

        if (verbose) {
            logger.log('\nUser object with Deepkit types:');
            logger.log(JSON.stringify(user, null, 2));
        }

        logger.log('\n✓ Type compiler is working!');
        logger.log('✓ Decorators are working!');
        logger.log('✓ Dependency injection is working!');
    }
}

export const app = new App({
    controllers: [TestCommand],
});

// Auto-run when not being imported by unit tests
// We set an environment variable in test-runner to prevent auto-run
if (!process.env.deepkit_test_mode) {
    app.run();
}
