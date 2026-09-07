resource "aws_cloudwatch_log_group" "jobs" {
  for_each          = local.jobs
  name              = "/aws/codebuild/${var.name}-${each.key}"
  retention_in_days = 14
}
resource "aws_iam_role" "job" {
  for_each = local.jobs
  name     = "${var.name}-${each.key}"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Allow", Principal = { Service = "codebuild.amazonaws.com" }, Action = "sts:AssumeRole",
    Condition = { StringEquals = { "aws:SourceAccount" = local.account } }
  }] })
}
resource "aws_iam_role_policy" "job" {
  for_each = local.jobs
  role     = aws_iam_role.job[each.key].id
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.jobs[each.key].arn}:*" },
    { Effect = "Allow", Action = ["s3:GetBucketLocation", "s3:GetBucketAcl"], Resource = aws_s3_bucket.storage["releases"].arn },
    { Effect = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion"], Resource = "${aws_s3_bucket.storage["releases"].arn}/releases/${var.source_revision}.zip" },
    { Effect = "Allow", Action = ["ssm:GetParameter", "ssm:GetParameters"], Resource = [
      "${local.arn}:ssm:${var.region}:${local.account}:parameter${local.prefix}/runtime/jobs-enabled",
      "${local.arn}:ssm:${var.region}:${local.account}:parameter${local.prefix}/runtime/managed-node-id",
      "${local.arn}:ssm:${var.region}:${local.account}:parameter${local.prefix}/secrets/${each.value.database}"
    ] },
    { Effect = "Allow", Action = ["ssm:StartSession"], Resource = aws_ssm_document.database_tunnel.arn },
    { Effect = "Allow", Action = ["ssm:StartSession"], Resource = "${local.arn}:ssm:${var.region}:${local.account}:managed-instance/*",
    Condition = { StringEquals = { "ssm:resourceTag/Project" = var.name } } },
    { Effect = "Allow", Action = ["ssmmessages:OpenDataChannel"], Resource = "${local.arn}:ssm:${var.region}:${local.account}:session/$${aws:userid}-*" },
    { Effect = "Allow", Action = ["ssm:TerminateSession"], Resource = "${local.arn}:ssm:${var.region}:${local.account}:session/*",
    Condition = { StringEquals = { "ssm:resourceTag/aws:ssmmessages:session-id" = "$${aws:userid}" } } }
    ], each.key == "ingestion" ? [
    { Effect = "Allow", Action = ["s3:PutObject", "s3:GetObject", "s3:GetObjectVersion"], Resource = "${aws_s3_bucket.storage["archives"].arn}/raw/*" }
    ] : [], each.key == "backup" ? [
    { Effect = "Allow", Action = ["s3:PutObject", "s3:AbortMultipartUpload"], Resource = "${aws_s3_bucket.storage["backups"].arn}/daily/*" }
  ] : []) })
}
resource "aws_codebuild_project" "job" {
  for_each               = local.jobs
  name                   = "${var.name}-${each.key}"
  service_role           = aws_iam_role.job[each.key].arn
  build_timeout          = 90
  queued_timeout         = 30
  concurrent_build_limit = 1
  artifacts { type = "NO_ARTIFACTS" }
  environment {
    compute_type    = "BUILD_GENERAL1_MEDIUM"
    image           = "aws/codebuild/standard:8.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = false
    dynamic "environment_variable" {
      for_each = {
        JOB_MODE         = each.key
        PARAMETER_PREFIX = local.prefix
        TUNNEL_DOCUMENT  = aws_ssm_document.database_tunnel.name
        ARCHIVE_BUCKET   = aws_s3_bucket.storage["archives"].id
        BACKUP_BUCKET    = aws_s3_bucket.storage["backups"].id
      }
      content {
        name  = environment_variable.key
        value = environment_variable.value
      }
    }
  }
  source {
    type      = "S3"
    location  = "${aws_s3_bucket.storage["releases"].id}/releases/${var.source_revision}.zip"
    buildspec = "infra/runtime/buildspec.yml"
  }
  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.jobs[each.key].name
      status     = "ENABLED"
    }
  }
}
resource "aws_iam_role" "scheduler" {
  name = "${var.name}-scheduler"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Allow", Principal = { Service = "scheduler.amazonaws.com" }, Action = "sts:AssumeRole",
    Condition = { StringEquals = { "aws:SourceAccount" = local.account } }
  }] })
}
resource "aws_sqs_queue" "scheduler_failures" {
  name                      = "${var.name}-scheduler-failures"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}
resource "aws_iam_role_policy" "scheduler" {
  role = aws_iam_role.scheduler.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["codebuild:StartBuild"], Resource = [for job in aws_codebuild_project.job : job.arn] },
    { Effect = "Allow", Action = ["sqs:SendMessage"], Resource = aws_sqs_queue.scheduler_failures.arn }
  ] })
}
resource "aws_scheduler_schedule" "job" {
  for_each                     = local.jobs
  name                         = "${var.name}-${each.key}"
  state                        = var.enable_schedules ? "ENABLED" : "DISABLED"
  schedule_expression          = each.value.cron
  schedule_expression_timezone = "UTC"
  flexible_time_window { mode = "OFF" }
  target {
    arn      = "${local.arn}:scheduler:::aws-sdk:codebuild:startBuild"
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ ProjectName = aws_codebuild_project.job[each.key].name })
    dead_letter_config { arn = aws_sqs_queue.scheduler_failures.arn }
    retry_policy {
      maximum_event_age_in_seconds = 3600
      maximum_retry_attempts       = 2
    }
  }
  depends_on = [terraform_data.approval, aws_iam_role_policy.scheduler]
}
