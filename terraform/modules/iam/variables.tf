variable "cluster_name" {
  type = string
}

variable "github_org" {
  type = string
}

variable "github_repo" {
  type = string
}

variable "eks_oidc_provider_arn" {
  type = string
}

variable "eks_oidc_provider_url" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
