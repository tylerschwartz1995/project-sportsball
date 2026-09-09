terraform {
  required_version = ">= 1.10, < 2.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {}
}
provider "aws" {
  region              = "us-west-2"
  allowed_account_ids = [var.account_id]
  default_tags { tags = { Project = "sportsball", ManagedBy = "terraform" } }
}
variable "account_id" { type = string }
variable "github_repository" {
  type    = string
  default = "tylerschwartz1995/project-sportsball"
}
variable "provisioning_approved" {
  type    = bool
  default = false
}
resource "terraform_data" "approval" {
  lifecycle {
    precondition {
      condition     = var.provisioning_approved
      error_message = "S3 and GitHub permissions require provisioning approval."
    }
  }
}
resource "aws_s3_bucket" "storage" {
  for_each      = toset(["archives", "backups"])
  bucket        = "sportsball-${var.account_id}-us-west-2-${each.key}"
  force_destroy = false
  lifecycle { prevent_destroy = true }
  depends_on = [terraform_data.approval]
}
resource "aws_s3_bucket_public_access_block" "storage" {
  for_each                = aws_s3_bucket.storage
  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_versioning" "storage" {
  for_each = aws_s3_bucket.storage
  bucket   = each.value.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "storage" {
  for_each = aws_s3_bucket.storage
  bucket   = each.value.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_policy" "tls" {
  for_each = aws_s3_bucket.storage
  bucket   = each.value.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Deny", Principal = "*", Action = "s3:*",
    Resource  = [each.value.arn, "${each.value.arn}/*"],
    Condition = { Bool = { "aws:SecureTransport" = "false" } }
  }] })
}
resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket     = aws_s3_bucket.storage["backups"].id
  depends_on = [aws_s3_bucket_versioning.storage]
  rule {
    id     = "daily-backups"
    status = "Enabled"
    filter { prefix = "daily/" }
    expiration { days = 30 }
    noncurrent_version_expiration { noncurrent_days = 30 }
    abort_incomplete_multipart_upload { days_after_initiation = 1 }
  }
}
# If an account already has this provider, import it rather than creating a duplicate.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  depends_on     = [terraform_data.approval]
}
resource "aws_iam_role" "job" {
  for_each             = toset(["ingestion", "backup"])
  name                 = "sportsball-github-${each.key}"
  max_session_duration = 7200
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Allow", Action = "sts:AssumeRoleWithWebIdentity",
    Principal = { Federated = aws_iam_openid_connect_provider.github.arn },
    Condition = { StringEquals = {
      "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:ref:refs/heads/main"
    } }
  }] })
}
resource "aws_iam_role_policy" "job" {
  for_each = aws_iam_role.job
  role     = each.value.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect   = "Allow",
    Action   = each.key == "ingestion" ? ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"] : ["s3:PutObject", "s3:AbortMultipartUpload"],
    Resource = each.key == "ingestion" ? "${aws_s3_bucket.storage["archives"].arn}/raw/*" : "${aws_s3_bucket.storage["backups"].arn}/daily/*"
  }] })
}
output "buckets" { value = { for name, bucket in aws_s3_bucket.storage : name => bucket.id } }
output "github_roles" { value = { for name, role in aws_iam_role.job : name => role.arn } }
