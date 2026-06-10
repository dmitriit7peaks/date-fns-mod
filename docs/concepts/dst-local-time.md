# DST: `addHours` adds *real* hours, `addDays` keeps the *wall clock*

> All date-fns math runs in host-local time. The hour-family (`addHours`/`addMinutes`/`addSeconds`) adds **fixed elapsed milliseconds**, so crossing a DST boundary the wall-clock can jump (skip 02:00, or repeat it). The calendar-family (`addDays`/`addMonths`/...) preserves the **wall-clock field**, so "tomorrow at 09:00" stays 09:00 even on a 23- or 25-hour DST day.

aliases:
  - addHours skipped an hour around DST
  - addDays changed the time by an hour
  - adding 24 hours is not the same as adding a day
  - date shifts by 1 hour twice a year
  - daylight saving messing up date math
  - 02:30 doesn't exist after addHours
  - why does addHours(date, 1) jump to 03:00
  - schedule drifts an hour on DST changeover

## Intent / synonyms

- "difference between addHours(d, 24) and addDays(d, 1)"
- "DST causing an off-by-one-hour bug"
- "keep the local time when adding days across a DST change"
- "why does adding hours skip or repeat a wall-clock hour"
- "recurring 9am event drifting around daylight saving"

## Canonical implementation

- `pkgs/core/src/addHours/index.ts` — one line: `addMilliseconds(date, amount * millisecondsInHour)`. Pure elapsed-time math; it knows nothing about wall clocks. `addMinutes`, `addSeconds` are the same shape.
- `pkgs/core/src/addDays/index.ts` — operates on the **date field** (`setDate`), so it preserves the local hour/minute across a DST transition.
- `pkgs/core/src/addMonths/index.ts` — field-based too, with an explicit comment about not disturbing the time in the hour before a DST end (see [[month-arithmetic-overflow]]).

## Why it works this way

- **A JS `Date` is a UTC instant; only its *rendering* is local.** "Add 1 hour" can only mean "+3,600,000 ms". On a spring-forward day, the instant one hour after 01:30 renders as 03:30 — the 02:xx wall-clock hour doesn't exist locally. The hour-family is honest about elapsed time; it isn't "wrong", it's answering a different question than the calendar-family.
- **"A day later" usually means the same wall-clock time, not 24h elapsed.** A reminder set for 09:00 should fire at 09:00 the next day even if that day is 23 or 25 hours long. So `addDays` works on the calendar field and lets the underlying instant absorb the DST delta. Using `addHours(d, 24)` for "a day" is the classic bug — it lands at 08:00 or 10:00 on changeover days.
- **This split is forced by the no-built-in-timezone model** ([[format-has-no-timezone]]): without a zone abstraction, the only lever is "elapsed ms" vs "wall-clock field", and date-fns exposes both deliberately rather than guessing.

## Constraints / anti-patterns

1. **`addHours(d, 24) !== addDays(d, 1)` on DST-transition days.** Pick by intent: elapsed duration → hours; calendar position → days.
2. **Reproducing DST bugs requires a DST zone.** On a `TZ=UTC` box there's no transition, so the bug hides. Test under e.g. `TZ=America/New_York` or `TZ=Europe/London`.
3. **Don't build "next day 9am" out of `addHours`.** Use `addDays`, then `set`/`setHours` if needed.
4. **A skipped wall-clock time has no exact representation** — landing "in the gap" snaps forward; landing on a repeated hour is ambiguous. If that matters, pin the zone with `@date-fns/tz`.

## Tests

- `pkgs/core/src/addHours/test.ts` and `pkgs/core/src/addDays/test.ts` — many run under a forced `TZ` to exercise spring-forward / fall-back behaviour.

## Related concepts

- [[format-has-no-timezone]] — the local-time model that makes this split necessary.
- [[month-arithmetic-overflow]] — the field-based family and its DST-on-last-day guard.

## Source docs

- No external doc — the behaviour is documented only by the function implementations and their DST test cases.