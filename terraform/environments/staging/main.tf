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

  backend "s3" {
    bucket       = "agroconnect-terraform-state-staging"
    key          = "staging/terraform.tfstate"
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
  cluster_name = "agroconnect-staging"
  common_tags = {
    Project     = "AgroConnect"
    Environment = "staging"
    ManagedBy   = "Terraform"
    Owner       = "platform-team"
  }
}

module "vpc" {
  source       = "../../modules/vpc"
  cluster_name = local.cluster_name
  vpc_cidr     = "10.1.0.0/16"
  tags         = local.common_tags
}

module "eks" {
  source              = "../../modules/eks"
  cluster_name        = local.cluster_name
  cluster_version     = "1.29"
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  public_subnet_ids   = module.vpc.public_subnet_ids
  public_access       = true
  public_access_cidrs = var.developer_cidrs
  tags                = local.common_tags
}

module "karpenter" {
  source            = "../../modules/karpenter"
  cluster_name      = local.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  node_role_arn     = module.eks.node_role_arn
  region            = var.aws_region
  tags              = local.common_tags
}

module "rds" {
  source                     = "../../modules/rds"
  cluster_name               = local.cluster_name
  vpc_id                     = module.vpc.vpc_id
  isolated_subnet_ids        = module.vpc.isolated_subnet_ids
  eks_node_security_group_id = module.eks.cluster_security_group_id
  db_password                = var.db_password
  instance_class             = "db.t3.small"
  multi_az                   = false
  deletion_protection        = false
  skip_final_snapshot        = true
  backup_retention_days      = 3
  tags                       = local.common_tags
}

module "ecr" {
  source        = "../../modules/ecr"
  cluster_name  = "agroconnect-prod"
  node_role_arn = module.eks.node_role_arn
  tags          = local.common_tags
}

module "iam" {
  source                = "../../modules/iam"
  cluster_name          = local.cluster_name
  github_org            = var.github_org
  github_repo           = var.github_repo
  eks_oidc_provider_arn = module.eks.oidc_provider_arn
  eks_oidc_provider_url = module.eks.oidc_provider_url
  tags                  = local.common_tags
}

resource "helm_release" "karpenter" {
  namespace        = "karpenter"
  create_namespace = true
  name             = "karpenter"
  repository       = "oci://public.ecr.aws/karpenter"
  chart            = "karpenter"
  version          = "v0.33.0"

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

  depends_on = [module.eks]
}

resource "helm_release" "argocd" {
  namespace        = "argocd"
  create_namespace = true
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "5.51.4"
  depends_on       = [module.eks]
}
