# date-fns has no built-in time zones — everything is host-local

> Core date-fns operates on the JS `Date`, which carries **no zone** — it's a UTC instant rendered through the **host machine's** local zone. `format`, `parseISO`, `addHours`, etc. all read/print in that local zone. To pin a specific zone you need `@date-fns/tz` (the `tz()`/`TZDate` context) or the older `date-fns-tz`.

aliases:
  - dates are off by a few hours on the server
  - format shows different time on prod vs my laptop
  - how do I format a date in a specific timezone
  - date-fns timezone support
  - TZDate / tz() / @date-fns/tz what is it
  - times shift when deployed to UTC server
  - parseISO ignored the +07:00 offset
  - convert a date to Asia/Bangkok before formatting

## Intent / synonyms

- "format a date in a fixed time zone, not the server's"
- "why does the same code print different times locally vs on the server"
- "does date-fns support IANA time zones"
- "what is `@date-fns/tz` / `TZDate` / the `in` option"
- "make date math run in a specific zone"

## Canonical implementation

- Core functions take an optional **context** via `options.in` (`ContextOptions` in `pkgs/core/src/types.ts`) — that's the seam time-zone support plugs into.
- Time zones live in **separate packages**, not core:
  - `pkgs/tz/` (`@date-fns/tz`) — `TZDate` and `tz(timeZoneName)` produce a context you pass as `options.in` (or use as the date type) so arithmetic and formatting resolve in that zone.
  - `pkgs/utc/` (`@date-fns/utc`) — `UTCDate`, the same idea pinned to UTC.
  - the legacy `date-fns-tz` add-on provides `formatInTimeZone`, `toZonedTime`, etc.
- `pkgs/core/src/format/index.ts` and `pkgs/core/src/parseISO/index.ts` both resolve through whatever context is supplied, defaulting to the host zone.

## Why it works this way

- **The core stays zero-dependency and tree-shakeable.** Bundling the IANA tz database (hundreds of KB) into every project that just wants `addDays` is a non-starter for a library whose headline feature is small bundles. Zones are opt-in, paid for only by code that needs them.
- **A JS `Date` genuinely has no zone.** It's a count of milliseconds since the epoch; the *only* zone in play is the one the runtime uses to render it. date-fns doesn't hide this — it inherits it. That's why the same build prints local time on a developer's laptop (e.g. `GMT+7`) and UTC on a vanilla cloud box: the instant is identical, the rendering zone differs.
- **The `in`/context design instead of a global setting.** A process-wide "current zone" is a race condition waiting to happen in a server handling requests for many zones. Passing the zone as context per call keeps functions pure and makes the zone explicit at the place it matters.

## Constraints / anti-patterns

1. **Don't expect core `format`/`parseISO` to honour an IANA zone — they don't exist in core.** Install `@date-fns/tz` and pass `tz("Asia/Bangkok")` as the context, or use `TZDate`.
2. **`parseISO` of an offset-less string is host-local**, so it can shift across machines. Include the offset in the string, or parse with an explicit context.
3. **Don't `setHours`/`addHours` to "fix" a zone difference.** That mutates the instant, not the rendering. Convert the context instead. (Adding hours across a DST boundary is its own trap — see [[dst-local-time]].)
4. **Server vs laptop drift is a *configuration* symptom, not a date-fns bug.** Reproduce by setting `TZ=UTC` locally.

## Tests

- `pkgs/tz/test/` — `TZDate`/`tz()` context behaviour across zones and DST.
- `pkgs/core/src/format/test.ts` / `pkgs/core/src/parseISO/test.ts` — default host-local behaviour.

## Related concepts

- [[dst-local-time]] — the local-time model is also why DST bites hour-based math.
- [[parse-vs-parseiso]] — both parsers return local-time dates absent a context.

## Source docs

- `pkgs/tz/README.md` and `pkgs/utc/README.md` — the context-based zone model.