# AWS infrastructure boundary

The earlier Lightsail/CodeBuild/EventBridge server proposal was never applied
and has been removed from the repository. Its runtime containers, release
scripts, SSM tunnel adapter, and Terraform environment are no longer supported.
No live AWS resource was changed by this cleanup.

Retained infrastructure:

- `infra/aws/bootstrap`: encrypted, versioned Terraform state bucket.
- `infra/hosted`: private source archives/backups and restricted GitHub OIDC roles.
- `infra/neon`: hosted database role definitions.
- `scripts/hosted`: current hosted job and access tooling.

Preserve actual bootstrap state and hosted backend configuration outside Git.
Do not recreate or destroy resources merely because old server scaffolding is
removed. Current operations and activation history are documented in
[Hosted preparation](hosted-preparation.md), [Hosted readiness](hosted-readiness.md),
and [Daily ingestion](daily-ingestion.md). No infrastructure apply is part of
repository cleanup.
