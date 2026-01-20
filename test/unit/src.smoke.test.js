const fs = require('fs');
const path = require('path');

function collectCoffeeFiles(dir) {
  let out = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      out = out.concat(collectCoffeeFiles(itemPath));
    } else if (stat.isFile() && itemPath.endsWith('.coffee')) {
      out.push(itemPath);
    }
  }
  return out;
}

const SRC_DIR = path.join(__dirname, '../../src');
let files = [];
try {
  files = collectCoffeeFiles(SRC_DIR);
} catch (e) {
  // If src missing for some reason, test will fail explicitly below
}

// Exclude main.coffee and compile.coffee to avoid executing CLI/long-running flows on require
files = files.filter((f) => {
  const excluded = [
    path.join('src', 'main.coffee'),
    path.join('src', 'commands', 'compile.coffee'),
  ];
  return !excluded.some((e) => f.endsWith(e));
});

if (files.length === 0) {
  it('has .coffee files under src', () => {
    throw new Error('No .coffee files found under src');
  });
} else {
  describe('smoke: require all src .coffee files', () => {
    for (const file of files) {
      const rel = path.relative(process.cwd(), file);
      it(`require ${rel}`, () => {
        // clear cache to make require deterministic
        try {
          delete require.cache[require.resolve(file)];
        } catch (e) {}
        expect(() => {
          const mod = require(file);
          expect(mod).not.toBeUndefined();
        }).not.toThrow();
      });
    }
  });
}
