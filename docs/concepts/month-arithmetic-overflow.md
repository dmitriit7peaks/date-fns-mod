# Month arithmetic clamps, it doesn't overflow — `addMonths(Jan 31, 1) → Feb 28`

> Adding/subtracting months (`addMonths`, `subMonths`, `setMonth`, anything built on them) **constrains** the day to the last day of the target month instead of letting the JS `Date` overflow into the next one. `addMonths(2023-01-31, 1)` is `2023-02-28`, **not** `2023-03-03`.

aliases:
  - addMonths gave March 3 instead of Feb 28
  - adding a month to Jan 31 skips February
  - setMonth overflowed into the next month
  - end of month date jumps two months ahead
  - addMonths not landing on last day of month
  - subMonths off by a few days at month end
  - why isn't addMonths just date.setMonth

## Intent / synonyms

- "add a month to an end-of-month date without skipping a month"
- "why does addMonths land on the 28th not the 3rd"
- "month arithmetic at end of month"
- "addMonths vs native Date setMonth overflow"
- "billing date / subscription anchor on the 31st"

## Canonical implementation

- `pkgs/core/src/addMonths/index.ts` — the clamping algorithm. It does **not** simply call `setMonth`:
  1. Snap to the **end of the desired month** with `endOfDesiredMonth.setMonth(month + amount + 1, 0)` (day `0` = last day of the prior month).
  2. If the original `dayOfMonth >= daysInMonth`, return that end-of-month date.
  3. Otherwise `setFullYear(year, month, dayOfMonth)` — safe now that we know it won't overflow.
- `subMonths`, `addQuarters`, `addYears`, `setMonth`, `add` all route through this same end-of-month logic.

## Why it works this way

- **Native `Date` month math overflows, and that's almost never what a human means.** The source comment spells it out: `new Date(2020, 13, 31)` yields `3 Mar 2021`, because Feb has no 31st so the extra days spill forward. For "the same day next month" that's a bug — "one month after Jan 31" should be the end of Feb, not early March.
- **Clamping matches calendar intuition and real domain rules.** Subscription anchors, "due at end of month", "monthly on the 31st" all expect Feb to resolve to its last day, not to leak into March. date-fns encodes the least-surprising answer.
- **Why the two-step dance instead of one `setMonth`.** Setting the day to `0` of `month+amount+1` is the trick that finds the true last day of the target month (accounting for leap years) so the clamp is exact, and it sidesteps a DST edge case where rebuilding the date could shift the wall-clock time on the last day of a month (hence it reuses the original `date`'s time, not the snapped object's).

## Constraints / anti-patterns

1. **`addMonths` is not reversible at month boundaries.** `addMonths(addMonths(Jan 31, 1), -1)` is `Jan 28`, not `Jan 31` — the clamp loses the original day. Don't assume add/sub round-trips.
2. **Don't substitute `date.setMonth(m + n)`** expecting the same result — native overflow gives you the early-March bug.
3. **`amount === 0` is a deliberate no-op** (returns the input unchanged) specifically to avoid touching the time in the hour before a DST end. Don't "optimise" it away.
4. **`NaN` amount yields an Invalid Date**, not a throw.

## Tests

- `pkgs/core/src/addMonths/test.ts` — the Jan-31→Feb-28 case, leap years, the DST-on-last-day case, and the `amount = 0` no-op.

## Related concepts

- [[difference-calendar-vs-exact]] — the inverse question (how many months *between* two dates) has the same end-of-month subtlety.
- [[dst-local-time]] — why even month math has to be careful about wall-clock time.

## Source docs

- The rationale lives in the in-file comment block of `pkgs/core/src/addMonths/index.ts` (the `new Date(2020, 13, 31)` worked example) — not in any external doc.