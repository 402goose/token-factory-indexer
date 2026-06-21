#!/usr/bin/env bash
# graphify-setup.sh — one-shot installer for graphify in this repo.
# Mirrors the Visa-mono/concourse setup so the code-graph workflow is identical
# across the fleet.
#
# Idempotent + offline-friendly: graphifyy is installed only when missing.
# The heavy graphify-out/* is gitignored and regenerated locally via
# `graphify update .`. Flags: --skip-mcp, --skip-hooks, --upgrade.
# NOTE: on large repos prefer --skip-hooks (the post-commit hook rebuilds the
# graph on every commit, which is slow above a few thousand nodes).

set -euo pipefail

usage() {
  cat <<'USAGE'
graphify-setup.sh — install graphify in this repo.
  --skip-mcp     do not write .mcp.local.json
  --skip-hooks   do not install the git hooks (recommended on large repos)
  --upgrade      force `uv tool upgrade` even if graphify is already installed
  -h, --help     show this help
USAGE
}

SKIP_MCP=0; SKIP_HOOKS=0; FORCE_UPGRADE=0
for arg in "$@"; do
  case "$arg" in
    --skip-mcp) SKIP_MCP=1 ;;
    --skip-hooks) SKIP_HOOKS=1 ;;
    --upgrade) FORCE_UPGRADE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; usage >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
echo "graphify-setup: repo root = $REPO_ROOT"

command -v uv >/dev/null 2>&1 || {
  echo "graphify-setup: uv not found. Install it first:" >&2
  echo "  curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
}

# uv installs tool executables into its bin dir — make sure it's on PATH BEFORE
# we call the bare `graphify` binary anywhere below.
UV_BIN="$(uv tool dir --bin 2>/dev/null || true)"
export PATH="${UV_BIN:-$HOME/.local/bin}:$PATH"

# Install only when missing (idempotent + works offline on re-runs); --upgrade opts in.
if [ "$FORCE_UPGRADE" -eq 1 ]; then
  echo "graphify-setup: upgrading graphifyy…"; uv tool install --upgrade --with mcp graphifyy 2>&1 | tail -3
elif ! command -v graphify >/dev/null 2>&1; then
  echo "graphify-setup: installing graphifyy…"; uv tool install --with mcp graphifyy 2>&1 | tail -3
else
  echo "graphify-setup: graphify already installed (pass --upgrade to refresh)."
fi

# Fail fast if the binary still isn't callable — better than a half-configured repo.
command -v graphify >/dev/null 2>&1 || {
  echo "graphify-setup: 'graphify' is not on PATH after install." >&2
  echo "  Add uv's tool bin to PATH: export PATH=\"${UV_BIN:-$HOME/.local/bin}:\$PATH\"" >&2
  exit 1
}

# Resolve the interpreter that actually has graphifyy. No system-python3 fallback:
# a python3 without the package would write a dead launcher into .mcp.local.json.
mkdir -p graphify-out
GRAPHIFY_PY="$(uv tool run --from graphifyy python -c 'import sys; print(sys.executable)' 2>/dev/null || true)"
[ -n "$GRAPHIFY_PY" ] || { echo "graphify-setup: could not resolve the graphify python interpreter." >&2; exit 1; }
echo "$GRAPHIFY_PY" > graphify-out/.graphify_python
echo "graphify-setup: python interpreter = $GRAPHIFY_PY"

if [ "$SKIP_HOOKS" -eq 0 ]; then
  echo "graphify-setup: installing git hooks…"; graphify hook install 2>&1 | sed 's/^/  /'
else
  echo "graphify-setup: skipping git hooks (--skip-hooks)"
fi

if [ "$SKIP_MCP" -eq 0 ]; then
  # Rewrite if missing OR if the recorded interpreter has drifted from the live one.
  need_write=1
  if [ -f .mcp.local.json ] && grep -qF "\"$GRAPHIFY_PY\"" .mcp.local.json 2>/dev/null; then need_write=0; fi
  if [ "$need_write" -eq 1 ]; then
    # JSON-escape the two interpolated paths (backslashes + double-quotes).
    esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
    printf '{\n  "mcpServers": {\n    "graphify": {\n      "command": "%s",\n      "args": ["-m", "graphify.serve", "%s/graphify-out/graph.json"]\n    }\n  }\n}\n' \
      "$(esc "$GRAPHIFY_PY")" "$(esc "$REPO_ROOT")" > .mcp.local.json
    echo "graphify-setup: wrote .mcp.local.json (gitignored). Restart Claude Code to load it."
  else
    echo "graphify-setup: .mcp.local.json already current — leaving as-is"
  fi
fi

[ -f graphify-out/graph.json ] || { echo "graphify-setup: building the graph…"; graphify update . 2>&1 | tail -3; }

# Honest smoke test: only report success if the query actually succeeds.
if graphify query "entry point" --budget 200 >/tmp/graphify-smoke.$$ 2>&1; then
  head -5 /tmp/graphify-smoke.$$ | sed 's/^/  /'
  echo "graphify-setup: DONE ✓  ·  ask the graph: graphify query \"<question>\""
else
  echo "graphify-setup: smoke query FAILED — graph may be empty or unbuilt:" >&2
  head -5 /tmp/graphify-smoke.$$ | sed 's/^/  /' >&2
  rm -f /tmp/graphify-smoke.$$; exit 1
fi
rm -f /tmp/graphify-smoke.$$
