mock_provider "aws" {}
variables {
  account_id            = "989240880464"
  provisioning_approved = true
}
run "storage_only" {
  command = plan
  assert {
    condition     = length(aws_s3_bucket.storage) == 2 && length(aws_iam_role.job) == 2
    error_message = "Only archives/backups and their two job roles belong in this stack."
  }
  assert {
    condition     = alltrue([for block in aws_s3_bucket_public_access_block.storage : block.block_public_acls && block.block_public_policy && block.restrict_public_buckets && block.ignore_public_acls])
    error_message = "All storage must block public access."
  }
}
run "approval_required" {
  command = plan
  variables { provisioning_approved = false }
  expect_failures = [terraform_data.approval]
}

run "immutable_repository_trust" {
  command = apply
  assert {
    condition = alltrue([for role in aws_iam_role.job :
      jsondecode(role.assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] == "repo:tylerschwartz1995@70235053/project-sportsball@1315721592:environment:sportsball-production"
      && jsondecode(role.assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:aud"] == "sts.amazonaws.com"
    ])
    error_message = "Trust must match GitHub's immutable repository identity and protected production environment exactly."
  }
}
run "reject_wildcard_subject" {
  command = plan
  variables { github_oidc_subject_prefix = "repo:tylerschwartz1995/*" }
  expect_failures = [var.github_oidc_subject_prefix]
}

run "single_backup_retention" {
  command = apply
  assert {
    condition = alltrue([for rule in aws_s3_bucket_lifecycle_configuration.backups.rule :
      length(rule.expiration) == 0 && length(rule.noncurrent_version_expiration) == 0
    ])
    error_message = "The only successful backup must not expire when a job is missed."
  }
  assert {
    condition = contains(jsondecode(aws_iam_role_policy.job["backup"].policy).Statement[0].Action, "s3:DeleteObjectVersion") && jsondecode(aws_iam_role_policy.job["backup"].policy).Statement[1].Condition.StringEquals["s3:prefix"] == "daily/"
    error_message = "Backup cleanup must delete versions and restrict inventory to the backup prefix."
  }
  assert {
    condition = !contains(jsondecode(aws_iam_role_policy.job["ingestion"].policy).Statement[0].Action, "s3:DeleteObjectVersion")
    error_message = "Ingestion must not gain deletion permission."
  }
}
