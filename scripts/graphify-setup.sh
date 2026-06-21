#!/usr/bin/env bash
# graphify-setup.sh — one-shot installer for graphify in this repo.
# Mirrors the Visa-mono/concourse setup so the code-graph workflow is identical
# across the fleet.
#
# Idempotent. Safe to re-run. Does:
#   1. Installs graphifyy (+ mcp extra) into a uv tool env.
#   2. Installs the post-commit/post-checkout git hooks so the AST graph
#      refreshes automatically on every commit (free, no LLM cost).
#   3. Writes your personal .mcp.local.json so Claude Code gets the graphify
#      MCP tools live (query_graph, get_node, get_neighbors, shortest_path).
#   4. Resolves the local Python interpreter graphify needs.
#   5. Builds the graph if missing, then verifies with a smoke query.
#
# Flags: --skip-mcp (no .mcp.local.json), --skip-hooks (read-only viewers).
# The heavy graphify-out/graph.json is gitignored and regenerated locally —
# run `graphify update .` after pulling. Only GRAPH_REPORT.md is committed.

set -euo pipefail

SKIP_MCP=0
SKIP_HOOKS=0
for arg in "$@"; do
  case "$arg" in
    --skip-mcp) SKIP_MCP=1 ;;
    --skip-hooks) SKIP_HOOKS=1 ;;
    -h|--help) sed -n '2,19p' "$0"; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
echo "graphify-setup: repo root = $REPO_ROOT"

if ! command -v uv >/dev/null 2>&1; then
  echo "graphify-setup: uv not found. Install it first:" >&2
  echo "  curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
fi

echo "graphify-setup: installing/upgrading graphifyy…"
uv tool install --upgrade --with mcp graphifyy 2>&1 | tail -3

mkdir -p graphify-out
GRAPHIFY_PY=$(uv tool run --from graphifyy python -c "import sys; print(sys.executable)" 2>/dev/null || command -v python3)
echo "$GRAPHIFY_PY" > graphify-out/.graphify_python
echo "graphify-setup: python interpreter = $GRAPHIFY_PY"

if [ "$SKIP_HOOKS" -eq 0 ]; then
  echo "graphify-setup: installing git hooks…"
  graphify hook install 2>&1 | sed 's/^/  /'
else
  echo "graphify-setup: skipping git hooks (--skip-hooks)"
fi

if [ "$SKIP_MCP" -eq 0 ]; then
  if [ -f .mcp.local.json ]; then
    echo "graphify-setup: .mcp.local.json already exists — leaving as-is"
  else
    cat > .mcp.local.json <<EOF
{
  "mcpServers": {
    "graphify": {
      "command": "$GRAPHIFY_PY",
      "args": ["-m", "graphify.serve", "$REPO_ROOT/graphify-out/graph.json"]
    }
  }
}
EOF
    echo "graphify-setup: wrote .mcp.local.json (gitignored). Restart Claude Code to load it."
  fi
fi

if [ ! -f graphify-out/graph.json ]; then
  echo "graphify-setup: building the graph (first run)…"
  graphify update . 2>&1 | tail -3
fi

if [ -f graphify-out/graph.json ]; then
  echo "graphify-setup: verifying with a smoke query…"
  graphify query "entry point" --budget 200 2>&1 | head -5 | sed 's/^/  /' || true
  echo "graphify-setup: DONE ✓  ·  ask the graph: graphify query \"<question>\""
fi
