// script/release.js
// Usage: node script/release.js [patch|minor|major|ci]
//   ci >> takes current tag and adds timestamp; does not tag the repo.
//   no-params >> auto-detect bump type based on commits since last tag
//   minor|major|patch >> explicit version bump type
// Bumps version using npm version, tags git, and appends to CHANGELOG.md

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = console.log;
const error = (msg) => {
    console.error(msg);
    process.exit(1);
};

const now = new Date().toISOString();

let oldVersion, newVersion;

try {
    const pkgPath = path.resolve(__dirname, '../package.json');
    const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');

    // Determine bump type
    let bumpType = process.argv[2];
    if (![undefined, 'patch', 'minor', 'major', 'ci'].includes(bumpType)) {
        error('Usage: node script/release.js [patch|minor|major|ci]');
    }

    // Get all clean semver tags and pick the latest (cross-platform)
    const tagListRaw = execSync('git tag --list "v[0-9]*.[0-9]*.[0-9]*" --sort=-v:refname').toString();
    const tagList = tagListRaw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    const lastTag = tagList.length > 0 ? tagList[0] : '';
    oldVersion = lastTag.startsWith('v') ? lastTag.slice(1) : lastTag;
    if (!oldVersion) error('Could not get latest tag.');

    if (!bumpType) {
        // Get commits since last clean tag
        const commitRange = lastTag ? `${lastTag}..HEAD` : '';
        const commitLog = execSync(`git log ${commitRange} --pretty=format:%s----%b----END`).toString();
        const commits = commitLog
            .split('----END')
            .map((s) => s.trim())
            .filter(Boolean);
        let hasFeat = false;
        for (const entry of commits) {
            const [subject, body] = entry.split('----');
            if (body?.includes('BREAKING CHANGE')) {
                error('BREAKING CHANGE detected. Please run the release script with "major" as a parameter to confirm.');
            }
            if (subject?.trim().startsWith('feat')) {
                hasFeat = true;
            }
        }

        bumpType = hasFeat ? 'minor' : 'patch';
    }

    const nonRelease = process.argv.includes('ci');

    if (nonRelease) {
        newVersion = `${oldVersion}-ci-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    } else {
        // Use npm version to bump package.json, create commit and tag
        execSync(`npm version ${bumpType} -m "chore: release v%s"`);
        const pkg = JSON.parse(fs.readFileSync(pkgPath));
        newVersion = pkg.version;
    }

    const tagName = `v${newVersion}`;
    log(`Bumping version: ${nonRelease ? 'ci' : bumpType} ${oldVersion} -> ${newVersion}`);

    // Build change log: one line per commit since last tag, with hash, time, and description
    const commitRange = lastTag ? `${lastTag}..HEAD` : '';
    const commitLogRaw = execSync(`git log ${commitRange} --pretty=format:"%h|%ad|%s" --date=iso`).toString();
    const commitLines = commitLogRaw
        .split(/\r?\n/)
        .map((line) => {
            const [hash, date, ...descParts] = line.split('|');
            const desc = descParts.join('|').trim();
            return hash && date && desc ? `- ${hash} ${date} ${desc}` : null;
        })
        .filter(Boolean)
        .join('\n');

    // Ensure CHANGELOG.md exists
    if (!fs.existsSync(changelogPath)) {
        fs.writeFileSync(changelogPath, '# Changelog\n\n');
    }

    fs.appendFileSync(changelogPath, `\n## ${newVersion} - ${now}\n`);
    fs.appendFileSync(changelogPath, `${commitLines}\n`);

    log(`CHANGELOG.md updated with ${commitLines.split('\n').length} commits.`);

    // Amend the npm version commit to include CHANGELOG.md and push (only if not CI)
    if (!nonRelease) {
        execSync(`git add CHANGELOG.md`);
        execSync(`git commit --amend --no-edit`);
        execSync(`git push origin master`);
        execSync(`git push origin ${tagName}`);
        log(`Git tag ${tagName} created and pushed.`);
    } else {
        log(`CI build - no git tag created.`);
    }
} catch (e) {
    error(e.message);
}

// Output new version for Docker build (do not write to package.json)
log(`Bumped version: ${oldVersion} -> ${newVersion}`);
