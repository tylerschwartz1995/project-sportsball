mock_provider "aws" {}
variables { state_bucket_name = "sportsball-test-state" }
run "bootstrap_requires_approval" {
  command         = plan
  expect_failures = [aws_s3_bucket.state]
}
run "state_is_private_and_versioned" {
  command = plan
  variables { provisioning_approved = true }
  assert {
    condition     = aws_s3_bucket_versioning.state.versioning_configuration[0].status == "Enabled"
    error_message = "State must be versioned."
  }
  assert {
    condition     = aws_s3_bucket_public_access_block.state.block_public_policy
    error_message = "State cannot have a public policy."
  }
}
