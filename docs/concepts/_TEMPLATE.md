# Concept Title — short, intent-shaped

> **One-line summary** — what this concept covers, in the searcher's vocabulary.

aliases:
  - symptom a developer has, written as they'd type it — "X not working after Y"
  - another symptom or wrong-path description — "why does Z return empty"
  - exact error message or field name they'd paste — "failedCinemas 1 but no 404"
  - 5–10 lines total; write from the perspective of someone with a bug, not someone who knows the fix

## Intent / synonyms

- Phrases a developer would _search_ for when they need this — verbs and outcomes, not class names.
- Include the way the team actually talks about it (UI labels, ticket vocabulary, error symptoms).
- 5–12 lines.

## Canonical implementation

- Primary code path(s) — file, function, line if meaningful. **One source of truth per concept.**
  - `packages/<pkg>/services/<file>.ts` — `MyService.doThing()`
  - `packages/<pkg>/functions/<handler>.ts`
- Schema / DTOs / migrations if relevant.
- API endpoints surfaced by this concept (method + path).

## Why it works this way

- 1–3 paragraphs explaining the _rationale_ — not what the code does (the code shows that).
- External constraints (Vista field shape, mobile contract, business rule).
- Trade-offs that were considered and rejected.

## Constraints / anti-patterns

- Hard limits baked into the integration — the things that bite at runtime.
- "Don't \_\_\_" — common mistakes, copy-paste hazards.
- Numbered list, because each item is independently citeable.

## Tests

- Unit / integration tests that pin the behaviour.
- E2E script(s) that exercise the flow end-to-end, with how to run.

## Related concepts

- [[other-concept-slug]] — what's the relationship.
- A `[[slug]]` link that doesn't exist yet is a TODO marker, not an error.

## Source docs

- `docs/<original>.md` — preserved, not duplicated. Concept summarises and points back.
