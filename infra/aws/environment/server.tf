resource "aws_lightsail_key_pair" "admin" {
  name       = "${var.name}-admin"
  public_key = var.ssh_public_key
  depends_on = [terraform_data.approval]
}
resource "aws_lightsail_instance" "app" {
  name              = var.name
  availability_zone = var.availability_zone
  blueprint_id      = "ubuntu_24_04"
  bundle_id         = "small_3_0"
  ip_address_type   = "ipv4"
  key_pair_name     = aws_lightsail_key_pair.admin.name
  user_data         = file("${path.module}/../../runtime/cloud-init.sh")
  add_on {
    type          = "AutoSnapshot"
    status        = var.enable_snapshots ? "Enabled" : "Disabled"
    snapshot_time = "08:00"
  }
  lifecycle { prevent_destroy = true }
}
resource "aws_lightsail_static_ip" "app" { name = "${var.name}-web" }
resource "aws_lightsail_static_ip_attachment" "app" {
  static_ip_name = aws_lightsail_static_ip.app.name
  instance_name  = aws_lightsail_instance.app.name
}
resource "aws_lightsail_instance_public_ports" "app" {
  instance_name = aws_lightsail_instance.app.name
  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = var.admin_cidrs
  }
  dynamic "port_info" {
    for_each = [80, 443]
    content {
      protocol  = "tcp"
      from_port = port_info.value
      to_port   = port_info.value
      cidrs     = ["0.0.0.0/0"]
    }
  }
}
resource "aws_lightsail_domain" "app" {
  count       = var.domain_name == "" ? 0 : 1
  domain_name = var.domain_name
}
resource "aws_lightsail_domain_entry" "app" {
  count       = var.domain_name == "" ? 0 : 1
  domain_name = aws_lightsail_domain.app[0].domain_name
  name        = "@"
  type        = "A"
  target      = aws_lightsail_static_ip.app.ip_address
}
# Enroll the host manually after provisioning; no activation codes in Terraform state.
resource "aws_iam_role" "managed_node" {
  name = "${var.name}-managed-node"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect = "Allow", Principal = { Service = "ssm.amazonaws.com" }, Action = "sts:AssumeRole"
  }] })
}
resource "aws_iam_role_policy_attachment" "managed_node" {
  role       = aws_iam_role.managed_node.name
  policy_arn = "${local.arn}:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_ssm_document" "database_tunnel" {
  name          = "${var.name}-database-tunnel"
  document_type = "Session"
  content = jsonencode({ schemaVersion = "1.0", sessionType = "Port",
    description = "Local PostgreSQL only; no shell or arbitrary remote host",
    parameters  = { localPortNumber = { type = "String", default = "55432", allowedPattern = "^55432$" } },
    properties  = { portNumber = "5432", localPortNumber = "{{ localPortNumber }}" }
  })
}
resource "aws_ssm_parameter" "jobs_enabled" {
  name  = "${local.prefix}/runtime/jobs-enabled"
  type  = "String"
  value = var.activation_approved ? "true" : "false"
}
