const fs = require("fs");
const path = require("path");
const os = require("os");

const setup = require("../../src/commands/setup.coffee");
const checks = require("../../src/lib/checks.coffee");
const { CONFIG_FILE } = require("../../src/lib/constants.coffee");

describe("setup", () => {
  let cwd;
  beforeEach(() => {
    cwd = process.cwd();
    vi.spyOn(checks, "checkCoffee").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(cwd);
    vi.restoreAllMocks();
  });

  it("creates config file when not present", async () => {
    const dir = fs.mkdtempSync(
      path.join(require("os").tmpdir(), "milkee-setup-"),
    );
    process.chdir(dir);

    // re-require to ensure constants.CWD is captured from the new cwd
    delete require.cache[require.resolve("../../src/lib/constants.coffee")];
    delete require.cache[require.resolve("../../src/commands/setup.coffee")];
    const setupLocal = require("../../src/commands/setup.coffee");

    // run setup
    await setupLocal();

    const cfgPath = path.join(dir, CONFIG_FILE);
    expect(fs.existsSync(cfgPath)).toBe(true);

    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      /* ignore */
    }
  });

  it("does not overwrite when prompt says no", async () => {
    const dir = fs.mkdtempSync(
      path.join(require("os").tmpdir(), "milkee-setup-"),
    );
    process.chdir(dir);

    const cfgPath = path.join(dir, CONFIG_FILE);
    fs.writeFileSync(cfgPath, "original");

    const consola = require("consola");
    vi.spyOn(consola, "prompt").mockResolvedValue(false);

    delete require.cache[require.resolve("../../src/lib/constants.coffee")];
    delete require.cache[require.resolve("../../src/commands/setup.coffee")];
    const setupLocal = require("../../src/commands/setup.coffee");

    await setupLocal();

    expect(fs.readFileSync(cfgPath, "utf-8")).toBe("original");

    // try cleanup; ignore errors
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {}
  });
});
