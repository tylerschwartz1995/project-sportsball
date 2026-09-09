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
