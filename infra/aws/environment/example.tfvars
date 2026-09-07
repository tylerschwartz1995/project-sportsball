# Copy to an ignored *.auto.tfvars file only after reviewing the deployment runbook.
provisioning_approved = false
activation_approved   = false
enable_schedules      = false
enable_snapshots      = false
region                = "us-east-1"
availability_zone     = "us-east-1a"
admin_cidrs           = ["192.0.2.1/32"]
ssh_public_key        = "REPLACE_WITH_YOUR_PUBLIC_KEY"
alert_email           = "REPLACE_WITH_YOUR_EMAIL"
source_revision       = "0000000000000000000000000000000000000000"
# domain_name is optional until domain ownership/delegation is ready.
