const fs = require('fs');
const path = require('path');

describe('sandbox Windows extended path handling', () => {
  it('allows writes when path uses \\?\\ prefix (Windows only)', () => {
    if (process.platform !== 'win32') return;
    const dir = createTestDir('win-prefix');
    // simulate Windows extended path prefix
    // use Windows extended path prefix with doubled backslashes
    const prefixed = '\\\\?\\\\' + path.join(dir, 'file.txt');
    expect(() => fs.writeFileSync(prefixed, 'ok')).not.toThrow();
    expect(fs.existsSync(path.join(dir, 'file.txt'))).toBe(true);
  });
});
