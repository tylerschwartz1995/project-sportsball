mock_provider "aws" {
  mock_data "aws_caller_identity" { defaults = { account_id = "123456789012" } }
  mock_data "aws_partition" { defaults = { partition = "aws" } }
}
variables {
  admin_cidrs     = ["192.0.2.1/32"]
  ssh_public_key  = "ssh-ed25519 AAAATEST preparation-only"
  alert_email     = "test@example.com"
  source_revision = "0000000000000000000000000000000000000000"
}
run "requires_provisioning_approval" {
  command         = plan
  expect_failures = [terraform_data.approval]
}
run "disabled_until_activation" {
  command = plan
  variables { provisioning_approved = true }
  assert {
    condition     = alltrue([for s in aws_scheduler_schedule.job : s.state == "DISABLED"])
    error_message = "Preparation must leave all schedules disabled."
  }
  assert {
    condition     = aws_ssm_parameter.jobs_enabled.value == "false"
    error_message = "Manual jobs must also remain gated."
  }
  assert {
    condition     = alltrue([for p in aws_lightsail_instance_public_ports.app.port_info : p.from_port != 5432])
    error_message = "PostgreSQL must not be exposed publicly."
  }
  assert {
    condition     = aws_codebuild_project.job["ingestion"].environment[0].compute_type == "BUILD_GENERAL1_MEDIUM"
    error_message = "Worker must fit the measured Python memory demand."
  }
  assert {
    condition     = alltrue([for b in aws_s3_bucket_versioning.storage : b.versioning_configuration[0].status == "Enabled"])
    error_message = "Source references require versioned storage."
  }
}
run "separate_activation_approval" {
  command = plan
  variables {
    provisioning_approved = true
    enable_schedules      = true
  }
  expect_failures = [terraform_data.approval]
}
run "reject_world_open_admin_access" {
  command = plan
  variables {
    provisioning_approved = true
    admin_cidrs           = ["0.0.0.0/0"]
  }
  expect_failures = [var.admin_cidrs]
}
