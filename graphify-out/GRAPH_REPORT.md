# Graph Report - token-factory-indexer  (2026-06-21)

## Corpus Check
- 11 files · ~3,235 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 68 nodes · 69 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `12fb5a75`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 12 edges
2. `scripts` - 6 edges
3. `token-factory-indexer` - 5 edges
4. `EasAbi` - 3 edges
5. `AttestorRegistryAbi` - 2 edges
6. `DecoderAbi` - 2 edges
7. `YieldVaultAbi` - 2 edges
8. `dev` - 1 edges
9. `serve` - 1 edges
10. `codegen` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (7 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (12): dependencies, hono, ponder, viem, description, devDependencies, tsx, @types/node (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.21
Nodes (7): AttestorRegistryAbi, DecoderAbi, YieldVaultAbi, DECODER_ADDRESS, Hex40, REGISTRY_ADDRESS, YIELD_VAULT_ADDRESS

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (10): app, attestation, decoded, deposited, rosterChange, slashed, slashedByProof, verification (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.33
Nodes (6): scripts, codegen, dev, serve, start, typecheck

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (5): CLI integration, Deploy, Endpoints, Run locally, token-factory-indexer

## Knowledge Gaps
- **46 isolated node(s):** `name`, `version`, `description`, `type`, `dev` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EasAbi` connect `Community 6` to `Community 2`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `scripts` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._