import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const PACKAGE = "com.tryoutlayr.app";
const KEY_PATH = join(homedir(), ".config/outlayr/play-publisher.json");
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const UPLOAD_API = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}`;
const TRACKS = { preview: "internal", production: "production" } as const;
const FIRST_ROLLOUT = 0.5;
const NOTE_LANGUAGES = { en: ["en-US"], es: ["es-419", "es-ES", "es-US"] } as const;

interface Release {
    releaseNotes?: { language: string; text: string }[];
    status: "completed" | "draft" | "halted" | "inProgress";
    userFraction?: number;
    versionCodes?: string[];
}

interface Track {
    releases?: Release[];
    track: string;
}

function usage(): never {
    console.error(`usage: play.ts upload <aab> preview
       play.ts upload <aab> production "<English notes>" "<Spanish notes>"
       play.ts rollout <fraction, 1 to finish>
       play.ts status`);
    process.exit(2);
}

async function accessToken(): Promise<string> {
    const key: { client_email: string; private_key: string; token_uri: string } = JSON.parse(
        await readFile(KEY_PATH, "utf8")
    );
    const now = Math.floor(Date.now() / 1000);
    const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString("base64url");
    const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
        aud: key.token_uri,
        exp: now + 3600,
        iat: now,
        iss: key.client_email,
        scope: "https://www.googleapis.com/auth/androidpublisher",
    })}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
    const response = await fetch(key.token_uri, {
        body: new URLSearchParams({
            assertion: `${unsigned}.${signature}`,
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        }),
        method: "POST",
    });
    const body: { access_token?: string; error_description?: string } = await response.json();
    if (!body.access_token) {
        throw new Error(`Google token: ${body.error_description ?? response.status}`);
    }
    return body.access_token;
}

const [command, ...args] = process.argv.slice(2);
if (command !== "upload" && command !== "rollout" && command !== "status") {
    usage();
}
const token = await accessToken();

async function call<T>(method: string, url: string, body?: BodyInit, contentType = "application/json"): Promise<T> {
    const response = await fetch(url, {
        body,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
        method,
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`${method} ${url.replace(API, "")}: ${response.status} ${text}`);
    }
    return text ? JSON.parse(text) : ({} as T);
}

async function inEdit(change: (edit: string) => Promise<void>): Promise<void> {
    const { id } = await call<{ id: string }>("POST", `${API}/edits`, "{}");
    await change(id);
    await call("POST", `${API}/edits/${id}:commit`);
}

const putTrack = (edit: string, track: Track) =>
    call("PUT", `${API}/edits/${edit}/tracks/${track.track}`, JSON.stringify(track));

function describe(release: Release): string {
    const share = release.userFraction === undefined ? "" : ` at ${release.userFraction * 100}%`;
    return `${release.versionCodes?.join(",") ?? "-"} ${release.status}${share}`;
}

if (command === "upload") {
    const [aab, channel, english = "", spanish = ""] = args;
    if (
        !aab ||
        (channel !== "preview" && channel !== "production") ||
        (channel === "production" && !(english && spanish))
    ) {
        usage();
    }
    const track = TRACKS[channel];
    await inEdit(async (edit) => {
        const { versionCode } = await call<{ versionCode: number }>(
            "POST",
            `${UPLOAD_API}/edits/${edit}/bundles?uploadType=media`,
            await readFile(aab),
            "application/octet-stream"
        );
        const versionCodes = [String(versionCode)];
        if (channel === "preview") {
            await putTrack(edit, { releases: [{ status: "completed", versionCodes }], track });
        } else {
            const current = await call<Track>("GET", `${API}/edits/${edit}/tracks/${track}`);
            const live = (current.releases ?? []).filter((release) => release.status === "completed");
            const releaseNotes = Object.entries(NOTE_LANGUAGES).flatMap(([language, codes]) =>
                codes.map((code) => ({ language: code, text: language === "en" ? english : spanish }))
            );
            await putTrack(edit, {
                releases: [...live, { releaseNotes, status: "inProgress", userFraction: FIRST_ROLLOUT, versionCodes }],
                track,
            });
        }
        console.log(`versionCode ${versionCode} committed to the ${track} track`);
    });
}

if (command === "rollout") {
    const fraction = Number(args[0]);
    if (!(fraction > 0 && fraction <= 1)) {
        usage();
    }
    await inEdit(async (edit) => {
        const current = await call<Track>("GET", `${API}/edits/${edit}/tracks/production`);
        const releases = current.releases ?? [];
        const rolling = releases.find((release) => release.status === "inProgress" || release.status === "halted");
        if (!rolling) {
            throw new Error(`No staged rollout on production: ${releases.map(describe).join("; ")}`);
        }
        const next: Release =
            fraction === 1
                ? { releaseNotes: rolling.releaseNotes, status: "completed", versionCodes: rolling.versionCodes }
                : { ...rolling, status: "inProgress", userFraction: fraction };
        const live = fraction === 1 ? [] : releases.filter((release) => release.status === "completed");
        await putTrack(edit, { releases: [...live, next], track: "production" });
        console.log(`production: ${describe(next)}`);
    });
}

if (command === "status") {
    const { id } = await call<{ id: string }>("POST", `${API}/edits`, "{}");
    const { tracks } = await call<{ tracks: Track[] }>("GET", `${API}/edits/${id}/tracks`);
    await call("DELETE", `${API}/edits/${id}`);
    for (const { releases, track } of tracks) {
        console.log(`${track}: ${(releases ?? []).map(describe).join("; ") || "empty"}`);
    }
}
