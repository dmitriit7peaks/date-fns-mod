# concepts-mcp — a "why" layer for date-fns, over MCP

A small **concept search** layer: semantic + keyword retrieval over
`docs/concepts/`, exposed as an MCP server. It serves the *rationale* a codebase
doesn't contain — why `addMonths(Jan 31, 1)` is Feb 28, why `format("YYYY-...")`
throws — as two or three targeted chunks an agent fetches on demand.

> date-fns already ships its own MCP (`date-fns` in `.mcp.json`) that serves the
> **API**: which functions exist, what they take. This `concepts` server serves
> the **why**. Different layers.

## What's here

| File          | Role                                                                      |
| ------------- | ------------------------------------------------------------------------ |
| `embed.mjs`   | Local embeddings via `@xenova/transformers` (`bge-small-en-v1.5`, 384d). |
| `chunker.mjs` | Splits markdown by `##` headings.                                        |
| `store.mjs`   | Load/save the index as JSON at `docs/concepts/.index.json`.              |
| `search.mjs`  | Hybrid ranker: min-max-normalised cosine (α=0.6) + BM25 (0.4).           |
| `cli.mjs`     | CLI: `index`, `search`, `get`, `list`.                                   |
| `server.mjs`  | Stdio MCP server exposing `search`, `get`, `list` (wired in `.mcp.json`).|

## Concept docs (6, two domains)

`docs/concepts/` — each written for a searcher with a bug: an `aliases` block
(symptoms in the developer's words), the canonical code path, **why it works
this way**, and the constraints. Template: `docs/concepts/_TEMPLATE.md`.

- **format / parse tokens** — `format-token-footguns.md`, `parse-vs-parseiso.md`, `format-has-no-timezone.md`
- **date arithmetic** — `month-arithmetic-overflow.md`, `dst-local-time.md`, `difference-calendar-vs-exact.md`

## Scope — what you can ask (and where it's hardcoded)

This POC only covers the two domains above. Example questions that land well:

- "why does `addMonths(Jan 31, 1)` return Feb 28 and not Mar 3? is it reversible?"
- "why does `format('YYYY-MM-DD')` print `2018-10-283`?"
- "`addHours(d, 24)` vs `addDays(d, 1)` around daylight saving — why differ?"
- "`parse()` returns Invalid Date and wants a third argument — when do I use `parseISO`?"
- "same code shows a different time on the server than on my laptop"

Anything outside these two domains returns low-cosine results — by design (see
the counter-example in the article).

> ⚠️ **The scope is hardcoded in two places, not inferred from the docs.** An
> agent decides whether to call this server from the **`search` tool description
> in `server.mjs`**, and is nudged to do so by **`CLAUDE.md`** at the repo root —
> both of which name the domains explicitly. If you add concept docs in a *new*
> domain, indexing alone is not enough: update the `search` description in
> `server.mjs` and the domain list in `CLAUDE.md`, or agents won't route
> questions to it. (That mismatch is exactly why the server was skipped at first:
> its description still named the original project's domains.)

## Usage

```sh
cd scripts/concepts-mcp
npm install

# 1. Build the index (first run downloads ~30MB embedding model)
npm run index

# 2. Search in a developer's symptom voice
node cli.mjs search "addMonths jumped to March 3 instead of Feb 28"
node cli.mjs search "format gives 2018-10-283 instead of the date" --json
node cli.mjs get "docs/concepts/format-token-footguns.md"
node cli.mjs list

# 3. Run the MCP server (wired via ../../.mcp.json for Claude Code / any MCP client)
npm run mcp
```

## Notes

- Index is gitignored at `docs/concepts/.index.json`; rebuild with `npm run index`.
- Deps live here, isolated from the date-fns pnpm workspace.