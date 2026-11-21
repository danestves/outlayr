#!/usr/bin/env bash
path=$(jq -r '.tool_input.file_path // empty')
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
relative=${path#"$root"/}

case "$relative" in
    *.md | *.mdx) ;;
    *) exit 0 ;;
esac
[ -e "$path" ] && exit 0
case "$relative" in
    docs/internals/* | docs/operations/* | apps/site/content/* | .agents/skills/* | */.claude/skills/* | .claude/skills/*) exit 0 ;;
esac
echo "New markdown goes in docs/internals (decisions, traps) or docs/operations (runbooks), listed in docs/README.md. Plans, mocks and proof belong in the PR, not the repo." >&2
exit 2
