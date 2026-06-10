# Working in this repo

This repo ships a **`concepts` MCP server** (see `scripts/concepts-mcp/`) that
serves the *why* behind date-fns behavior — rationale, constraints, and
anti-patterns the source code does not state.

## Use the concepts MCP for "why" / behavior questions

When the user asks **why** date-fns behaves a certain way, or about a surprising
or edge-case behavior — token footguns (`YYYY` vs `yyyy`, `DD` vs `dd`),
month/day arithmetic and end-of-month clamping, DST (`addHours` vs `addDays`),
`parse` vs `parseISO`, time zones — **query the `concepts` MCP first**:

1. Call `concepts` → `search` with the question in the user's own words.
2. Call `concepts` → `get` on the top hit to read the full doc.
3. Answer from the doc's rationale and constraints.

Do this **before** answering from memory or grepping the source — even for
behavior you think you know. The concept docs capture constraints the code
doesn't. If `search` returns only low-cosine results, say so and fall back to
the code.