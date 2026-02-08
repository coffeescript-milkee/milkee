const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  executeRefresh,
  restoreBackups,
  clearBackups,
} = require('../../src/options/refresh.coffee');

describe('refresh', () => {
  it('backs up directory files and restores them', () => {
    const base = createTestDir('refresh');
    const dir = path.join(base, 'out');
    fs.mkdirSync(dir, { recursive: true });
    const a = path.join(dir, 'a.txt');
    const b = path.join(dir, 'b.txt');
    fs.writeFileSync(a, '1');
    fs.writeFileSync(b, '2');

    const backupFiles = [];
    // preconditions
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.existsSync(a)).toBe(true);

    executeRefresh({ output: dir }, backupFiles);

    expect(backupFiles.length).toBe(2);
    for (const binfo of backupFiles) {
      expect(fs.existsSync(binfo.backup)).toBe(true);
      expect(fs.existsSync(binfo.original)).toBe(false);
    }

    // restore
    restoreBackups(backupFiles);
    for (const binfo of backupFiles) {
      expect(fs.existsSync(binfo.original)).toBe(true);
      expect(fs.existsSync(binfo.backup)).toBe(false);
    }

    // cleanup
    fs.rmSync(base, { recursive: true, force: true });
  });

  it('clearBackups removes backup files', () => {
    const base = createTestDir('refresh');
    const dir = path.join(base, 'out');
    fs.mkdirSync(dir, { recursive: true });
    const a = path.join(dir, 'a.txt');
    fs.writeFileSync(a, '1');

    const backupFiles = [];
    executeRefresh({ output: dir }, backupFiles);
    expect(backupFiles.length).toBeGreaterThan(0);

    clearBackups(backupFiles);
    for (const binfo of backupFiles) {
      expect(fs.existsSync(binfo.backup)).toBe(false);
    }

    fs.rmSync(base, { recursive: true, force: true });
  });
});
