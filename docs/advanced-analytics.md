# Advanced analytics

MoneyPuck data is read from PostgreSQL through server-only queries. Current
presentation and metric order are documented in [App scope](app-simplification.md).
The former chart builders, comparisons, and standalone research workspaces
have been removed. Metric definitions remain in table help and the linked
`/analytics/guide` reference page.

## Season tables

`/analytics` supplies the Advanced Stats tabs for Teams and Players, with phase,
situation, and applicable workload controls. Teams show GP, xGF/60, xGA/60,
xG%, CF%, FF%, HD xG%, and PDO. Skaters show GP, TOI, P/60, ixG/60, CF%,
xGF/60, xGA/60, xG%, and HD xG%. Goalies show GP, TOI, GSAx/60, xGA/60,
HD GSAx, MD GSAx, LD GSAx, and Rebounds/60.

Player-team splits remain distinct. League player queries select at most 200
qualifying rows by P/60 or GSAx/60; client sorting operates within that sample.
Rates use unrounded seconds. Missing inputs or zero denominators display dashes.
Danger-band GSAx values are totals; rebounds also reflect workload.

Player career tables combine basic history with regular-season advanced data:
5-on-5 P/60, ixG/60, and on-ice xG% for skaters; all-situations GSAx/60 and
xGA/60 for goalies. Team splits are summed before division. No regular-season
advanced values are attached to playoff rows. Career-total metrics require
complete contributing inputs rather than silently reporting partial careers.

## Game data

[Game pages](game-box-scores.md) use selected portions of the game analytics
package. Box-score skaters add ixG, on-ice FF%, and xG%; goalies add xGA and
GSAx. Team Stats uses all situations. Shot Map shows two xG-weighted heatmaps,
Game Flow has its own tab, and Lines shows compact unit results.

An existing NHL game with no MoneyPuck coverage returns empty advanced arrays;
an unknown game returns null. Team game metrics begin in 2008–09 and cover
both phases; player-game and unit records are regular-season only. Shots begin
in 2007–08. Season summaries begin in 2008–09. See
[MoneyPuck ingestion](moneypuck-season-ingestion.md) for provenance and coverage.

Shares are ratios of summed for/against counts. GSAx is MoneyPuck xGA minus
MoneyPuck goals allowed. Provider totals are kept distinct from official NHL
totals where definitions differ. Coverage notices and MoneyPuck attribution
remain available; no unavailable statistic is filled with zero.
