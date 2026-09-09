"""Run with uv; report failures without displaying connection credentials."""
import sys

from sportsball.operations.hosted_jobs import run_job

try:
    status = run_job()
except Exception as error:
    print(f"Hosted job failed ({type(error).__name__}); inspect configuration and ingestion audits", file=sys.stderr)
    status = 1
sys.exit(status)
