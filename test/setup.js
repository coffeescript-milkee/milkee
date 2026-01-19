// Register CoffeeScript so tests can require .coffee files
require("coffeescript/register");

// Test sandbox guard: prevent accidental writes outside a temporary sandbox
const fs = require("fs");
const path = require("path");
const os = require("os");

const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), "milkee-test-sandbox-"));
process.env.TEST_SANDBOX = SANDBOX;
globalThis.TEST_SANDBOX = SANDBOX;

function stripExtendedPrefix(s) {
  if (typeof s !== 'string') return s;
  // Remove Windows extended path prefix like '\\?\\' or '\?\\'
  let out = s.replace(/^\\+\?\\/, '');
  // If we still have a leading backslash before a drive letter (e.g. '\C:\...'), remove it
  out = out.replace(/^\\+([A-Za-z]:)/, '$1');
  return out;
}

// Allowlist: sandbox + system temp + node_modules + any additional paths via TEST_WRITE_ALLOW
const allowed = [
  path.resolve(stripExtendedPrefix(SANDBOX)),
  path.resolve(stripExtendedPrefix(os.tmpdir())),
  path.resolve(stripExtendedPrefix(process.cwd()), "node_modules"),
];
if (process.env.TEST_WRITE_ALLOW) {
  process.env.TEST_WRITE_ALLOW.split(",").forEach((p) => {
    if (p) allowed.push(path.resolve(stripExtendedPrefix(p)));
  });
}

function resolveSafe(p) {
  if (!p) return p;
  // accept Buffers as well
  if (Buffer.isBuffer(p)) p = p.toString();
  // strip Windows extended path prefix if present
  if (typeof p === 'string') {
    p = stripExtendedPrefix(p);
  }
  if (!path.isAbsolute(p)) p = path.join(process.cwd(), String(p));
  return path.resolve(p);
}

function isAllowed(p) {
  const rp = resolveSafe(p);
  return allowed.some(
    (prefix) => rp === prefix || rp.startsWith(prefix + path.sep),
  );
}

function makeGuard(orig, checkIndex = 0) {
  return function (...args) {
    const target = args[checkIndex];
    if (!isAllowed(target)) {
      throw new Error(
        `Test attempted to modify outside sandbox: ${target} (sandbox=${SANDBOX})`,
      );
    }
    return orig.apply(this, args);
  };
}

// Patch common fs methods that write or modify the FS
const writeSyncMethods = [
  "writeFileSync",
  "appendFileSync",
  "copyFileSync",
  "mkdirSync",
  "rmSync",
  "rmdirSync",
  "renameSync",
  "unlinkSync",
];
for (const m of writeSyncMethods) {
  if (typeof fs[m] === "function") fs[m] = makeGuard(fs[m], 0);
}

// Async versions
if (typeof fs.writeFile === "function") {
  const orig = fs.writeFile;
  fs.writeFile = function (file, ...rest) {
    if (!isAllowed(file)) {
      const cb = rest.find((r) => typeof r === "function");
      const err = new Error(
        `Test attempted to modify outside sandbox: ${file} (sandbox=${SANDBOX})`,
      );
      if (cb) return process.nextTick(() => cb(err));
      throw err;
    }
    return orig.apply(this, [file, ...rest]);
  };
}
if (fs.promises && typeof fs.promises.writeFile === "function") {
  const orig = fs.promises.writeFile;
  fs.promises.writeFile = function (file, ...rest) {
    if (!isAllowed(file))
      throw new Error(
        `Test attempted to modify outside sandbox: ${file} (sandbox=${SANDBOX})`,
      );
    return orig.apply(this, [file, ...rest]);
  };
}

// Helper for tests to create safe temp dirs
globalThis.createTestDir = function (name = "") {
  const dir = path.join(SANDBOX, name || String(Date.now()));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

console.info(`[test setup] test sandbox: ${SANDBOX}`);
