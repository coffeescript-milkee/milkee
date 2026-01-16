const fs = require("fs");

const path = require("path");

const plugins = require("../../src/lib/plugins.coffee");

describe("plugins", () => {
  it("runPlugins executes provided plugin functions", async () => {
    let called = false;
    const tempDir = createTestDir("plugins");
    // create a dummy compiled file
    const compiled = path.join(tempDir, "out.js");
    fs.writeFileSync(compiled, "x");

    const config = {
      output: tempDir,
      milkee: {
        plugins: [
          (res) => {
            called = true;
            return Promise.resolve();
          },
        ],
      },
    };
    plugins.runPlugins(config, {});

    // wait a tick for async IIFE to run
    await new Promise((r) => setTimeout(r, 10));
    expect(called).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("warns on invalid plugin entries", async () => {
    const tempDir = fs.mkdtempSync(
      path.join(require("os").tmpdir(), "milkee-plugins-"),
    );
    const consola = require("consola");
    vi.spyOn(consola, "warn").mockImplementation(() => {});

    const config = { output: tempDir, milkee: { plugins: ["not-fn"] } };
    plugins.runPlugins(config, {});
    await new Promise((r) => setTimeout(r, 10));

    expect(consola.warn).toHaveBeenCalled();

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
