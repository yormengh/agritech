# ── ECR Repositories ─────────────────────────────────────────────

locals {
  repos = ["frontend", "backend"]
}

resource "aws_kms_key" "ecr" {
  description             = "ECR encryption - ${var.cluster_name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = var.tags
}

resource "aws_ecr_repository" "app" {
  for_each             = toset(local.repos)
  name                 = "${var.cluster_name}/${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }

  tags = merge(var.tags, { Name = "${var.cluster_name}-${each.key}" })
}

# ── Lifecycle Policy: keep last 20 tagged, purge untagged after 1 day
resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep last 20 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha-", "main-", "staging-"]
          countType     = "imageCountMoreThan"
          countNumber   = 20
        }
        action = { type = "expire" }
      }
    ]
  })
}

# ── ECR Repository Policy: allow EKS node role ────────────────────
resource "aws_ecr_repository_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEKSPull"
        Effect = "Allow"
        Principal = {
          AWS = var.node_role_arn
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}
