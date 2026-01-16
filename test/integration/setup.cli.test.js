const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

describe("cli setup integration", () => {
  it("runs `--setup` and creates coffee.config.cjs", async () => {
    const dir = createTestDir("cli");

    // run the CLI with coffeescript registered (use resolved path so Node can load it from project)
    const reg = require.resolve("coffeescript/register");
    const script = require("path").join(process.cwd(), "src", "main.coffee");
    await new Promise((resolve, reject) => {
      execFile("node", ["-r", reg, script, "--setup"], { cwd: dir }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const cfgPath = path.join(dir, "coffee.config.cjs");
    expect(fs.existsSync(cfgPath)).toBe(true);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
