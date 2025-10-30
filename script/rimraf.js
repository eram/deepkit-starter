#!/usr/bin/env node

/**
 * Simple rimraf utility for cleaning build artifacts
 * No external dependencies - uses only Node.js built-ins
 * Supports glob patterns and multiple paths
 */

import { promises as fs } from 'node:fs';
import { parseArgs } from 'node:util';

const isGlobPattern = (str) => /[*?{}[\]]/.test(str);

/**
 * Recursively remove files/directories matching the pattern
 * @param {string} pattern - Path or glob pattern
 * @param {object} options - fs.rm options
 * @returns {Promise<number>} Number of items removed
 */
async function rimraf(pattern, options = { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) {
    try {
        const matches = [];

        // Check if pattern is a glob or direct path
        if (isGlobPattern(pattern)) {
            // Use glob to find matching files
            for await (const file of fs.glob(pattern)) {
                matches.push(file);
            }
        } else {
            // Direct path - check if exists
            try {
                await fs.access(pattern);
                matches.push(pattern);
            } catch {
                // Path doesn't exist - skip silently in quiet mode, error otherwise
                return 0;
            }
        }

        // Remove all matched files/directories
        for (const match of matches) {
            await fs.rm(match, options);
        }

        return matches.length;
    } catch (err) {
        throw new Error(err.message || err);
    }
}

/**
 * Main entry point
 */
async function main() {
    const { values, positionals } = parseArgs({
        options: {
            quiet: {
                type: 'boolean',
                short: 'q',
                default: false,
            },
            help: {
                type: 'boolean',
                short: 'h',
                default: false,
            },
        },
        allowPositionals: true,
    });

    if (values.help || positionals.length === 0) {
        console.log('Usage: node rimraf.js [--quiet|-q] <path> [...<path>]');
        console.log('');
        console.log('Options:');
        console.log('  --quiet, -q    Suppress output');
        console.log('  --help, -h     Show this help');
        console.log('');
        console.log('Examples:');
        console.log('  node rimraf.js dist build');
        console.log('  node rimraf.js "*.log" "*.tmp"');
        console.log('  node rimraf.js -q coverage node_modules');
        process.exit(values.help ? 0 : 1);
    }

    let totalCount = 0;
    const errors = [];

    for (const pattern of positionals) {
        try {
            // Safety checks
            const normalized = pattern.normalize();

            // Prevent rimraf of root folders
            if (normalized === '/' || /^[a-z]:[/\\]$/i.test(normalized)) {
                errors.push(`Cannot rimraf root folder: ${pattern}`);
                continue;
            }

            // Prevent rimraf outside of workspace (only for non-glob patterns)
            if (!isGlobPattern(pattern)) {
                const { resolve } = await import('node:path');
                const absolutePath = resolve(pattern);
                const cwd = process.cwd();

                if (!absolutePath.startsWith(cwd)) {
                    errors.push(`Cannot rimraf outside of workspace: ${pattern}`);
                    continue;
                }
            }

            const count = await rimraf(pattern);
            totalCount += count;

            if (!values.quiet && count > 0) {
                console.log(`Removed ${count} item(s): ${pattern}`);
            }
        } catch (err) {
            errors.push(`Error removing ${pattern}: ${err.message}`);
        }
    }

    // Report results
    if (!values.quiet && totalCount > 0) {
        console.log(`Total: Removed ${totalCount} item(s)`);
    }

    if (errors.length > 0) {
        console.error('Errors:');
        for (const error of errors) {
            console.error(`  ${error}`);
        }
        process.exit(1);
    }

    process.exit(0);
}

main().catch((err) => {
    console.error('Unexpected error:', err.message);
    process.exit(1);
});
