const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

describe("cli setup integration", () => {
  it("runs `--setup` and creates coffee.config.cjs", async () => {
    const dir = createTestDir("cli");

    // run the setup command directly via CoffeeScript so we don't require the ESM-only `yargs` in `main`
    const scriptPath = require("path").join(process.cwd(), "src", "commands", "setup.coffee");
    const csRegister = require.resolve("coffeescript/register");
    await new Promise((resolve, reject) => {
      // -r <abs> -> preload CoffeeScript via absolute path so child process can find it
      execFile(
        "node",
        ["-r", csRegister, "-e", `require(${JSON.stringify(scriptPath)})()`],
        { cwd: dir },
        (err) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });

    const cfgPath = path.join(dir, "coffee.config.cjs");
    expect(fs.existsSync(cfgPath)).toBe(true);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
