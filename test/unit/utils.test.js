const fs = require('fs');
const path = require('path');
const os = require('os');

const utils = require('../../src/lib/utils.coffee');

describe('utils', () => {
  it('sleep resolves after given time', async () => {
    vi.useFakeTimers();
    const p = utils.sleep(100);
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('getCompiledFiles finds .js and .js.map files recursively', () => {
    // create directory inside test sandbox
    const dir = createTestDir('utils');
    const fileA = path.join(dir, 'a.js');
    const fileB = path.join(dir, 'b.js.map');
    const fileC = path.join(dir, 'c.txt');
    const subdir = path.join(dir, 'sub');
    fs.mkdirSync(subdir);
    const fileD = path.join(subdir, 'd.js');
    fs.writeFileSync(fileA, 'console.log(1)');
    fs.writeFileSync(fileB, 'map');
    fs.writeFileSync(fileC, 'no');
    fs.writeFileSync(fileD, 'console.log(2)');
    const res = utils.getCompiledFiles(dir);
    expect(res).toEqual(expect.arrayContaining([fileA, fileB, fileD]));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns empty if path does not exist', () => {
    const res = utils.getCompiledFiles(
      path.join(os.tmpdir(), 'nonexistent-' + Date.now())
    );
    expect(res).toEqual([]);
  });
});
