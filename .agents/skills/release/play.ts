import { createSign } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const PACKAGE = "com.tryoutlayr.app";
const KEY_PATH = join(homedir(), ".config/outlayr/play-publisher.json");
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const UPLOAD_API = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}`;
const TRACKS = { preview: "internal", production: "production" } as const;
const LISTINGS = join(import.meta.dirname, "../../../apps/native/store/play");
const NOTE_LANGUAGES = {
    en: ["en-US"],
    es: ["es-419", "es-US"],
    "es-ES": ["es-ES"],
    fr: ["fr-FR"],
    pt: ["pt-BR"],
    "pt-PT": ["pt-PT"],
} as const;

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
       play.ts upload <aab> production <notes dir>
       play.ts notes <notes dir>
       play.ts listing [<images dir>]
       play.ts status

<notes dir> holds one <language>.txt per app language: ${Object.keys(NOTE_LANGUAGES).join(", ")}.
<images dir> holds <Play language>/01.png... and feature.png; a language without a folder keeps its images.`);
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
if (command !== "upload" && command !== "notes" && command !== "listing" && command !== "status") {
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

async function releaseNotes(dir: string): Promise<{ language: string; text: string }[]> {
    const notes = await Promise.all(
        Object.entries(NOTE_LANGUAGES).map(async ([language, codes]) => {
            const text = (await readFile(join(dir, `${language}.txt`), "utf8")).trim();
            return codes.map((code) => ({ language: code, text }));
        })
    );
    return notes.flat();
}

function describe(release: Release): string {
    const share = release.userFraction === undefined ? "" : ` at ${release.userFraction * 100}%`;
    return `${release.versionCodes?.join(",") ?? "-"} ${release.status}${share}`;
}

if (command === "upload") {
    const [aab, channel, notes] = args;
    if (!aab || (channel !== "preview" && channel !== "production") || (channel === "production" && !notes)) {
        usage();
    }
    const track = TRACKS[channel];
    const productionNotes = notes ? await releaseNotes(notes) : undefined;
    await inEdit(async (edit) => {
        const { versionCode } = await call<{ versionCode: number }>(
            "POST",
            `${UPLOAD_API}/edits/${edit}/bundles?uploadType=media`,
            await readFile(aab),
            "application/octet-stream"
        );
        await putTrack(edit, {
            releases: [
                {
                    releaseNotes: channel === "production" ? productionNotes : undefined,
                    status: "completed",
                    versionCodes: [String(versionCode)],
                },
            ],
            track,
        });
        console.log(`versionCode ${versionCode} committed to the ${track} track`);
    });
}

if (command === "notes") {
    const [notes] = args;
    if (!notes) {
        usage();
    }
    const replacement = await releaseNotes(notes);
    await inEdit(async (edit) => {
        const track = await call<Track>("GET", `${API}/edits/${edit}/tracks/production`);
        const releases = track.releases ?? [];
        if (releases.length === 0) {
            throw new Error("The production track has no release to change");
        }
        const newest = String(Math.max(...releases.flatMap((release) => release.versionCodes ?? []).map(Number)));
        await putTrack(edit, {
            ...track,
            releases: releases.map((release) =>
                release.versionCodes?.includes(newest)
                    ? { ...release, releaseNotes: replacement }
                    : release
            ),
        });
        console.log(`versionCode ${newest} notes replaced on the production track`);
    });
}

if (command === "listing") {
    const [images] = args;
    const languages = (await readdir(LISTINGS)).filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5));
    await inEdit(async (edit) => {
        for (const language of languages) {
            const listing: { fullDescription: string; shortDescription: string; title: string } = JSON.parse(
                await readFile(join(LISTINGS, `${language}.json`), "utf8")
            );
            await call("PUT", `${API}/edits/${edit}/listings/${language}`, JSON.stringify({ ...listing, language }));
            const folder = images ? join(images, language) : undefined;
            const shots = folder ? (await readdir(folder).catch(() => [])).filter((file) => file.endsWith(".png")) : [];
            if (folder && shots.length > 0) {
                for (const type of ["phoneScreenshots", "featureGraphic"]) {
                    await call("DELETE", `${API}/edits/${edit}/listings/${language}/${type}`);
                }
                for (const shot of shots.toSorted()) {
                    const type = shot === "feature.png" ? "featureGraphic" : "phoneScreenshots";
                    await call(
                        "POST",
                        `${UPLOAD_API}/edits/${edit}/listings/${language}/${type}?uploadType=media`,
                        await readFile(join(folder, shot)),
                        "image/png"
                    );
                }
            }
            console.log(`${language}: text${shots.length > 0 ? ` and ${shots.length} images` : ""}`);
        }
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
