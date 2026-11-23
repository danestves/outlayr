set -eu

set -- --deny-range 100.64.0.0/10
for range in $(printf '%s' "${EGRESS_ALLOW_RANGES:-}" | tr ',' ' '); do
    set -- "$@" --allow-range "$range"
done

exec smokescreen "$@"
