variable "region" { default = "us-east-1" }
variable "name" {
  default = "sportsball"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,24}$", var.name))
    error_message = "Use a short lowercase resource prefix."
  }
}
variable "provisioning_approved" {
  type    = bool
  default = false
}
variable "activation_approved" {
  type    = bool
  default = false
}
variable "enable_schedules" {
  type    = bool
  default = false
}
variable "enable_snapshots" {
  type    = bool
  default = false
}
variable "availability_zone" { default = "us-east-1a" }
variable "admin_cidrs" {
  type = list(string)
  validation {
    condition     = length(var.admin_cidrs) > 0 && alltrue([for c in var.admin_cidrs : can(cidrnetmask(c)) && c != "0.0.0.0/0"])
    error_message = "Supply restricted administrator IPv4 CIDRs; no world-open SSH."
  }
}
variable "ssh_public_key" { type = string }
variable "alert_email" { type = string }
variable "monthly_budget_usd" {
  type    = number
  default = 30
}
variable "source_revision" {
  type        = string
  description = "Reviewed 40-character Git commit; upload its release ZIP separately after approval."
  validation {
    condition     = can(regex("^[0-9a-f]{40}$", var.source_revision))
    error_message = "Pin the reviewed full Git commit SHA."
  }
}
variable "domain_name" {
  type    = string
  default = ""
}
