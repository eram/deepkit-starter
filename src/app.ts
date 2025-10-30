import { App } from '@deepkit/app';
import { cli, Command, Flag } from '@deepkit/app';
import { MinLength, MaxLength, Positive, Email } from '@deepkit/type';
import { Logger } from '@deepkit/logger';

interface User {
    name: string & MinLength<3> & MaxLength<50>;
    age: number & Positive;
    email?: string & Email;
}

@cli.controller('test', {
    description: 'Test command to verify Deepkit type system'
})
class TestCommand implements Command {
    async execute(
        name: string & MinLength<3> = 'World',
        count: number & Positive = 1,
        verbose: boolean & Flag = false,
        logger: Logger
    ) {
        logger.log('=== Deepkit Type System Test ===');
        logger.log(`Hello ${name}!`);
        logger.log(`Count: ${count}`);
        logger.log(`Verbose mode: ${verbose}`);

        // Test interface with type annotations
        const user: User = {
            name: 'John Doe',
            age: 30,
            email: 'john@example.com'
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

new App({
    controllers: [TestCommand]
}).run();
