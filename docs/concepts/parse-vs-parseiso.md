# `parse` vs `parseISO` — which string parser to reach for

> `parseISO(string)` reads **ISO 8601 only** and needs no format mask. `parse(string, formatMask, referenceDate)` reads **any** layout but requires you to supply the mask **and** a reference `Date` for the fields the string omits. Reaching for the wrong one is the most common parsing bug.

aliases:
  - parse returns Invalid Date
  - parse needs a third argument reference date
  - which function parses "2014-02-11T11:30:30"
  - parseISO vs parse vs new Date
  - how do I parse a dd/MM/yyyy string
  - parse ignored my time and used today's date
  - why does parse need a baseDate / referenceDate
  - parsing a date string with a custom format

## Intent / synonyms

- "parse an ISO 8601 timestamp into a Date"
- "parse a non-ISO string like `11.02.1987` with a custom format"
- "parse returns Invalid Date / NaN"
- "what is the reference date argument in parse"
- "stop using `new Date(string)` to parse"

## Canonical implementation

- `pkgs/core/src/parseISO/index.ts` — `parseISO(argument, options?)`. No format string. Accepts complete and partial ISO 8601; returns **Invalid Date** (not a throw) when the string isn't ISO or values are invalid. Returns the date **in the local time zone**.
- `pkgs/core/src/parse/index.ts` — `parse(dateStr, formatStr, referenceDate, options?)`. Uses the same Unicode TR35 tokens as `format` (so the same protected-token throw applies — see [[format-token-footguns]]).
- The `referenceDate` (3rd arg) supplies every field the input string doesn't: if your mask is `"yyyy"`, the month/day/time come from `referenceDate`.

## Why it works this way

- **Two functions because there are two genuinely different jobs.** ISO 8601 is a fixed, self-describing grammar — no mask is needed or wanted, so `parseISO` is a tight, fast, allocation-light reader. Arbitrary human formats (`dd.MM.yyyy`, `MMM do, yyyy`) are open-ended, so `parse` is a general token engine that necessarily needs you to declare the shape.
- **Why `parse` demands a reference date.** A mask like `"HH:mm"` describes only a time; the result still has to be a full `Date`. Rather than silently defaulting to the epoch (a classic source of "why is my date in 1970"), `parse` forces you to choose the base explicitly. The common, correct value is `new Date()`.
- **Why `parseISO` returns Invalid Date instead of throwing.** ISO parsing is frequently applied to untrusted/external input; returning an Invalid Date lets callers branch with `isValid()` without wrapping every call in try/catch. `parse`, by contrast, throws on *bad format strings* (a programmer error) but also yields Invalid Date for *unparseable input* (a data error).

## Constraints / anti-patterns

1. **Don't use `new Date(string)` for parsing.** Native parsing of non-ISO strings is implementation-defined across engines; that's the whole reason these functions exist.
2. **`parse` without the reference date is a type error — don't pass `undefined` "to skip it".** It is the source of truth for omitted fields.
3. **`parseISO` won't read your `dd/MM/yyyy` string** — it's ISO-only. Reach for `parse` with a mask there.
4. **The protected-token throw applies to `parse` too.** `parse("11.02.87", "D.MM.YY", new Date())` throws — lowercase to `"d.MM.yy"`. See [[format-token-footguns]].
5. **Both return local-time dates.** Neither attaches a zone; an ISO string with no offset is interpreted in the host zone. See [[format-has-no-timezone]].

## Tests

- `pkgs/core/src/parseISO/test.ts` — partial ISO forms, `additionalDigits`, Invalid Date paths.
- `pkgs/core/src/parse/test.ts` — reference-date field-filling and the protected-token throw.

## Related concepts

- [[format-token-footguns]] — `parse` shares `format`'s token rules and throws.
- [[format-has-no-timezone]] — why the returned dates are local-time.

## Source docs

- `pkgs/core/docs/unicodeTokens.md` — the token table both `format` and `parse` consume.