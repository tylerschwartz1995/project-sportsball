# Product backlog

The active product is documented in [App scope](app-simplification.md). The next
approved planning step is a database dependency review after repository cleanup.

Potential future work, not current commitments:

- Measure hosted navigation latency and optimize specific slow reads.
- Review independent missed-ingestion alerts without unnecessary database wakeups.
- Revisit backup activation and recovery testing as a separate operations decision.
- Consider additional sources, modelling, or another sport only after defining
  a concrete user need, source rights, cost, and coverage expectations.

Draft research, historical explorers, comparisons, and broader chart builders
were retired. Their remaining database/pipeline foundations are candidates for
review, not implicit commitments to bring back the UI.
