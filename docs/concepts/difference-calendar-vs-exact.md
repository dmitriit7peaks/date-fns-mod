# `differenceIn*` vs `differenceInCalendar*` — full units vs boundary counts

> `differenceInMonths`/`Days`/`Years` count **completed** units (a partial unit doesn't count, result is truncated toward zero). `differenceInCalendarMonths`/`Days`/`Years` count **boundary crossings** ignoring the time-of-day/day-of-month. They routinely disagree by one.

aliases:
  - differenceInMonths off by one
  - differenceInDays vs differenceInCalendarDays
  - difference returns 0 for almost a full month
  - why are there two difference functions
  - rounding of date differences
  - roundingMethod option on differenceIn
  - age calculation off by one day
  - getting whole months between two dates

## Intent / synonyms

- "number of full months between two dates"
- "difference vs calendar difference — which do I want"
- "why does differenceInMonths return 0 for 29 days"
- "round date difference up instead of truncating"
- "compute age / tenure in whole years"

## Canonical implementation

- `pkgs/core/src/differenceInCalendarMonths/index.ts` — pure boundary count: `(laterYear - earlierYear) * 12 + (laterMonth - earlierMonth)`. The day and time are **irrelevant**.
- `pkgs/core/src/differenceInMonths/index.ts` — starts from the calendar difference, then **subtracts one if the last month isn't actually complete** (it checks whether the day-of-month "fits", with a special case for end-of-February and for last-day-of-month). Truncates toward zero.
- `pkgs/core/src/_lib/getRoundingMethod/index.ts` — the shared rounding helper used by the duration-style differences (`differenceInHours`, etc.): **defaults to `Math.trunc`**, and `options.roundingMethod` selects `Math.round`/`ceil`/`floor`. (Also guards against returning `-0`.)
- Same `calendar` vs non-`calendar` split exists for Days, Weeks, Years, Quarters, ISOWeekYears.

## Why it works this way

- **"How many months have *elapsed*" and "how many month boundaries did we *cross*" are different questions, and both are legitimate.** Jan 31 → Feb 1 crosses one month boundary (`calendar` = 1) but isn't a full month (`differenceInMonths` = 0). Billing/age logic wants completed units; calendar-grid/UI logic wants boundary counts. date-fns refuses to pick one and ships both.
- **Why truncation, not rounding, is the default.** "Full months between" must never round a partial month up to a whole one — that would overcount tenure, age, or accrual. The duration helpers default to `Math.trunc` for the same reason and only round when you explicitly ask via `roundingMethod`.
- **The end-of-February special case** in `differenceInMonths` exists because clamping ([[month-arithmetic-overflow]]) makes naive "did the day fit" checks wrong at month ends; the code nudges the working date off the 28th/29th/30th to get the completed-month count right.

## Constraints / anti-patterns

1. **Don't use `differenceInCalendarMonths` for "full months".** Across e.g. Jan 31 → Feb 1 it returns 1; the completed-month answer is 0.
2. **`differenceIn*` truncates toward zero, it doesn't round.** 59 days is `differenceInMonths` = 1, not 2. Pass `roundingMethod` (on the duration-style functions) if you want rounding.
3. **Argument order is `(laterDate, earlierDate)`.** Reversed args flip the sign — the result is signed.
4. **Calendar functions ignore time-of-day.** `differenceInCalendarDays` between 23:59 and 00:01 the next day is 1; `differenceInDays` is 0.

## Tests

- `pkgs/core/src/differenceInMonths/test.ts` — the off-by-one boundary cases and the end-of-February special case.
- `pkgs/core/src/differenceInCalendarMonths/test.ts` — boundary-count semantics.

## Related concepts

- [[month-arithmetic-overflow]] — the same end-of-month clamping that the difference special-case compensates for.
- [[dst-local-time]] — calendar vs elapsed is the difference-side analogue of `addDays` vs `addHours`.

## Source docs

- No external doc — the contract is the implementations plus their test files.