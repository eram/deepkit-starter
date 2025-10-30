export interface Test {
    name: string;
    fn: () => Promise<void>;
}

/**
 * Every test file in this folder should be named xx.ci.xx.ts and
 * export a `createTests` function like this:
 **/
export function createTests(_runApp: (args?: string) => Promise<string>): Test[] {
    return [
        // Add test definitions here
    ];
}
