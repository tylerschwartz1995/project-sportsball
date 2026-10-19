# App simplification

## Simplified app scope — October 19, 2026

The active interface is now Teams, Players, and Games. Teams and Players each
provide Basic Stats and Advanced Stats. Home opens Team Stats directly. Team
stats use a sortable results table with season and phase selection; player
stats retain name, type, position, and minimum-games filters. Advanced tables
retain situation and minimum-workload controls, coverage notes, and metric help.
Completed-game detail pages, box scores, scoring, and game analytics remain.
Shot Maps is available inside Shot Quality; the duplicate top-level game tab
has been removed.

Team profiles retain basic stats, advanced stats, roster splits, and games.
Player profiles retain basic stats, advanced stats, and season history. Rolling
profile charts, schedule difficulty, standalone line rankings, chart builders,
comparisons, drafts, historical research, and the playoff workspace are retired
from the active interface. Old destination links redirect into the core app.
The separate standings route redirects to Team Stats. League standings grouping
and progression charts are no longer offered.

Stored data, migrations, ingestion, operational jobs, and statistical definitions
are unchanged. Some retired feature modules and historical regression scripts
remain in the repository; this change reduces the active product and its query
work, but does not claim to complete all unused-code or pipeline cleanup.

