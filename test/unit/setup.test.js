const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const setup = require('../../src/commands/setup.coffee');
const { CONFIG_FILE, CWD } = require('../../src/lib/constants.coffee');

describe.skip('setup', () => {
  let cwd;
  let mockExecSync;
  let mockConsolaPrompt;
  let mockConsolaStart;
  let mockConsolaSuccess;
  let mockConsolaInfo;
  let mockConsolaError;
  let mockConsolaBox;
  let mockConsolaWarn;
  let mockConfirmContinue;

  beforeEach(() => {
    cwd = process.cwd();
    mockExecSync = vi.fn();
    const childProcess = require('child_process');
    vi.spyOn(childProcess, 'execSync').mockImplementation((cmd, opts) => mockExecSync(cmd, opts));

    const consola = require('consola');
    mockConsolaPrompt = vi.spyOn(consola, 'prompt').mockResolvedValue(true);
    mockConsolaStart = vi.spyOn(consola, 'start');
    mockConsolaSuccess = vi.spyOn(consola, 'success');
    mockConsolaInfo = vi.spyOn(consola, 'info');
    mockConsolaError = vi.spyOn(consola, 'error');
    mockConsolaBox = vi.spyOn(consola, 'box');
    mockConsolaWarn = vi.spyOn(consola, 'warn');
  });

  afterEach(() => {
    process.chdir(cwd);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sets up a new Milkee project', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'milkee-setup-'));
    process.chdir(dir);

    // Mock package.json creation
    mockExecSync.mockImplementation((cmd) => {
      if (cmd.includes('npm init')) {
        fs.writeFileSync('package.json', JSON.stringify({ name: 'test-project', version: '1.0.0' }));
      }
    });

    // Re-require to capture new CWD
    delete require.cache[require.resolve('../../src/lib/constants.coffee')];
    delete require.cache[require.resolve('../../src/commands/setup.coffee')];
    const setupLocal = require('../../src/commands/setup.coffee');

    await setupLocal();

    // Check if files were created
    expect(fs.existsSync('src/main.coffee')).toBe(true);
    expect(fs.existsSync(CONFIG_FILE)).toBe(true);
    expect(fs.existsSync('.gitignore')).toBe(true);
    expect(fs.existsSync('.gitattributes')).toBe(true);
    expect(fs.existsSync('README.md')).toBe(true);

    // Check package.json updates
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    expect(pkg.main).toBe('dist/main.js');
    expect(pkg.scripts.build).toBe('milkee');
    expect(pkg.keywords).toContain('milkee');

    // Check execSync calls
    expect(mockExecSync).toHaveBeenCalledWith('npm init -y', expect.any(Object));
    expect(mockExecSync).toHaveBeenCalledWith('npm install -D coffeescript milkee', expect.any(Object));

    // Cleanup
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {}
  });

  it('skips overwriting existing files when user says no', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'milkee-setup-'));
    process.chdir(dir);

    // Create existing files
    fs.mkdirSync('src');
    fs.writeFileSync('src/main.coffee', 'existing content');
    fs.writeFileSync(CONFIG_FILE, 'existing config');
    fs.writeFileSync('README.md', 'existing readme');

    // Mock prompts to say no to overwrite
    mockConsolaPrompt.mockResolvedValue(false);

    // Mock package.json
    fs.writeFileSync('package.json', JSON.stringify({ name: 'test-project' }));

    delete require.cache[require.resolve('../../src/lib/constants.coffee')];
    delete require.cache[require.resolve('../../src/commands/setup.coffee')];
    const setupLocal = require('../../src/commands/setup.coffee');

    await setupLocal();

    // Files should remain unchanged
    expect(fs.readFileSync('src/main.coffee', 'utf-8')).toBe('existing content');
    expect(fs.readFileSync(CONFIG_FILE, 'utf-8')).toBe('existing config');
    expect(fs.readFileSync('README.md', 'utf-8')).toBe('existing readme');

    // Cleanup
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {}
  });

  it('overwrites existing files when user says yes', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'milkee-setup-'));
    process.chdir(dir);

    // Create existing files
    fs.mkdirSync('src');
    fs.writeFileSync('src/main.coffee', 'existing content');

    // Mock prompts to say yes to overwrite
    mockConsolaPrompt.mockResolvedValue(true);

    // Mock package.json
    fs.writeFileSync('package.json', JSON.stringify({ name: 'test-project' }));

    delete require.cache[require.resolve('../../src/lib/constants.coffee')];
    delete require.cache[require.resolve('../../src/commands/setup.coffee')];
    const setupLocal = require('../../src/commands/setup.coffee');

    await setupLocal();

    // File should be overwritten
    expect(fs.readFileSync('src/main.coffee', 'utf-8')).not.toBe('existing content');

    // Cleanup
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {}
  });

  it('cancels setup when user does not confirm', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'milkee-setup-'));
    process.chdir(dir);

    // Mock confirmation prompt to return false
    mockConsolaPrompt.mockResolvedValue(false);

    delete require.cache[require.resolve('../../src/commands/setup.coffee')];
    const setupLocal = require('../../src/commands/setup.coffee');

    await setupLocal();

    // No files should be created
    expect(fs.existsSync('src/main.coffee')).toBe(false);

    // Cleanup
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {}
  });
});
