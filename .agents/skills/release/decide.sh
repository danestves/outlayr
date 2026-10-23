#!/usr/bin/env bash
set -euo pipefail
channel=${1:-}
platform=${2:-ios}
usage() {
    echo "usage: decide.sh preview|production [ios|android]" >&2
    exit 2
}
case "$channel" in
preview | production) ;;
*) usage ;;
esac
# `foreign` matches paths only the other platform's binary is built from.
case "$platform" in
ios)
    foreign='\.android\.[jt]sx?$|^apps/native/modules/[^/]+/android/'
    ;;
android)
    foreign='^apps/native/(app-intents|targets|modules/[^/]+/ios)/'
    ;;
*) usage ;;
esac
cd "$(git rev-parse --show-toplevel)/apps/native"
export npm_config_loglevel=error

field() { python3 -c "import json,sys; d=json.loads(sys.stdin.read(),strict=False); print($1)"; }
app_files() {
    grep -E '^(apps/native/|packages/(env|money)/|pnpm-lock\.yaml$)' |
        grep -vE '\.test\.tsx?$|__tests__/|\.md$|^apps/native/(docs|jest|scripts)/|^apps/native/jest\.config\.js$' |
        grep -vE "$foreign" || true
}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

git fetch -q origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ] || [ -n "$(git status --porcelain)" ]; then
    echo "The fingerprint hashes this checkout. Put it on a clean origin/main first:" >&2
    echo "  git switch --detach origin/main && vp i" >&2
    exit 1
fi

# @expo/fingerprint 0.21.4 drops every Expo module from the Android fingerprint
# when one Gradle plugin has no source folder (expo-widgets' does not), so a
# native-only change would read as an OTA. patches/@expo__fingerprint@*.patch
# fixes it; this catches a bump that loses the patch.
if [ "$platform" = android ]; then
    modules=$(EAS_BUILD_PROFILE=$channel npx expo-updates fingerprint:generate --platform android |
        field 'sum("expoAutolinkingAndroid" in s.get("reasons", []) for s in d["sources"])')
    if [ "$modules" = 0 ]; then
        echo "The Android fingerprint lists no Expo module sources, so it can't see native changes." >&2
        echo "Check that the @expo/fingerprint patch in pnpm-workspace.yaml still applies." >&2
        exit 1
    fi
fi

# Store builds run on GitHub Actions (.github/workflows/eas-build.yml), and rnd
# stamps the platform and profile into each run's name. `rnd build:list` fetches
# three runs per result before it filters, so it can miss a build `gh` sees.
gh run list --workflow eas-build.yml --status success --limit 100 --json databaseId,number,headSha,displayTitle >"$tmp/builds.json"
read -r newest newest_sha newest_here own_version own_numbers build_run build_sha build_version <<<"$(
    python3 - "$tmp/builds.json" "$platform" "$channel" <<'PY'
import json, re, sys
path, platform, channel = sys.argv[1:]
builds = [
    {
        "here": f"platform={platform};" in run["displayTitle"],
        "id": run["databaseId"],
        "number": 100 + run["number"],
        "ours": f"platform={platform};profile={channel};" in run["displayTitle"],
        "sha": run["headSha"],
        "version": stamped[1] if (stamped := re.search(r" build (\d+\.\d+\.\d+) \[", run["displayTitle"])) else "1.0.0",
    }
    for run in json.loads(open(path).read(), strict=False)
    if "distribution=store;" in run["displayTitle"]
]
if builds:
    newest = max(builds, key=lambda build: (tuple(map(int, build["version"].split("."))), build["here"]))
    fields = [newest["version"], newest["sha"], int(newest["here"])]
    if own := next((build for build in builds if build["here"]), None):
        numbers = ",".join(str(build["number"]) for build in builds if build["here"] and build["version"] == own["version"])
        fields += [own["version"], numbers]
        if ours := next((build for build in builds if build["ours"]), None):
            fields += [ours["id"], ours["sha"], ours["version"]]
    print(*fields)
PY
)"

pick_version() {
    if [ -n "$own_version" ]; then
        if [ "$platform" = ios ]; then
            live=$(asc versions list --app 6801652978 --platform IOS --version "$own_version" --output json |
                field 'any(v["attributes"]["appVersionState"] in ("ACCEPTED", "PENDING_APPLE_RELEASE", "PENDING_DEVELOPER_RELEASE", "PROCESSING_FOR_DISTRIBUTION", "READY_FOR_DISTRIBUTION", "REPLACED_WITH_NEW_VERSION") for v in d["data"])')
        else
            live=$(node ../../.agents/skills/release/play.ts status | python3 -c '
import sys
live = {code for line in sys.stdin if line.startswith("production: ") for release in line[12:].strip().split("; ") if release != "empty" and release.split()[1] != "draft" for code in release.split()[0].split(",")}
print(bool(live & set(sys.argv[1].split(","))))' "$own_numbers")
        fi
        if [ "$live" = False ]; then
            version=$own_version
            echo "$platform $own_version isn't live on its store yet, so this build keeps it."
            echo
            return
        fi
    fi
    version=1.0.0 version_commits=''
    if [ -n "$newest" ]; then
        version_commits=$(git rev-list --no-merges "$newest_sha..HEAD" | while read -r sha; do
            if [ -n "$(git diff-tree --no-commit-id --name-only -r "$sha" | app_files)" ]; then
                git log -1 --format='%h %s' "$sha"
            fi
        done)
        IFS=. read -r major minor patch <<<"$newest"
        if [ -z "$version_commits" ] && [ "$newest_here" = 0 ]; then
            version=$newest
        elif grep -qE '^[0-9a-f]+ (feat|fix)(\([^)]*\))?!:' <<<"$version_commits"; then
            version=$((major + 1)).0.0
        elif grep -qE '^[0-9a-f]+ feat(\([^)]*\))?:' <<<"$version_commits"; then
            version=$major.$((minor + 1)).0
        else
            version=$major.$minor.$((patch + 1))
        fi
    fi
    echo "Newest store version: ${newest:-none}${newest_sha:+ at ${newest_sha:0:8}}. Next $platform version: $version, from:"
    echo "${version_commits:-  no $platform app changes since}"
    echo
}
ship() {
    echo "gh workflow run eas-build.yml --ref main -f platform=$platform -f profile=$channel -f runner=macos-26 -f version=$version \\"
    echo "  -f dispatch_id=$(python3 -c 'import uuid; print(uuid.uuid4())') -f config_json='{\"distribution\":\"store\"}'"
}

if [ -z "$build_run" ]; then
    echo "No $platform store build on channel $channel yet."
    echo
    pick_version
    echo "VERDICT: FIRST BUILD"
    ship
    exit 0
fi
# shortcut: artifacts expire after 90 days, so a build older than that has no
# fingerprint to compare against. Ship a new build then.
gh run download "$build_run" -n fingerprint -D "$tmp"
runtime=$(field 'd["hash"]' <"$tmp/fingerprint.json")

base=$build_sha
ota_run='' ota_sha=''
ota=$(gh run list --workflow update.yml --status success --limit 100 --json databaseId,headSha,displayTitle |
    field '" ".join(next(((str(r["databaseId"]), r["headSha"]) for r in d if r["displayTitle"] == "'"$platform $channel update"'"), ()))')
if [ -n "$ota" ]; then
    read -r id sha <<<"$ota"
    if git merge-base --is-ancestor "$build_sha" "$sha" && git merge-base --is-ancestor "$sha" HEAD; then
        ota_run=$id ota_sha=$sha base=$sha
    fi
fi

changed=$(git diff --name-only "$base" HEAD)
app=$(app_files <<<"$changed")
backend=$(grep -E '^packages/backend/convex/' <<<"$changed" | grep -vE '\.test\.ts$' || true)
env_vars=$(gh variable list --env "$channel" --json name,value --jq '.[] | "\(.name)=\(.value)"')
(
    while IFS= read -r var; do export "$var"; done <<<"$env_vars"
    DOTENV_CONFIG_PATH=/dev/null EAS_BUILD_PROFILE=$channel npx expo-updates fingerprint:generate --platform "$platform" >"$tmp/head.json"
)
fingerprint=$(
    python3 - "$tmp/fingerprint.json" "$tmp/head.json" <<'PY'
import json, sys
build, head = (json.load(open(path)) for path in sys.argv[1:])
if build["hash"] == head["hash"]:
    print(f"The project matches fingerprint {build['hash'][:8]} of the build.")
    sys.exit()
print(f"The project differs from fingerprint {build['hash'][:8]} of the build:")
key = lambda source: (source["type"], source.get("filePath") or source.get("id"))
before = {key(source): source.get("hash") for source in build["sources"]}
after = {key(source): source.get("hash") for source in head["sources"]}
for source in sorted(before.keys() | after.keys()):
    if before.get(source) != after.get(source):
        change = "added" if source not in before else "removed" if source not in after else "changed"
        print(f"  {change}: {source[0]} {source[1]}")
PY
)

echo "$platform build run $build_run on $channel: version $build_version, commit ${build_sha:0:8}, runtime ${runtime:0:8}"
echo "Last OTA on that runtime: ${ota_run:-none}${ota_sha:+ at ${ota_sha:0:8}}"
echo
echo "Merged since ${base:0:8}:"
git log --oneline --no-merges "$base..HEAD"
echo
echo "App files:"
echo "${app:-  none}"
echo "Backend files:"
echo "${backend:-  none}"
echo
echo "$fingerprint"
echo

if [ -z "$app" ] && [ -z "$backend" ]; then
    echo "VERDICT: NOTHING TO SHIP"
elif [ -z "$app" ]; then
    echo "VERDICT: BACKEND ONLY"
    echo "gh workflow run deploy-backend.yml -f environment=$channel"
elif grep -q 'differs from fingerprint' <<<"$fingerprint"; then
    pick_version
    echo "VERDICT: BUILD"
    ship
else
    echo "VERDICT: OTA"
    echo "gh workflow run update.yml -f channel=$channel -f platform=$platform -f version=$build_version -f message=\$'...'"
fi
