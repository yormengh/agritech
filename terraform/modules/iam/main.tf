# ── IAM Module: OIDC trust for GitHub Actions + app IRSA ─────────

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── GitHub Actions OIDC Provider ─────────────────────────────────
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
  tags            = var.tags
}

# ── GitHub Actions Deploy Role ────────────────────────────────────
resource "aws_iam_role" "github_actions" {
  name = "${var.cluster_name}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
        }
      }
    }]
  })
  tags = var.tags
}

resource "aws_iam_policy" "github_actions" {
  name        = "${var.cluster_name}-github-actions-policy"
  description = "GitHub Actions CI/CD permissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "ECRPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:DescribeImages",
          "ecr:DescribeRepositories"
        ]
        Resource = "arn:aws:ecr:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:repository/${var.cluster_name}/*"
      },
      {
        Sid    = "EKSDescribe"
        Effect = "Allow"
        Action = ["eks:DescribeCluster"]
        Resource = "arn:aws:eks:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:cluster/${var.cluster_name}"
      },
      {
        Sid    = "SSMRead"
        Effect = "Allow"
        Action = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.cluster_name}/*"
      }
    ]
  })
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions.arn
}

# ── Backend App IRSA (access SSM, SES, etc.) ─────────────────────
resource "aws_iam_role" "backend_app" {
  name = "${var.cluster_name}-backend-app"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = var.eks_oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${replace(var.eks_oidc_provider_url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(var.eks_oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:agroconnect:backend"
        }
      }
    }]
  })
  tags = var.tags
}

resource "aws_iam_policy" "backend_app" {
  name = "${var.cluster_name}-backend-app-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "SSMSecrets"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.cluster_name}/*"
      },
      {
        Sid      = "CloudWatchMetrics"
        Effect   = "Allow"
        Action   = ["cloudwatch:PutMetricData", "logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      }
    ]
  })
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backend_app" {
  role       = aws_iam_role.backend_app.name
  policy_arn = aws_iam_policy.backend_app.arn
}
