const fs = require("fs");
const path = require("path");
const consola = require("consola");

// We re-require the checks module inside tests to allow us to mock dependencies
// that it captures at require-time.

describe("checks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("checkLatest returns true and shows box when not latest", async () => {
    vi.mock("is-package-latest", () => ({
      isPackageLatest: async () => ({
        success: true,
        isLatest: false,
        currentVersion: "1.0.0",
        latestVersion: "1.2.0",
      }),
    }));
    const { checkLatest } = require("../../src/lib/checks.coffee");

    vi.spyOn(consola, "box").mockImplementation(() => {});

    const res = await checkLatest();
    expect(res).toBe(true);
    expect(consola.box).toHaveBeenCalled();
  });

  it("checkCoffee reads package.json and does not warn when coffeescript present", async () => {
    const { checkCoffee } = require("../../src/lib/checks.coffee");
    vi.spyOn(consola, "warn").mockImplementation(() => {});
    await checkCoffee();
    expect(consola.warn).not.toHaveBeenCalled();
  });
});
