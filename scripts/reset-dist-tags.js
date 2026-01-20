#!/usr/bin/env node
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const semver = require('semver');
const yargs = require('yargs/yargs');

function createTempNpmrc(token) {
  const tmpPath = path.join(os.tmpdir(), `milkee-npmrc-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  fs.writeFileSync(tmpPath, `//registry.npmjs.org/:_authToken=${token}\nalways-auth=true\n`);
  return tmpPath;
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], ...opts }).trim();
  } catch (err) {
    if (err.stdout) return err.stdout.toString().trim();
    throw err;
  }
}

async function confirm(prompt) {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (ans) => {
      rl.close();
      resolve(/^y(es)?$/i.test(ans));
    });
  });
}

async function main() {
  const argv = yargs(process.argv.slice(2))
    .option('package', { type: 'string', alias: 'p', description: 'package name to operate on (default from package.json)' })
    .option('dry-run', { type: 'boolean', description: 'Show commands without executing them', default: false })
    .option('otp', { type: 'string', description: 'One-time password for npm 2FA (if required)' })
    .option('yes', { type: 'boolean', alias: 'y', description: 'Skip confirmation prompt', default: false })
    .help(false)
    .version(false)
    .argv;

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const name = argv.package || pkg.name;
  if (!name) {
    console.error('package.json has no name and --package not supplied');
    process.exit(1);
  }

  if (!process.env.NPM_TOKEN) {
    console.error('NPM_TOKEN is not set. Aborting. (Set NPM_TOKEN for authenticated npm commands)');
    process.exit(1);
  }

  const npmToken = process.env.NPM_TOKEN;
  const npmrcPath = createTempNpmrc(npmToken);
  process.env.NPM_CONFIG_USERCONFIG = npmrcPath;

  function cleanup() {
    try { if (fs.existsSync(npmrcPath)) fs.unlinkSync(npmrcPath); } catch (e) {}
  }
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });
  process.on('SIGTERM', () => { cleanup(); process.exit(1); });

  console.log(`Fetching dist-tags for package: ${name}`);
  let lsOut = '';
  try {
    lsOut = run(`npm dist-tag ls ${name}`);
  } catch (e) {
    console.error('Failed to list dist-tags:', e.message);
    process.exit(1);
  }

  const lines = lsOut.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const tags = [];
  const tagRe = /^([^:\s]+):\s*(\S+)$/;
  for (const line of lines) {
    const m = tagRe.exec(line);
    if (m) tags.push({ tag: m[1], version: m[2] });
  }

  if (tags.length === 0) {
    console.log('No dist-tags found. Nothing to do.');
    cleanup();
    return;
  }

  console.log('Found dist-tags:');
  for (const t of tags) console.log(`  ${t.tag}: ${t.version}`);

  if (!argv.yes) {
    const ok = await confirm('Proceed to remove all tags and re-add them ordered by version (oldest first)? (y/N) ');
    if (!ok) {
      console.log('Aborted by user.');
      cleanup();
      process.exit(0);
    }
  }

  const otpArg = argv.otp ? ` --otp=${argv.otp}` : (process.env.NPM_OTP ? ` --otp=${process.env.NPM_OTP}` : '');

  // Remove all tags
  for (const t of tags) {
    const cmd = `npm dist-tag rm ${name} ${t.tag}${otpArg}`;
    if (argv['dry-run']) {
      console.log(`[dry-run] ${cmd}`);
      continue;
    }
    console.log(`Removing tag ${t.tag} -> ${t.version}`);
    try {
      run(cmd);
    } catch (e) {
      console.error(`Failed to remove tag ${t.tag}: ${e.message}`);
    }
  }

  // Group tags by version
  const byVersion = {};
  for (const t of tags) {
    byVersion[t.version] = byVersion[t.version] || [];
    byVersion[t.version].push(t.tag);
  }

  // Unique versions sorted by semver ascending (older first)
  const versions = Object.keys(byVersion).sort((a, b) => {
    if (semver.valid(a) && semver.valid(b)) return semver.compare(a, b);
    // fallback to lexicographic
    return a < b ? -1 : a > b ? 1 : 0;
  });

  // Re-add tags in order of increasing version
  for (const ver of versions) {
    const tagList = byVersion[ver];
    for (const tag of tagList) {
      const cmd = `npm dist-tag add ${name}@${ver} ${tag}${otpArg}`;
      if (argv['dry-run']) {
        console.log(`[dry-run] ${cmd}`);
        continue;
      }
      console.log(`Adding tag ${tag} -> ${ver}`);
      try {
        run(cmd);
      } catch (e) {
        console.error(`Failed to add tag ${tag}: ${e.message}`);
      }

      // wait ~3s before proceeding to the next tag to avoid hammering the registry
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  }

  console.log('Done');
  cleanup();
}

main().catch((e) => { console.error(e); process.exit(1); });
