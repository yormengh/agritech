variable "aws_region" {
  type    = string
  default = "us-east-2"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "github_org" {
  type = string
}

variable "github_repo" {
  type = string
}
