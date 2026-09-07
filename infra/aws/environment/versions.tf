terraform {
  required_version = ">= 1.10, < 2.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {}
}
provider "aws" {
  region = var.region
  default_tags { tags = { Project = var.name, ManagedBy = "terraform" } }
}
data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
locals {
  prefix  = "/${var.name}"
  account = data.aws_caller_identity.current.account_id
  arn     = "arn:${data.aws_partition.current.partition}"
  jobs = {
    ingestion = { cron = "cron(17 15,21 * * ? *)", database = "ingestion-database-url" }
    health    = { cron = "cron(47 0,18 * * ? *)", database = "readonly-database-url" }
    backup    = { cron = "cron(17 7 * * ? *)", database = "backup-database-url" }
  }
}
resource "terraform_data" "approval" {
  lifecycle {
    precondition {
      condition     = var.provisioning_approved
      error_message = "Preparation only. Obtain provisioning approval before planning/applying real resources."
    }
    precondition {
      condition     = !var.enable_schedules || var.activation_approved
      error_message = "Scheduled production work requires separate activation approval."
    }
  }
}
