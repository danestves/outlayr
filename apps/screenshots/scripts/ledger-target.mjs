import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const BUNDLE_ID = "com.tryoutlayr.app";

const ANDROID_PREFIX = "android:";
const DB_PREFIX = "db:";
const ANDROID_DATA = `/data/user/0/${BUNDLE_ID}`;
const ANDROID_DB = "files/SQLite/outlayr.db";
const MAX_BUFFER = 256 * 1024 * 1024;

function sqlite(dbPath, sql) {
    return execFileSync("sqlite3", [dbPath, sql], { encoding: "utf-8", maxBuffer: MAX_BUFFER });
}

function simulatorLedger(udid) {
    const simctl = (...args) => execFileSync("xcrun", ["simctl", ...args], { encoding: "utf-8" }).trim();
    const container = simctl("get_app_container", udid, BUNDLE_ID, "data");
    const dbPath = join(container, "Documents/SQLite/outlayr.db");
    const photoDir = join(container, "Documents/transaction-photos");
    return {
        commit() {},
        dbPath,
        logoCacheDir: join(container, "Library/Caches/merchant-logos"),
        photoDir,
        photoUri: (name) => `file://${join(photoDir, name)}`,
        signOut: () => simctl("keychain", udid, "reset"),
        stopApp() {
            try {
                execFileSync("xcrun", ["simctl", "terminate", udid, BUNDLE_ID], { stdio: "ignore" });
            } catch {
                // Not running.
            }
        },
    };
}

function androidLedger(serial) {
    const adb = (args, options = {}) =>
        execFileSync("adb", ["-s", serial, ...args], { maxBuffer: MAX_BUFFER, ...options });
    const runAs = (command, options) => adb(["shell", `run-as ${BUNDLE_ID} sh -c '${command}'`], options);
    const stopApp = () => adb(["shell", "am", "force-stop", BUNDLE_ID]);

    const work = mkdtempSync(join(tmpdir(), "outlayr-android-"));
    const dbPath = join(work, "outlayr.db");
    const photoDir = join(work, "files/transaction-photos");
    const logoCacheDir = join(work, "cache/merchant-logos");

    stopApp();
    const pulled = adb(["exec-out", "run-as", BUNDLE_ID, "cat", ANDROID_DB]);
    if (pulled.length === 0) {
        throw new Error(`No ledger at ${ANDROID_DB} on ${serial}. Launch the debuggable build once first.`);
    }
    writeFileSync(dbPath, pulled);
    const wal = runAs(`cat ${ANDROID_DB}-wal 2>/dev/null; true`);
    if (wal.length > 0) {
        writeFileSync(`${dbPath}-wal`, wal);
    }
    sqlite(dbPath, "PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;");

    return {
        commit() {
            sqlite(dbPath, "PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;");
            runAs(`rm -f ${ANDROID_DB}-wal ${ANDROID_DB}-shm`);
            runAs(`cat > ${ANDROID_DB}`, { input: readFileSync(dbPath) });
            const staged = ["files/transaction-photos", "cache/merchant-logos"].filter((dir) =>
                existsSync(join(work, dir))
            );
            if (staged.length > 0) {
                const tar = execFileSync("tar", ["-cf", "-", "-C", work, ...staged], { maxBuffer: MAX_BUFFER });
                adb(["shell", `run-as ${BUNDLE_ID} tar -xf - -C ${ANDROID_DATA}`], { input: tar });
            }
            runAs("rm -f cache/merchant-logos/*.miss");
        },
        dbPath,
        logoCacheDir,
        photoDir,
        photoUri: (name) => `file://${ANDROID_DATA}/files/transaction-photos/${name}`,
        signOut: () => runAs("rm -f shared_prefs/SecureStore.xml"),
        stopApp,
    };
}

function copyLedger(dbPath) {
    if (!existsSync(dbPath)) {
        throw new Error(`No ledger copy at ${dbPath}`);
    }
    const work = mkdtempSync(join(tmpdir(), "outlayr-copy-"));
    return {
        commit() {},
        dbPath,
        logoCacheDir: join(work, "cache/merchant-logos"),
        photoDir: join(work, "files/transaction-photos"),
        photoUri: (name) => `file://${ANDROID_DATA}/files/transaction-photos/${name}`,
        signOut() {},
        stopApp() {},
    };
}

function resolveLedger(target) {
    if (target.startsWith(ANDROID_PREFIX)) {
        return androidLedger(target.slice(ANDROID_PREFIX.length));
    }
    if (target.startsWith(DB_PREFIX)) {
        return copyLedger(target.slice(DB_PREFIX.length));
    }
    return simulatorLedger(target);
}

export function openLedger(target) {
    const ledger = resolveLedger(target);

    if (!existsSync(ledger.dbPath)) {
        throw new Error(`No ledger at ${ledger.dbPath}`);
    }
    mkdirSync(ledger.photoDir, { recursive: true });
    mkdirSync(ledger.logoCacheDir, { recursive: true });
    return ledger;
}
