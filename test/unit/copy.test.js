const fs = require('fs');
const path = require('path');
const os = require('os');

const executeCopy = require('../../src/options/copy.coffee');

function createTree(base) {
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, 'a.coffee'), 'c');
  fs.writeFileSync(path.join(base, 'b.txt'), 'b');
  fs.writeFileSync(path.join(base, 'd.litcoffee'), 'd');
  fs.mkdirSync(path.join(base, 'sub'), { recursive: true });
  fs.writeFileSync(path.join(base, 'sub', 'c.md'), 'c');
}

describe('copy', () => {
  it('copies non-coffee files recursively', () => {
    const base = createTestDir('copy');
    const entry = path.join(base, 'entry');
    const out = path.join(base, 'out');
    createTree(entry);
    fs.mkdirSync(out, { recursive: true });

    // preconditions
    expect(fs.existsSync(entry)).toBe(true);
    expect(fs.existsSync(path.join(entry, 'b.txt'))).toBe(true);

    // use absolute paths (sandboxed)
    executeCopy({ entry, output: out });

    expect(fs.existsSync(path.join(out, 'b.txt'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'sub', 'c.md'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'a.coffee'))).toBe(false);
    expect(fs.existsSync(path.join(out, 'd.litcoffee'))).toBe(false);

    fs.rmSync(base, { recursive: true, force: true });
  });

  it('skips when join option is enabled', () => {
    const base = createTestDir('copy');
    const entry = path.join(base, 'entry');
    const out = path.join(base, 'out');
    createTree(entry);
    fs.mkdirSync(out, { recursive: true });

    executeCopy({ entry, output: out, options: { join: true } });

    expect(fs.existsSync(path.join(out, 'b.txt'))).toBe(false);

    fs.rmSync(base, { recursive: true, force: true });
  });
});
