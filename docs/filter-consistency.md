# Filter behavior

Current controls apply automatically. Player text search is debounced; there
is no staged Apply Filters workflow. Keep visible labels, keyboard focus, and
consistent field sizing. URL state preserves season, phase, filters, and sort
where applicable; incompatible selections fall back to supported values.

Games uses season/date and week/calendar controls. Standings uses a scope tab
and one conference/division selector. Box Score selects team/player type;
Lines selects team/unit type/minimum TOI. Shot Map has no filters.

Sorting highlights the sorted column. Same-page sorting and filtering should
retain scroll position, including shorter Lines results. Back/forward and
refresh should restore displayed selections. Statistical phase remains explicit
where both regular-season and playoff datasets are supported.

Run the [current regression checklist](desktop-ux-regression.md) and maintained
fixture smoke suite when finalizing changes. Historical draft, birthplace,
comparison, and research filter workflows are no longer part of the app.
