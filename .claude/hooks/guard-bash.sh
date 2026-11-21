#!/usr/bin/env bash
command=$(jq -r '.tool_input.command // empty')

block() {
    echo "$1" >&2
    exit 2
}

if grep -qE '(^|[;&|(]\s*)(npx\s+)?pnpm(\s|$)' <<<"$command"; then
    block "Use vp, not pnpm: vp install, vp run <task>, vp exec, vp check."
fi
if grep -qE 'git\s+(commit|push|merge|rebase)[^;&|]*--no-verify' <<<"$command"; then
    block "Hooks stay on: drop --no-verify and fix what the hook reports."
fi
if grep -qE '(cat|less|more|head|tail|bat|sed|awk)\s[^|;&]*\.env(\.[A-Za-z]+)*["'\'']?(\s|$|[;&|)])' <<<"$command"; then
    block "Never print an env file. List its variable names with: grep -oE '^[A-Z_]+=' <file>."
fi
exit 0
