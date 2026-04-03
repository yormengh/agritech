output "endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "port" {
  value = aws_db_instance.postgres.port
}

output "db_name" {
  value = aws_db_instance.postgres.db_name
}

output "ssm_db_url_param" {
  value = aws_ssm_parameter.db_url.name
}

output "security_group_id" {
  value = aws_security_group.rds.id
}
