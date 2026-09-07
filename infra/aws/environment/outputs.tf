output "server_ip" { value = aws_lightsail_static_ip.app.ip_address }
output "buckets" { value = { for k, v in aws_s3_bucket.storage : k => v.id } }
output "managed_node_role" { value = aws_iam_role.managed_node.name }
output "jobs" { value = { for k, v in aws_codebuild_project.job : k => v.name } }
output "parameter_prefix" { value = local.prefix }
