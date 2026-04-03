# ── RDS PostgreSQL Module ─────────────────────────────────────────

resource "aws_kms_key" "rds" {
  description             = "RDS encryption key - ${var.cluster_name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = merge(var.tags, { Name = "${var.cluster_name}-rds-kms" })
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.cluster_name}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# ── Subnet Group ─────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name        = "${var.cluster_name}-rds-subnet-group"
  subnet_ids  = var.isolated_subnet_ids
  description = "RDS isolated subnet group for ${var.cluster_name}"
  tags        = merge(var.tags, { Name = "${var.cluster_name}-rds-subnet-group" })
}

# ── Security Group ────────────────────────────────────────────────
resource "aws_security_group" "rds" {
  name        = "${var.cluster_name}-rds-sg"
  description = "RDS security group - allow only EKS nodes"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.eks_node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.cluster_name}-rds-sg" })
}

# ── Parameter Group ───────────────────────────────────────────────
resource "aws_db_parameter_group" "postgres" {
  name        = "${var.cluster_name}-pg15"
  family      = "postgres15"
  description = "AgroConnect PostgreSQL parameters"

  parameter {
    name  = "log_connections"
    value = "1"
  }
  parameter {
    name  = "log_disconnections"
    value = "1"
  }
  parameter {
    name  = "log_duration"
    value = "1"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = var.tags
}

# ── RDS Instance ──────────────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier        = "${var.cluster_name}-postgres"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  multi_az               = var.multi_az
  publicly_accessible    = false
  deletion_protection    = var.deletion_protection
  skip_final_snapshot    = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.cluster_name}-final-snapshot"

  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  performance_insights_enabled          = true
  performance_insights_kms_key_id       = aws_kms_key.rds.arn
  performance_insights_retention_period = 7

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true

  tags = merge(var.tags, { Name = "${var.cluster_name}-postgres" })
}

# ── SSM Parameter Store: DB credentials ──────────────────────────
resource "aws_ssm_parameter" "db_url" {
  name        = "/${var.cluster_name}/database/url"
  type        = "SecureString"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}"
  description = "AgroConnect DB connection string"
  tags        = var.tags
}
