const { execFileSync } = require("node:child_process");
const { readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");

/**
 * TZ is set here so the forked workers inherit it; local-day suites fail east of Greenwich without it.
 * intlayer builds only when stale by mtime: a raw `jest` skips the `test` script's build, and building on
 * every start races on the `.intlayer/cache` lock.
 */
module.exports = function globalSetup() {
    process.env.TZ = "America/Caracas";

    const root = join(__dirname, "..");
    if (newestMtime(join(root, ".intlayer", "dictionary")) < newestMtime(join(root, "src", "content"))) {
        execFileSync(join(root, "node_modules", ".bin", "intlayer"), ["build"], { cwd: root, stdio: "inherit" });
    }
};

function newestMtime(dir) {
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return Number.NEGATIVE_INFINITY;
    }
    return entries.reduce(
        (newest, name) => Math.max(newest, statSync(join(dir, name)).mtimeMs),
        Number.NEGATIVE_INFINITY
    );
}
