terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Remote state in S3 with DynamoDB locking
  backend "s3" {
    bucket       = "agroconnect-terraform-state-prod"
    key          = "production/terraform.tfstate"
    region       = "us-east-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags { tags = local.common_tags }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_ca)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

locals {
  cluster_name = "agroconnect-prod"
  common_tags = {
    Project     = "AgroConnect"
    Environment = "production"
    ManagedBy   = "Terraform"
    Owner       = "platform-team"
    CostCenter  = "engineering"
  }
}

# ── VPC ───────────────────────────────────────────────────────────
module "vpc" {
  source       = "../../modules/vpc"
  cluster_name = local.cluster_name
  vpc_cidr     = "10.0.0.0/16"
  tags         = local.common_tags
}

# ── EKS ──────────────────────────────────────────────────────────
module "eks" {
  source              = "../../modules/eks"
  cluster_name        = local.cluster_name
  cluster_version     = "1.29"
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  public_subnet_ids   = module.vpc.public_subnet_ids
  public_access       = false
  public_access_cidrs = []
  tags                = local.common_tags
}

# ── Karpenter ─────────────────────────────────────────────────────
module "karpenter" {
  source            = "../../modules/karpenter"
  cluster_name      = local.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  node_role_arn     = module.eks.node_role_arn
  region            = var.aws_region
  tags              = local.common_tags
}

# ── RDS ──────────────────────────────────────────────────────────
module "rds" {
  source                      = "../../modules/rds"
  cluster_name                = local.cluster_name
  vpc_id                      = module.vpc.vpc_id
  isolated_subnet_ids         = module.vpc.isolated_subnet_ids
  eks_node_security_group_id  = module.eks.cluster_security_group_id
  db_password                 = var.db_password
  instance_class              = "db.t3.medium"
  multi_az                    = true
  deletion_protection         = true
  skip_final_snapshot         = false
  backup_retention_days       = 7
  tags                        = local.common_tags
}

# ── ECR ──────────────────────────────────────────────────────────
module "ecr" {
  source        = "../../modules/ecr"
  cluster_name  = local.cluster_name
  node_role_arn = module.eks.node_role_arn
  tags          = local.common_tags
}

# ── IAM (GitHub Actions OIDC + IRSA) ─────────────────────────────
module "iam" {
  source               = "../../modules/iam"
  cluster_name         = local.cluster_name
  github_org           = var.github_org
  github_repo          = var.github_repo
  eks_oidc_provider_arn = module.eks.oidc_provider_arn
  eks_oidc_provider_url = module.eks.oidc_provider_url
  tags                 = local.common_tags
}

# ── Karpenter Helm Install ────────────────────────────────────────
resource "helm_release" "karpenter" {
  namespace        = "karpenter"
  create_namespace = true
  name             = "karpenter"
  repository       = "oci://public.ecr.aws/karpenter"
  chart            = "karpenter"
  version          = "v0.33.0"
  wait             = true

  set {
    name  = "settings.clusterName"
    value = module.eks.cluster_name
  }
  set {
    name  = "settings.interruptionQueue"
    value = module.karpenter.interruption_queue_name
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = module.karpenter.controller_role_arn
  }
  set {
    name  = "controller.resources.requests.cpu"
    value = "250m"
  }
  set {
    name  = "controller.resources.requests.memory"
    value = "512Mi"
  }

  depends_on = [module.eks]
}

# ── ArgoCD Helm Install ───────────────────────────────────────────
resource "helm_release" "argocd" {
  namespace        = "argocd"
  create_namespace = true
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "5.51.4"
  wait             = false
  depends_on       = [module.eks, helm_release.karpenter]
}

# ── Prometheus Stack Helm Install ─────────────────────────────────
resource "helm_release" "kube_prometheus" {
  namespace        = "monitoring"
  create_namespace = true
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = "55.5.0"
  wait             = true
  timeout          = 600

  values = [file("${path.module}/prometheus-values.yaml")]

  depends_on = [module.eks, helm_release.karpenter]
}
