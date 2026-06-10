# `format`/`parse` token footguns — `YYYY` vs `yyyy`, `DD` vs `dd`

> The four tokens that produce garbage or throw: `YYYY`/`YY` are the **local week-numbering year**, not the calendar year (`yyyy`/`yy`); `DD`/`D` are the **day of the year** (1–366), not the day of the month (`dd`/`d`). date-fns deliberately **throws a `RangeError`** on these four unless you opt in.

aliases:
  - format returns wrong year like 2018-10-283
  - why does format("YYYY-MM-DD") throw RangeError
  - "Use `yyyy` instead of `YYYY`" error
  - day of month comes out as 283 / huge number
  - migrated from Moment and my format string is broken
  - parse("11.02.87", "D.MM.YY") gives the wrong date
  - useAdditionalDayOfYearTokens / useAdditionalWeekYearTokens what are these
  - format string copied from moment.js no longer works

## Intent / synonyms

- "what's the difference between YYYY and yyyy in date-fns"
- "format throws RangeError on a date pattern that worked in Moment"
- "day-of-month token printing day-of-year"
- "how do I format an ISO date `yyyy-MM-dd`"
- "why won't date-fns accept my format mask"

## Canonical implementation

- `pkgs/core/src/format/index.ts` — the gate is at the token loop: it calls `warnOrThrowProtectedError(...)` when
  `(!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(token)) || (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(token))`.
- `pkgs/core/src/_lib/protectedTokens/index.ts` — the actual rule:
  - `isProtectedDayOfYearToken` = `/^D+$/`, `isProtectedWeekYearToken` = `/^Y+$/`.
  - `warnOrThrowProtectedError` **always `console.warn`s**, then **throws `RangeError` only for** `["D", "DD", "YY", "YYYY"]` (`throwTokens`).
- Same gate is reused by `pkgs/core/src/parse/index.ts`.
- Opt-in: `{ useAdditionalDayOfYearTokens: true }` (for `D`/`DD`) and `{ useAdditionalWeekYearTokens: true }` (for `YY`/`YYYY`).

## Why it works this way

- **date-fns follows the Unicode TR35 token table, not Moment.js's custom letters.** Adopting the standard guarantees long-term compatibility, but it collides head-on with the muscle memory of everyone arriving from Moment/Day.js, where `YYYY-MM-DD` is the canonical "ISO date". In TR35, `Y` is the *week-numbering* year and `D` is the *ordinal day of the year* — both valid, both rarely what an app developer wants.
- **The throw is intentional and load-bearing.** Without it, `format(date, "YYYY-MM-DD")` silently emits things like `2018-10-283` (week-year + day-of-year) — a bug that survives code review because it *looks* like a date. The library would rather fail loudly at the call site than ship a plausible-looking wrong string into a database or a receipt.
- **Why only four tokens throw but every `D+`/`Y+` warns.** Longer runs (`DDD`, `YYYYY`) are unambiguous power-user intent, so they only warn. The four that throw are exactly the ones that *look identical* to the common calendar-year / day-of-month masks and therefore cause real incidents.

## Constraints / anti-patterns

1. **`yyyy-MM-dd` is the ISO date mask, not `YYYY-MM-DD`.** Lowercase `y` = calendar year, lowercase `d` = day of month. Uppercase is almost never what you want.
2. **Don't reach for `useAdditionalWeekYearTokens` to "make the error go away".** Enabling it doesn't fix the output — it just unlocks the week-numbering-year behaviour you probably didn't want. If you hit the throw, the fix is almost always to lowercase the token.
3. **The same rule binds `parse`.** A format mask that throws in `format` will throw in `parse`; you can't round-trip with the uppercase tokens.
4. **`M` is months, `m` is minutes.** Not enforced by the protected-token throw (both are valid), so this one fails silently — a separate, related footgun.
5. **A `console.warn` fires even for the non-throwing protected tokens** — noisy in tests; assert on it or suppress deliberately.

## Tests

- `pkgs/core/src/format/test.ts` — search for `useAdditional` and `RangeError`; pins the throw on `D`/`DD`/`YY`/`YYYY` and the opt-in escape hatch.
- `pkgs/core/src/parse/test.ts` — mirrors the protected-token behaviour on the parse side.

## Related concepts

- [[parse-vs-parseiso]] — when you reach for `parse` (with a mask) vs `parseISO` (no mask, no tokens to get wrong).
- [[format-has-no-timezone]] — the *other* thing that surprises people about `format`.

## Source docs

- `pkgs/core/docs/unicodeTokens.md` — the canonical "Popular mistakes" explainer with the `2018-10-283` example and the opt-in options. Points to Unicode TR35 §Date_Field_Symbol_Table.