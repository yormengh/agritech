output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value     = module.eks.cluster_endpoint
  sensitive = true
}

output "rds_endpoint" {
  value     = module.rds.endpoint
  sensitive = true
}

output "github_actions_role_arn" {
  value = module.iam.github_actions_role_arn
}

output "backend_app_role_arn" {
  value = module.iam.backend_app_role_arn
}
