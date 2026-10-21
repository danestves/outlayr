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
ship="npx -y -p @react-native-feel/deploy@0.3.0 rnd build -p $platform -e $channel --json"
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
build=$(gh run list --workflow eas-build.yml --status success --limit 100 --json databaseId,headSha,displayTitle |
    field '" ".join(next(((str(r["databaseId"]), r["headSha"]) for r in d if "platform='"$platform"';profile='"$channel"';distribution=store;" in r["displayTitle"]), ()))')
if [ -z "$build" ]; then
    echo "No $platform store build on channel $channel yet."
    echo
    echo "VERDICT: FIRST BUILD"
    echo "$ship"
    exit 0
fi
read -r build_run build_sha <<<"$build"
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
app=$(grep -E '^(apps/native/|packages/(env|money)/|pnpm-lock\.yaml$)' <<<"$changed" |
    grep -vE '\.test\.tsx?$|__tests__/|\.md$|^apps/native/(docs|jest|scripts)/|^apps/native/jest\.config\.js$' |
    grep -vE "$foreign" || true)
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

echo "$platform build run $build_run on $channel: commit ${build_sha:0:8}, runtime ${runtime:0:8}"
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
    echo "VERDICT: BUILD"
    echo "$ship"
else
    echo "VERDICT: OTA"
    echo "gh workflow run update.yml -f channel=$channel -f platform=$platform -f message=\$'...'"
fi
