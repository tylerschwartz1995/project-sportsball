"""Entrypoint used by CodeBuild; secrets never appear in error diagnostics."""

import sys

from sportsball.operations.aws_jobs import run_job

try:
    code = run_job()
except Exception as error:
    # SDK errors can contain request data. Detailed ingestion failures remain in DB audits.
    print(f"AWS job failed ({type(error).__name__}); inspect the run audit and AWS configuration", file=sys.stderr)
    code = 1
sys.exit(code)
