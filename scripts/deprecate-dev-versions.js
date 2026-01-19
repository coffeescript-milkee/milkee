require("dotenv").config();
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

function main() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const name = pkg.name;
  if (!name) {
    console.error('package.json has no name');
    process.exit(1);
  }

  if (!process.env.NPM_TOKEN) {
    console.error('NPM_TOKEN is not set. Aborting.');
    process.exit(1);
  }

  // Create a temporary npm config file for authenticated npm commands and register cleanup handlers
  const npmToken = process.env.NPM_TOKEN;
  const npmrcPath = createTempNpmrc(npmToken);
  process.env.NPM_CONFIG_USERCONFIG = npmrcPath;
  console.log(`Using temporary npm config at ${npmrcPath}`);

  function cleanup() {
    try {
      if (fs.existsSync(npmrcPath)) fs.unlinkSync(npmrcPath);
    } catch (e) {}
  }

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });
  process.on('SIGTERM', () => { cleanup(); process.exit(1); });

  console.log(`Checking npm versions for package: ${name}`);

  const versionsJson = run(`npm view ${name} versions --json`);
  let versions;
  try {
    versions = JSON.parse(versionsJson);
    if (!Array.isArray(versions)) versions = [versions];
  } catch (e) {
    console.error('Failed to parse npm view versions output');
    console.error(versionsJson);
    process.exit(1);
  }

  const devRegex = /^(\d+\.\d+\.\d+)-dev\.(\d+)$/;

  for (const v of versions) {
    const m = v.match(devRegex);
    if (!m) continue;

    const base = m[1];
    console.log(`Found dev version ${v} (base ${base})`);

    // check current deprecated message
    let deprecatedMsg = '';
    try {
      deprecatedMsg = run(`npm view ${name}@${v} deprecated`);
    } catch (e) {
      // npm view <pkg>@<ver> deprecated returns nonzero exit if field missing on some npm CLI versions
      deprecatedMsg = '';
    }

    const msg = `Update to ${base} or later.`;

    if (deprecatedMsg && deprecatedMsg.trim() === msg) {
      console.log(`Already deprecated with desired message: ${v} -> "${deprecatedMsg}"`);
      continue;
    }

    if (deprecatedMsg) {
      console.log(`Updating deprecated message for ${v}: "${deprecatedMsg}" -> "${msg}"`);
    } else {
      console.log(`Deprecating ${name}@${v} with message: "${msg}"`);
    }

    try {
      // run npm deprecate (this will set or update the deprecated message)
      execSync(`npm deprecate ${name}@${v} "${msg.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
      console.log(`Deprecated ${v}`);
    } catch (e) {
      console.error(`Failed to deprecate ${v}: ${e.message}`);
    }
  }

  console.log('Done');
}

main();
