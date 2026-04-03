# ── Karpenter Controller IRSA ─────────────────────────────────────

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "karpenter_controller" {
  name = "${var.cluster_name}-karpenter-controller"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = var.oidc_provider_arn }
      Condition = {
        StringEquals = {
          "${replace(var.oidc_provider_url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(var.oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:karpenter:karpenter"
        }
      }
    }]
  })
  tags = var.tags
}

resource "aws_iam_policy" "karpenter_controller" {
  name        = "${var.cluster_name}-karpenter-policy"
  description = "Karpenter controller permissions"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowScopedEC2InstanceActions"
        Effect = "Allow"
        Action = ["ec2:RunInstances", "ec2:CreateFleet", "ec2:CreateLaunchTemplate"]
        Resource = [
          "arn:aws:ec2:${var.region}::image/*",
          "arn:aws:ec2:${var.region}::snapshot/*",
          "arn:aws:ec2:${var.region}:*:subnet/*",
          "arn:aws:ec2:${var.region}:*:security-group/*",
          "arn:aws:ec2:${var.region}:*:launch-template/*",
          "arn:aws:ec2:${var.region}:*:instance/*",
          "arn:aws:ec2:${var.region}:*:volume/*",
          "arn:aws:ec2:${var.region}:*:network-interface/*"
        ]
      },
      {
        Sid      = "AllowScopedEC2InstanceActionsWithTags"
        Effect   = "Allow"
        Action   = ["ec2:RunInstances", "ec2:CreateFleet", "ec2:CreateLaunchTemplate"]
        Resource = ["arn:aws:ec2:${var.region}:*:fleet/*", "arn:aws:ec2:${var.region}:*:instance/*"]
        Condition = {
          StringEquals = {
            "aws:RequestTag/kubernetes.io/cluster/${var.cluster_name}" = "owned"
          }
        }
      },
      {
        Sid    = "AllowScopedDeletion"
        Effect = "Allow"
        Action = ["ec2:TerminateInstances", "ec2:DeleteLaunchTemplate"]
        Resource = ["arn:aws:ec2:${var.region}:*:instance/*", "arn:aws:ec2:${var.region}:*:launch-template/*"]
        Condition = {
          StringEquals = {
            "aws:ResourceTag/kubernetes.io/cluster/${var.cluster_name}" = "owned"
          }
        }
      },
      {
        Sid    = "AllowInstanceProfileActions"
        Effect = "Allow"
        Action = ["iam:AddRoleToInstanceProfile", "iam:CreateInstanceProfile", "iam:DeleteInstanceProfile", "iam:GetInstanceProfile", "iam:RemoveRoleFromInstanceProfile", "iam:TagInstanceProfile"]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:instance-profile/*"
      },
      {
        Sid      = "AllowPassingNodeRole"
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = var.node_role_arn
        Condition = { StringEquals = { "iam:PassedToService" = "ec2.amazonaws.com" } }
      },
      {
        Sid    = "AllowEKSActions"
        Effect = "Allow"
        Action = ["eks:DescribeCluster"]
        Resource = "arn:aws:eks:${var.region}:${data.aws_caller_identity.current.account_id}:cluster/${var.cluster_name}"
      },
      {
        Sid    = "AllowEC2ReadActions"
        Effect = "Allow"
        Action = ["ec2:DescribeAvailabilityZones", "ec2:DescribeImages", "ec2:DescribeInstances", "ec2:DescribeInstanceTypeOfferings", "ec2:DescribeInstanceTypes", "ec2:DescribeLaunchTemplates", "ec2:DescribeSecurityGroups", "ec2:DescribeSpotPriceHistory", "ec2:DescribeSubnets"]
        Resource = "*"
      },
      {
        Sid    = "AllowSSMReadActions"
        Effect = "Allow"
        Action = "ssm:GetParameter"
        Resource = "arn:aws:ssm:${var.region}::parameter/aws/service/*"
      },
      {
        Sid    = "AllowSQS"
        Effect = "Allow"
        Action = ["sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:GetQueueUrl", "sqs:ReceiveMessage"]
        Resource = aws_sqs_queue.karpenter_interruption.arn
      }
    ]
  })
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "karpenter" {
  role       = aws_iam_role.karpenter_controller.name
  policy_arn = aws_iam_policy.karpenter_controller.arn
}

# ── Spot interruption SQS queue ───────────────────────────────────
resource "aws_sqs_queue" "karpenter_interruption" {
  name                      = "${var.cluster_name}-karpenter"
  message_retention_seconds = 300
  sqs_managed_sse_enabled   = true
  tags                      = var.tags
}

resource "aws_sqs_queue_policy" "karpenter_interruption" {
  queue_url = aws_sqs_queue.karpenter_interruption.url
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.karpenter_interruption.arn
      Principal = { Service = ["events.amazonaws.com", "sqs.amazonaws.com"] }
    }]
  })
}

# EventBridge rules for spot interruption handling
resource "aws_cloudwatch_event_rule" "spot_interruption" {
  name        = "${var.cluster_name}-spot-interruption"
  description = "Karpenter spot interruption"
  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["EC2 Spot Instance Interruption Warning", "EC2 Instance Rebalance Recommendation", "EC2 Instance State-change Notification"]
  })
}

resource "aws_cloudwatch_event_target" "spot_interruption" {
  rule      = aws_cloudwatch_event_rule.spot_interruption.name
  target_id = "KarpenterInterruptionQueue"
  arn       = aws_sqs_queue.karpenter_interruption.arn
}
